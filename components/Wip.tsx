"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  GripVertical, Plus, X, Download, ArrowUpRight, CornerDownLeft,
  ChevronLeft, ChevronRight, Calendar,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SEED, uid, li } from "@/lib/seed";
import type { WipDoc, Status, MeetingStatus } from "@/lib/types";
import {
  migrateDoc, ensureWeek, currentWeekStart, prevWeek, nextWeek,
  weekStartForDate, weekCommencingLabel,
} from "@/lib/week";

const STATUS: Status[] = ["todo", "active", "review", "done", "blocked"];
const LABEL: Record<Status, string> = { todo: "Not started", active: "In progress", review: "For review", done: "Done", blocked: "Blocked" };

/* ---------- inline-editable text (uncontrolled, caret-stable) ---------- */
function Editable({ value, onCommit, ph, className = "ed", onEnterAdd, onEmptyBack, autoFocus }: any) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && ref.current.textContent !== value) ref.current.textContent = value || ""; }, []);
  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      const r = document.createRange(); r.selectNodeContents(ref.current); r.collapse(false);
      const s = window.getSelection(); s?.removeAllRanges(); s?.addRange(r);
    }
  }, [autoFocus]);
  return (
    <div ref={ref} className={className} contentEditable suppressContentEditableWarning role="textbox" data-ph={ph}
      onBlur={(e) => onCommit(e.currentTarget.textContent)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey && onEnterAdd) { e.preventDefault(); onCommit(e.currentTarget.textContent); onEnterAdd(); }
        if (e.key === "Backspace" && onEmptyBack && e.currentTarget.textContent === "") { e.preventDefault(); onEmptyBack(); }
      }} />
  );
}

function Chip({ status, onCycle }: { status: Status; onCycle: () => void }) {
  return (
    <button className="chip" data-s={status} onClick={onCycle} title="Click to change status">
      <span className="sd" />{LABEL[status]}
    </button>
  );
}

/* ---- auto-growing textarea for multi-line fields (uncontrolled, like Editable) ---- */
function AutoText({ value, onCommit, ph, className = "" }: any) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = () => { const el = ref.current; if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } };
  useEffect(() => { fit(); }, []);
  return (
    <textarea ref={ref} className={`atext ${className}`} defaultValue={value} placeholder={ph} rows={1}
      onInput={fit} onBlur={(e) => onCommit(e.currentTarget.value)} />
  );
}

/* ---- meeting status: its own small cycle, distinct from the Status type ---- */
const MSTATUS: MeetingStatus[] = ["not-started", "scheduled", "completed", "follow-up"];
const MLABEL: Record<MeetingStatus, string> = {
  "not-started": "Not started", scheduled: "Scheduled", completed: "Completed", "follow-up": "Follow-up",
};
function MeetingChip({ status, onCycle }: { status: MeetingStatus; onCycle: () => void }) {
  return (
    <button className="chip" data-m={status} onClick={onCycle} title="Click to change status">
      <span className="sd" />{MLABEL[status]}
    </button>
  );
}

function EditList({ items, setItems, ph, mid, checkable }: any) {
  const [focusId, setFocusId] = useState<string | null>(null);
  const add = (afterIdx: number) => { const ni = li(""); const next = [...items]; next.splice(afterIdx + 1, 0, ni); setItems(next); setFocusId(ni.id); };
  const toggle = (id: string) => setItems(items.map((x: any) => x.id === id ? { ...x, checked: !x.checked } : x));
  return (
    <div>
      {items.map((it: any, i: number) => (
        <div className={`item${checkable ? " check" : ""}${checkable && it.checked ? " done" : ""}`} key={it.id}>
          {checkable ? (
            <input type="checkbox" className="cb" checked={!!it.checked}
              onChange={() => toggle(it.id)} aria-label="Toggle done" />
          ) : (
            <span className="dot" />
          )}
          <Editable className={mid ? "ed mid" : "ed"} value={it.text} ph={ph} autoFocus={focusId === it.id}
            onCommit={(v: string) => setItems(items.map((x: any) => x.id === it.id ? { ...x, text: v } : x))}
            onEnterAdd={() => add(i)}
            onEmptyBack={() => { if (items.length > 1) setItems(items.filter((x: any) => x.id !== it.id)); }} />
          <X size={13} className="rm" onClick={() => setItems(items.filter((x: any) => x.id !== it.id))} />
        </div>
      ))}
      <button className="additem" onClick={() => add(items.length - 1)}><Plus size={12} /> Add</button>
    </div>
  );
}

