"use client";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  GripVertical, Plus, X, Download, ArrowUpRight, CornerDownLeft,
  ChevronLeft, ChevronRight, Calendar,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { SEED, uid, li } from "@/lib/seed";
import type { WipDoc, Status } from "@/lib/types";
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

/* Drag-to-reorder list for simple {id,text} items (Other Tasks).
   Owns its OWN drag state so dragging here never affects any other list. */
function ReorderList({ items, setItems, ph }: any) {
  const dragIx = useRef<number | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const reorder = (from: number, to: number) => {
    const n = [...items]; const [m] = n.splice(from, 1); n.splice(to, 0, m); setItems(n);
  };
  const add = (afterIdx: number) => {
    const ni = li(""); const next = [...items]; next.splice(afterIdx + 1, 0, ni); setItems(next); setFocusId(ni.id);
  };

  return (
    <div>
      {items.map((it: any, i: number) => (
        <div key={it.id} className={`otrow ${dragId === it.id ? "drag" : ""} ${overId === it.id ? "over" : ""}`}
          draggable
          onDragStart={() => { dragIx.current = i; setDragId(it.id); }}
          onDragOver={(e) => { e.preventDefault(); if (overId !== it.id) setOverId(it.id); }}
          onDragEnd={() => { setDragId(null); setOverId(null); }}
          onDrop={() => { if (dragIx.current != null) reorder(dragIx.current, i); setDragId(null); setOverId(null); }}>
          <span className="grip"><GripVertical size={14} /></span>
          <Editable value={it.text} ph={ph} autoFocus={focusId === it.id}
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
  const [tab, setTab] = useState<"week" | "quarter" | "north">("week");
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
      if (e.key === "2") setTab("quarter");
      if (e.key === "3") setTab("north");
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

  const TABS = [
    { id: "week", label: "This Week", key: "1", count: `${idx + 1}/${doc.weeks.length}` },
    { id: "quarter", label: "Quarterly Bets", key: "2", count: doc.bets.length },
    { id: "north", label: "North Star", key: "3", count: null },
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
                  <div className="hint"><CornerDownLeft size={11} /> <kbd>Enter</kbd> adds the next one · <kbd>1</kbd><kbd>2</kbd><kbd>3</kbd> switch tabs</div>
                </Block>
                <Block title="Other Tasks" count={(wk.otherTasks ?? []).length}>
                  <ReorderList items={wk.otherTasks ?? []} setItems={(a: any) => setWeek({ otherTasks: a })} ph="Anything else on…" />
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

        {tab === "quarter" && (
          <div className="page">
            <div className="eyebrow">Quarterly Bets <span className="rule" /> what am I achieving this quarter</div>
            <div className="bets">
              {doc.bets.map((b) => (
                <div className="bet" key={b.id}>
                  <X size={14} className="rm betrm" onClick={() => setBets(doc.bets.filter((x) => x.id !== b.id))} />
                  <div className="ladder"><ArrowUpRight /> ladders to North Star</div>
                  <Editable className="ed name" value={b.name} ph="Name the bet…"
                    onCommit={(v: string) => setBets(doc.bets.map((x) => x.id === b.id ? { ...x, name: v } : x))} />
                  <Editable className="ed desc" value={b.desc} ph="Why it matters…"
                    onCommit={(v: string) => setBets(doc.bets.map((x) => x.id === b.id ? { ...x, desc: v } : x))} />
                  <div className="bartop">
                    <Chip status={b.status} onCycle={() => setBetStatus(b.id)} />
                    <span className="pct mono">{b.progress}%</span>
                  </div>
                  <div className="track" onClick={(e) => setProgress(b.id, e)} title="Click to set progress">
                    <div className="fill" style={{ width: `${b.progress}%` }} />
                  </div>
                  <div className="foot">
                    <div className="kv"><div className="k">Evidence</div>
                      <Editable className="ed v" value={b.evidence} ph="What's the proof?"
                        onCommit={(v: string) => setBets(doc.bets.map((x) => x.id === b.id ? { ...x, evidence: v } : x))} /></div>
                    <div className="kv"><div className="k">Notes</div>
                      <Editable className="ed v" value={b.notes} ph="Signal of done…"
                        onCommit={(v: string) => setBets(doc.bets.map((x) => x.id === b.id ? { ...x, notes: v } : x))} /></div>
                  </div>
                </div>
              ))}
              <button className="addcard" onClick={addBet}><Plus size={15} /> Add a bet</button>
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
