export type Status = "todo" | "active" | "done" | "blocked";

export interface Li { id: string; text: string; }
export interface Priority { id: string; text: string; hrs: string; status: Status; }

export interface Week {
  id: string;
  weekStart?: string; // canonical ISO Monday, e.g. "2026-06-15" (source of truth)
  weekOf: string;     // legacy display label, kept for back-compat / export
  oneOnOne?: string;  // legacy 1:1 date text, no longer displayed (Tuesday is derived)
  accomplished: Li[];
  priorities: Priority[];
  blockers: Li[];
  feedback: Li[];
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
