export type Status = "todo" | "active" | "review" | "done" | "blocked";

// `checked` is optional so older saved items (which only had { id, text })
// stay valid. It's only meaningful for "checkable" lists (Key Actions, Other Tasks).
export interface Li { id: string; text: string; checked?: boolean; }
export interface Priority { id: string; text: string; hrs: string; status: Status; deadline?: string; }

export interface Week {
  id: string;
  weekStart?: string; // canonical ISO Monday, e.g. "2026-06-15" (source of truth)
  weekOf: string;     // legacy display label, kept for back-compat / export
  oneOnOne?: string;  // legacy 1:1 date text, no longer displayed
  accomplished: Li[]; // displayed as "Wins" in the UI; key kept for back-compat
  priorities: Priority[];
  keyActions?: Li[];  // optional: checkable to-do list, top of the right column (defaults to [])
  otherTasks?: Li[];  // optional: checkable to-do list (defaults to [])
  blockers: Li[];
  feedback?: Li[];    // legacy: retained in stored docs for back-compat, no longer rendered
  discussion: Li[];
}

export interface Bet {
  id: string;
  name: string;
  desc: string;
  status: Status;
  progress: number;
  evidence: string;
  notes: string;
}

// ---- KPI tracking (Change 1) --------------------------------------------
// One row per KPI theme. `target` / `stretch` / `progress` are free multi-line
// text so the table can hold as much or as little as you want.
export interface KpiTheme {
  id: string;
  theme: string;     // e.g. "1. Deliver Financial Targets"
  target: string;    // Senior Strategy Manager Targets
  stretch: string;   // Stretch Targets
  progress: string;  // updates / notes / blockers / evidence of completion
}

export interface KpiBlock {
  themes: KpiTheme[];
  reviewDate: string;    // e.g. "28-May-27"
  promotionGoal: string; // e.g. "Promotion to Senior Strategy Manager"
}

// ---- Quarterly Focus (Change 2) -----------------------------------------
export type MeetingStatus = "not-started" | "scheduled" | "completed" | "follow-up";

export interface FocusMeeting {
  id: string;
  date: string;     // free text, e.g. "12 Aug"
  people: string;   // person / people meeting with
  unit: string;     // business unit / external organisation
  purpose: string;  // purpose of meeting
  notes: string;    // notes / actions
  status: MeetingStatus;
}

export interface QuarterFocus {
  id: string;
  quarter: string;   // e.g. "Q1"
  area: string;      // focus area, e.g. "Finance"
  objective: string; // objective / reason for focus
  meetings: FocusMeeting[];
  notes: string;     // notes / actions (quarter-level)
  progress: string;  // progress (quarter-level)
}

export interface NorthStar {
  statement: string;
  skills: string;
  focus: string;
  success: string;
}

export interface WipDoc {
  northStar: NorthStar;
  bets: Bet[];              // legacy: kept in stored docs for back-compat, no longer rendered
  quarters?: QuarterFocus[]; // Quarterly Focus tab (defaults seeded in migrateDoc)
  kpi?: KpiBlock;            // KPIs tab (defaults seeded in migrateDoc)
  weeks: Week[];
  rev?: string; // internal: used to ignore our own realtime echoes
}
