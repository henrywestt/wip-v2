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

export interface NorthStar {
  statement: string;
  skills: string;
  focus: string;
  success: string;
}

export interface WipDoc {
  northStar: NorthStar;
  bets: Bet[];
  weeks: Week[];
  rev?: string; // internal: used to ignore our own realtime echoes
}
