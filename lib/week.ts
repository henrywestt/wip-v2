// lib/week.ts
// Calendar-week logic for the WIP app. Native Date only, no dependency.
// Single source of truth: a week IS the Monday it starts on, stored as an
// ISO "YYYY-MM-DD" string (`weekStart`). Everything else is derived.

import type { WipDoc, Week, Li } from "./types";
import { uid } from "./seed";

const pad = (n: number) => String(n).padStart(2, "0");

/** Local-time ISO date (no UTC shift). */
export const iso = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Parse an ISO date string to a local-midnight Date. */
export const parseISO = (s: string) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Shift an ISO date by n days, return ISO. */
export const addDaysISO = (s: string, n: number) => {
  const d = parseISO(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};

/** Monday of the week containing `dt`, as ISO. weekStartsOn = Monday. */
export const mondayOf = (dt: Date) => {
  const x = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
  const day = x.getDay(); // Sun=0 … Sat=6
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return iso(x);
};

/** Current WIP week, derived from today. No hard-coded dates. */
export const currentWeekStart = (now: Date = new Date()) => mondayOf(now);

/** Any picked date -> its Monday week start (for the date picker). */
export const weekStartForDate = (picked: Date) => mondayOf(picked);

export const prevWeek = (s: string) => addDaysISO(s, -7);
export const nextWeek = (s: string) => addDaysISO(s, 7);

const WD_S = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WD_L = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Header label, e.g. "w/c Mon 15 Jun". */
export const weekCommencingLabel = (s: string) => {
  const d = parseISO(s);
  return `w/c ${WD_S[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
};

/**
 * Change 3: the grey 1:1 date. Always the Tuesday of the selected week,
 * computed as weekStart + 1 day. e.g. weekStart 2026-06-15 -> "Tuesday 16 Jun".
 */
export const tuesdayLabel = (s: string) => {
  const t = parseISO(addDaysISO(s, 1));
  return `${WD_L[t.getDay()]} ${t.getDate()} ${MON[t.getMonth()]}`;
};

const MONIX: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

const isISO = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

/** Coerce an unknown value into a Li[]. */
const asLiList = (v: unknown): Li[] => (Array.isArray(v) ? (v as Li[]) : []);

/** Default a checkable list's items to `checked: false` where missing. */
const withChecked = (items: Li[]): Li[] =>
  items.map((it) => ({ ...it, checked: typeof it.checked === "boolean" ? it.checked : false }));

/**
 * Compatibility layer for legacy free-text labels like "Mon 16 Jun".
 * The label carries no year and its weekday word may not match the real
 * calendar, so we trust the day + month, pick the year nearest to `now`,
 * then snap to that week's real Monday. Returns null if unparseable.
 */
export function parseWeekOfToMonday(label: string, now: Date = new Date()): string | null {
  if (!label) return null;
  const dm = label.match(/(\d{1,2})/);
  const mm = label.toLowerCase().match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/);
  if (!dm || !mm) return null;
  const day = +dm[1];
  const mon = MONIX[mm[0]];
  let best: Date | null = null;
  let bestDiff = Infinity;
  for (const y of [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1]) {
    const cand = new Date(y, mon, day);
    const diff = Math.abs(cand.getTime() - now.getTime());
    if (diff < bestDiff) { bestDiff = diff; best = cand; }
  }
  return best ? mondayOf(best) : null;
}

/**
 * Idempotent migration / compatibility layer. Guarantees every week has a
 * canonical `weekStart`, that they're unique, and that the array is sorted
 * oldest -> newest. Safe to run on every load; existing data is preserved.
 */
export function migrateDoc(doc: WipDoc, now: Date = new Date()): WipDoc {
  if (!doc || !Array.isArray(doc.weeks)) return doc;

  const used = new Set<string>();
  let lastAssigned: string | null = null;

  const weeks: Week[] = doc.weeks.map((w) => {
    let ws = isISO(w.weekStart) ? w.weekStart! : parseWeekOfToMonday(w.weekOf, now);
    // Fallback for an empty / unparseable legacy week: step one week on from
    // the previous one, else default to the current week.
    if (!ws) ws = lastAssigned ? addDaysISO(lastAssigned, 7) : currentWeekStart(now);
    // De-collide: never let two weeks share a weekStart.
    while (used.has(ws)) ws = addDaysISO(ws, 7);
    used.add(ws);
    lastAssigned = ws;
    // Back-compat: older saved weeks predate `otherTasks` / `keyActions`.
    // Guarantee both are arrays, and default each checkable item's `checked`
    // to false so the UI never has to guard for undefined.
    const otherTasks = withChecked(asLiList(w.otherTasks));
    const keyActions = withChecked(asLiList(w.keyActions));
    return { ...w, weekStart: ws, keyActions, otherTasks };
  });

  weeks.sort((a, b) => a.weekStart!.localeCompare(b.weekStart!));
  return { ...doc, weeks };
}

/**
 * Returns `doc.weeks` with the week for `weekStart` guaranteed present.
 * Judgement calls, per Henry: carry the priority TEXT only (reset hrs +
 * status), and pull from the most recent EXISTING earlier week so skipped
 * weeks don't break the chain. Never overwrites an existing week.
 */
export function ensureWeek(doc: WipDoc, weekStart: string): Week[] {
  if (doc.weeks.some((w) => w.weekStart === weekStart)) return doc.weeks; // no overwrite

  const prev = doc.weeks
    .filter((w) => (w.weekStart || "") < weekStart)
    .sort((a, b) => (b.weekStart || "").localeCompare(a.weekStart || ""))[0];

  // Carry priorities forward from the most recent earlier week, but drop any
  // that are finished. Keep each remaining priority's status AND deadline,
  // give it a fresh id, and reset hrs for the new week.
  const priorities = prev
    ? prev.priorities
        .filter((p) => p.status !== "done")
        .map((p) => ({ id: uid(), text: p.text, hrs: "", status: p.status, deadline: p.deadline }))
    : [];

  const week: Week = {
    id: uid(),
    weekStart,
    weekOf: weekCommencingLabel(weekStart),
    oneOnOne: "",
    accomplished: [],
    priorities,
    keyActions: [],
    otherTasks: [],
    blockers: [],
    discussion: [],
  };

  return [...doc.weeks, week].sort((a, b) => (a.weekStart || "").localeCompare(b.weekStart || ""));
}