const Block = ({ title, count, children }: any) => (
  <div className="block">
    <div className="h"><span className="t">{title}</span>{count != null && <span className="c">{count}</span>}</div>
    {children}
  </div>
);

/* ============================ main ============================ */
export default function Wip({ id }: { id: string }) {
  const [doc, setDoc] = useState<WipDoc | null>(null);
  const [tab, setTab] = useState<"week" | "kpi" | "quarter" | "north">("week");
  const [selectedWeekStart, setSelectedWeekStart] = useState<string>("");
  const [saved, setSaved] = useState<"idle" | "saving" | "ok">("idle");

  const applyingRemote = useRef(false); // skip the autosave that a remote update would trigger
  const myRev = useRef("");             // ignore our own realtime echoes
  const docRef = useRef<WipDoc | null>(null);
  docRef.current = doc;

  /* ---- load (or create) the doc, then subscribe to realtime ---- */
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase.from("wip_docs").select("data").eq("id", id).maybeSingle();
      if (!active) return;
      if (data?.data) {
        applyingRemote.current = true;
        setDoc(migrateDoc(data.data as WipDoc));
      } else {
        // no row yet -> create one seeded with your content, migrated to real weeks
        const seeded = migrateDoc(SEED);
        await supabase.from("wip_docs").insert({ id, data: seeded });
        applyingRemote.current = true;
        setDoc(seeded);
      }
      setSelectedWeekStart(currentWeekStart());
    })();

    const channel = supabase
      .channel("wip:" + id)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "wip_docs", filter: `id=eq.${id}` },
        (payload: any) => {
          const next = payload.new?.data as WipDoc | undefined;
          if (!next) return;
          if (next.rev && next.rev === myRev.current) return; // our own echo
          applyingRemote.current = true;
          setDoc(migrateDoc(next));
        })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [id]);

  /* ---- autosave (debounced) on any local change ---- */
  useEffect(() => {
    if (!doc) return;
    if (applyingRemote.current) { applyingRemote.current = false; return; }
    setSaved("saving");
    const t = setTimeout(async () => {
      const rev = uid(); myRev.current = rev;
      const payload = { ...docRef.current, rev };
      const { error } = await supabase.from("wip_docs")
        .update({ data: payload, updated_at: new Date().toISOString() }).eq("id", id);
      setSaved(error ? "idle" : "ok");
    }, 600);
    return () => clearTimeout(t);
  }, [doc, id]);

  /* ---- keyboard: 1 / 2 / 3 switch tabs when not editing ---- */
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (ae.isContentEditable || ae.tagName === "INPUT")) return;
      if (e.key === "1") setTab("week");
      if (e.key === "2") setTab("kpi");
      if (e.key === "3") setTab("quarter");
      if (e.key === "4") setTab("north");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  /* ---- auto-initialise a week the first time it's visited ---- */
  useEffect(() => {
    if (!doc || !selectedWeekStart) return;
    if (doc.weeks.some((w) => w.weekStart === selectedWeekStart)) return;
    setDoc((d) => {
      if (!d) return d;
      if (d.weeks.some((w) => w.weekStart === selectedWeekStart)) return d; // no overwrite
      return { ...d, weeks: ensureWeek(d, selectedWeekStart) };
    });
  }, [doc, selectedWeekStart]);

  /* ---- mutation helpers ---- */
  const setNS = (patch: any) => setDoc((d) => d && ({ ...d, northStar: { ...d.northStar, ...patch } }));
  const setBets = (bets: any) => setDoc((d) => d && ({ ...d, bets }));

  /* KPIs */
  const setKpi = (patch: any) => setDoc((d) => d && ({ ...d, kpi: { ...d.kpi!, ...patch } }));
  const setKpiTheme = (tid: string, patch: any) =>
    setDoc((d) => d && ({ ...d, kpi: { ...d.kpi!, themes: d.kpi!.themes.map((t) => t.id === tid ? { ...t, ...patch } : t) } }));
  const addKpiTheme = () =>
    setDoc((d) => d && ({ ...d, kpi: { ...d.kpi!, themes: [...d.kpi!.themes, { id: uid(), theme: "", target: "", stretch: "", progress: "" }] } }));
  const removeKpiTheme = (tid: string) =>
    setDoc((d) => d && ({ ...d, kpi: { ...d.kpi!, themes: d.kpi!.themes.filter((t) => t.id !== tid) } }));

  /* Quarterly Focus */
  const setQuarter = (qid: string, patch: any) =>
    setDoc((d) => d && ({ ...d, quarters: (d.quarters ?? []).map((q) => q.id === qid ? { ...q, ...patch } : q) }));
  const addQuarter = () =>
    setDoc((d) => d && ({ ...d, quarters: [...(d.quarters ?? []), { id: uid(), quarter: "", area: "", objective: "", meetings: [], notes: "", progress: "" }] }));
  const removeQuarter = (qid: string) =>
    setDoc((d) => d && ({ ...d, quarters: (d.quarters ?? []).filter((q) => q.id !== qid) }));
  const setMeetings = (qid: string, meetings: any) => setQuarter(qid, { meetings });
  const setWeek = (patch: any) => setDoc((d) => {
    if (!d) return d;
    const i = d.weeks.findIndex((w) => w.weekStart === selectedWeekStart);
    if (i < 0) return d;
    const weeks = [...d.weeks]; weeks[i] = { ...weeks[i], ...patch }; return { ...d, weeks };
  });

  /* drag-reorder for priorities */
  const dragIx = useRef<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [pFocus, setPFocus] = useState<string | null>(null);
  const [kpiOpen, setKpiOpen] = useState<string | null>(null); // which KPI theme's progress panel is open

  const exportJSON = useCallback(() => {
    if (!doc) return;
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = "wip.json"; a.click(); URL.revokeObjectURL(url);
  }, [doc]);

  if (!doc) return <div className="wip"><div className="shell"><div className="center">Loading…</div></div></div>;

  const cur = currentWeekStart();
  const wk = doc.weeks.find((w) => w.weekStart === selectedWeekStart);
  if (!wk) return <div className="wip"><div className="shell"><div className="center">Loading week…</div></div></div>;
  const idx = doc.weeks.findIndex((w) => w.weekStart === selectedWeekStart);
  const isCurrent = wk.weekStart === cur;
  const isPast = (wk.weekStart || "") < cur;

  const reorder = (from: number, to: number) => {
    const n = [...wk.priorities]; const [m] = n.splice(from, 1); n.splice(to, 0, m); setWeek({ priorities: n });
  };
  const addPrio = () => { const ni = { id: uid(), text: "", hrs: "", status: "todo" as Status }; setWeek({ priorities: [...wk.priorities, ni] }); setPFocus(ni.id); };
  const cycle = (pid: string) => setWeek({ priorities: wk.priorities.map((p) => p.id === pid ? { ...p, status: STATUS[(STATUS.indexOf(p.status) + 1) % STATUS.length] } : p) });

  const setBetStatus = (bid: string) => setBets(doc.bets.map((b) => b.id === bid ? { ...b, status: STATUS[(STATUS.indexOf(b.status) + 1) % STATUS.length] } : b));
  const setProgress = (bid: string, e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = Math.max(0, Math.min(100, Math.round(((e.clientX - r.left) / r.width) * 20) * 5));
    setBets(doc.bets.map((b) => b.id === bid ? { ...b, progress: pct } : b));
  };
  const addBet = () => setBets([...doc.bets, { id: uid(), name: "", desc: "", status: "todo" as Status, progress: 0, evidence: "", notes: "" }]);

  /* Quarterly Focus: meeting-row helpers (operate on a given quarter) */
  const addMeeting = (q: any) => setMeetings(q.id, [...q.meetings, { id: uid(), date: "", people: "", unit: "", purpose: "", notes: "", status: "not-started" as MeetingStatus }]);
  const updateMeeting = (q: any, mid: string, patch: any) => setMeetings(q.id, q.meetings.map((m: any) => m.id === mid ? { ...m, ...patch } : m));
  const cycleMeeting = (q: any, mid: string) => setMeetings(q.id, q.meetings.map((m: any) => m.id === mid ? { ...m, status: MSTATUS[(MSTATUS.indexOf(m.status) + 1) % MSTATUS.length] } : m));

  const TABS = [
    { id: "week", label: "This Week", key: "1", count: `${idx + 1}/${doc.weeks.length}` },
    { id: "kpi", label: "KPIs", key: "2", count: doc.kpi ? doc.kpi.themes.length : 0 },
    { id: "quarter", label: "Quarterly Focus", key: "3", count: (doc.quarters ?? []).length },
    { id: "north", label: "North Star", key: "4", count: null },
  ] as const;

  return (
    <div className="wip">
      <div className="shell">
        <div className="topbar">
          <div className="brand-row">
            <div className="brand"><b>WIP</b><span className="tag">Henry · Bastion</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="savestate">{saved === "saving" ? "saving…" : saved === "ok" ? "saved" : ""}</span>
              <button className="iconbtn" onClick={exportJSON}><Download size={12} /> Export</button>
            </div>
          </div>
          <div className="tabs">
            {TABS.map((t) => (
              <button key={t.id} className={`tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id as any)}>
                {t.label}{t.count != null && <span className="c">{t.count}</span>}<span className="k">{t.key}</span>
              </button>
            ))}
          </div>
          <div className="whisper" title="Your North Star, always in view">
            <ArrowUpRight /><span className="lbl">North Star</span>
            <span className="txt">{doc.northStar.statement}</span>
          </div>
        </div>

        {tab === "week" && (
          <div className="page">
            <div className="weeknav">
              <button className="nv" onClick={() => setSelectedWeekStart((s) => prevWeek(s))} title="Previous week"><ChevronLeft size={16} /></button>
              <button className="nv" onClick={() => setSelectedWeekStart((s) => nextWeek(s))} title="Next week"><ChevronRight size={16} /></button>
              <div className="now">
                <span className="wk">{weekCommencingLabel(wk.weekStart!)}</span>
              </div>
              {isPast && <span className="archived">past week</span>}
              <label className="datepick" title="Jump to any week">
                <Calendar size={13} />
                <input type="date" value={wk.weekStart || ""}
                  onChange={(e) => { if (e.target.value) setSelectedWeekStart(weekStartForDate(new Date(e.target.value + "T00:00:00"))); }} />
              </label>
              {!isCurrent && <button className="iconbtn" onClick={() => setSelectedWeekStart(cur)}>This week</button>}
            </div>

            <div className="week-grid">
              <div className="col">
                <Block title="Top priorities" count={`${wk.priorities.length} · order = priority`}>
                  {wk.priorities.map((p, i) => (
                    <div key={p.id} className={`prio ${dragId === p.id ? "drag" : ""} ${overId === p.id ? "over" : ""}`}
                      draggable
                      onDragStart={() => { dragIx.current = i; setDragId(p.id); }}
                      onDragOver={(e) => { e.preventDefault(); if (overId !== p.id) setOverId(p.id); }}
                      onDragEnd={() => { setDragId(null); setOverId(null); }}
                      onDrop={() => { if (dragIx.current != null) reorder(dragIx.current, i); setDragId(null); setOverId(null); }}>
                      <span className="grip"><GripVertical size={14} /></span>
                      <span className="rank mono">{i + 1}</span>
                      <Editable className="ptext" value={p.text} ph="Priority…" autoFocus={pFocus === p.id}
                        onCommit={(v: string) => setWeek({ priorities: wk.priorities.map((x) => x.id === p.id ? { ...x, text: v } : x) })}
                        onEnterAdd={addPrio} />
                      <span className="hrs"><Editable className="hed" value={p.hrs} ph="–"
                        onCommit={(v: string) => setWeek({ priorities: wk.priorities.map((x) => x.id === p.id ? { ...x, hrs: v } : x) })} />h</span>
                      <Chip status={p.status} onCycle={() => cycle(p.id)} />
                      <span className="deadline"><Editable className="ded" value={p.deadline || ""} ph="Due…"
                        onCommit={(v: string) => setWeek({ priorities: wk.priorities.map((x) => x.id === p.id ? { ...x, deadline: v } : x) })} /></span>
                      <X size={14} className="rm" onClick={() => setWeek({ priorities: wk.priorities.filter((x) => x.id !== p.id) })} />
                    </div>
                  ))}
                  <button className="additem" onClick={addPrio}><Plus size={12} /> Add priority</button>
                  <div className="hint"><CornerDownLeft size={11} /> <kbd>Enter</kbd> adds the next one · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd><kbd>4</kbd> switch tabs</div>
                </Block>
                <Block title="Other Tasks" count={(wk.otherTasks ?? []).length}>
                  <EditList items={wk.otherTasks ?? []} setItems={(a: any) => setWeek({ otherTasks: a })} ph="Anything else on…" checkable />
                </Block>
              </div>
              <div className="col">
                <Block title="Key Actions" count={(wk.keyActions ?? []).length}>
                  <EditList items={wk.keyActions ?? []} setItems={(a: any) => setWeek({ keyActions: a })} ph="Key action…" checkable />
                </Block>
                <Block title="Wins this Week" count={wk.accomplished.length}>
                  <EditList items={wk.accomplished} setItems={(a: any) => setWeek({ accomplished: a })} ph="What got done…" />
                </Block>
                <Block title="Blockers" count={wk.blockers.length}>
                  <EditList items={wk.blockers} setItems={(a: any) => setWeek({ blockers: a })} ph="What's in the way…" />
                </Block>
                <Block title="For Discussion" count={wk.discussion.length}>
                  <EditList items={wk.discussion} setItems={(a: any) => setWeek({ discussion: a })} ph="Decisions, FYIs, asks…" mid />
                </Block>
              </div>
            </div>
          </div>
        )}

        {tab === "kpi" && doc.kpi && (
          <div className="page">
            <div className="eyebrow">KPIs <span className="rule" /> targets for Senior Strategy Manager</div>
            <div className="kpi-table">
              <div className="kpi-head">
                <span>Theme</span><span>SSM Target</span><span>Stretch</span><span />
              </div>
              {doc.kpi.themes.map((t) => {
                const open = kpiOpen === t.id;
                return (
                  <div className={`kpi-row ${open ? "open" : ""}`} key={t.id}>
                    <div className="kpi-grid">
                      <div className="kpi-cell theme" data-l="Theme">
                        <Editable className="ed" value={t.theme} ph="Theme…"
                          onCommit={(v: string) => setKpiTheme(t.id, { theme: v })} />
                      </div>
                      <div className="kpi-cell" data-l="SSM Target">
                        <AutoText value={t.target} ph="Senior Strategy Manager target…"
                          onCommit={(v: string) => setKpiTheme(t.id, { target: v })} />
                      </div>
                      <div className="kpi-cell" data-l="Stretch">
                        <AutoText value={t.stretch} ph="Stretch target…"
                          onCommit={(v: string) => setKpiTheme(t.id, { stretch: v })} />
                      </div>
                      <div className="kpi-act">
                        <button className="prog-toggle" onClick={() => setKpiOpen(open ? null : t.id)} title="Progress notes">
                          Progress <ChevronRight size={13} className="cv" />
                        </button>
                        <X size={14} className="rm" onClick={() => removeKpiTheme(t.id)} />
                      </div>
                    </div>
                    {open && (
                      <div className="kpi-prog">
                        <div className="k">Progress · updates, notes, blockers, evidence of completion</div>
                        <AutoText value={t.progress} ph="What's happened, what's in the way, proof it's done…"
                          onCommit={(v: string) => setKpiTheme(t.id, { progress: v })} />
                      </div>
                    )}
                  </div>
                );
              })}
              <button className="additem kpi-add" onClick={addKpiTheme}><Plus size={12} /> Add KPI theme</button>
            </div>

            <div className="kpi-review">
              <div className="rv">
                <div className="k">Position Review Date</div>
                <Editable className="v" value={doc.kpi.reviewDate} ph="e.g. 28-May-27"
                  onCommit={(v: string) => setKpi({ reviewDate: v })} />
              </div>
              <div className="rv">
                <div className="k">Promotion Goal</div>
                <Editable className="v" value={doc.kpi.promotionGoal} ph="e.g. Promotion to Senior Strategy Manager"
                  onCommit={(v: string) => setKpi({ promotionGoal: v })} />
              </div>
            </div>
          </div>
        )}

        {tab === "quarter" && (
          <div className="page">
            <div className="eyebrow">Quarterly Focus <span className="rule" /> a business unit or capability each quarter</div>
            <div className="quarters">
              {(doc.quarters ?? []).map((q) => (
                <div className="qf" key={q.id}>
                  <X size={14} className="rm qfrm" onClick={() => removeQuarter(q.id)} />
                  <div className="qf-head">
                    <Editable className="qf-q" value={q.quarter} ph="Q?"
                      onCommit={(v: string) => setQuarter(q.id, { quarter: v })} />
                    <Editable className="qf-area" value={q.area} ph="Focus area…"
                      onCommit={(v: string) => setQuarter(q.id, { area: v })} />
                  </div>

                  <div className="qf-obj">
                    <div className="k">Objective / reason for focus</div>
                    <AutoText value={q.objective} ph="Why this focus, this quarter…"
                      onCommit={(v: string) => setQuarter(q.id, { objective: v })} />
                  </div>

                  <div className="qf-meet">
                    <div className="k">Meetings</div>
                    <div className="mtable">
                      <div className="mhead">
                        <span>Date</span><span>Who</span><span>Unit / org</span><span>Purpose</span><span>Notes / actions</span><span>Status</span><span />
                      </div>
                      {q.meetings.map((m) => (
                        <div className="mrow" key={m.id}>
                          <div data-l="Date"><Editable className="ed" value={m.date} ph="Date…" onCommit={(v: string) => updateMeeting(q, m.id, { date: v })} /></div>
                          <div data-l="Who"><Editable className="ed" value={m.people} ph="Person / people…" onCommit={(v: string) => updateMeeting(q, m.id, { people: v })} /></div>
                          <div data-l="Unit / org"><Editable className="ed" value={m.unit} ph="Business unit / org…" onCommit={(v: string) => updateMeeting(q, m.id, { unit: v })} /></div>
                          <div data-l="Purpose"><Editable className="ed" value={m.purpose} ph="Purpose…" onCommit={(v: string) => updateMeeting(q, m.id, { purpose: v })} /></div>
                          <div data-l="Notes / actions"><Editable className="ed" value={m.notes} ph="Notes / actions…" onCommit={(v: string) => updateMeeting(q, m.id, { notes: v })} /></div>
                          <div data-l="Status" className="mstat"><MeetingChip status={m.status} onCycle={() => cycleMeeting(q, m.id)} /></div>
                          <X size={13} className="rm mrm" onClick={() => setMeetings(q.id, q.meetings.filter((x) => x.id !== m.id))} />
                        </div>
                      ))}
                      <button className="additem" onClick={() => addMeeting(q)}><Plus size={12} /> Add meeting</button>
                    </div>
                  </div>

                  <div className="qf-foot">
                    <div className="kv"><div className="k">Notes / actions</div>
                      <AutoText value={q.notes} ph="Quarter-level notes / actions…" onCommit={(v: string) => setQuarter(q.id, { notes: v })} /></div>
                    <div className="kv"><div className="k">Progress</div>
                      <AutoText value={q.progress} ph="Progress this quarter…" onCommit={(v: string) => setQuarter(q.id, { progress: v })} /></div>
                  </div>
                </div>
              ))}
              <button className="addcard qf-add" onClick={addQuarter}><Plus size={15} /> Add a quarter</button>
            </div>
          </div>
        )}

        {tab === "north" && (
          <div className="page">
            <div className="eyebrow">North Star <span className="rule" /> what am I becoming</div>
            <Editable className="ns-statement" value={doc.northStar.statement} ph="The one sentence you're working toward…"
              onCommit={(v: string) => setNS({ statement: v })} />
            <div className="ns-grid">
              <div className="ns-cell"><div className="k">Skills in build</div>
                <Editable className="v" value={doc.northStar.skills} ph="…" onCommit={(v: string) => setNS({ skills: v })} /></div>
              <div className="ns-cell"><div className="k">Current focus</div>
                <Editable className="v" value={doc.northStar.focus} ph="…" onCommit={(v: string) => setNS({ focus: v })} /></div>
              <div className="ns-cell"><div className="k">Success looks like</div>
                <Editable className="v" value={doc.northStar.success} ph="…" onCommit={(v: string) => setNS({ success: v })} /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
