import type { WipDoc } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 9);
export const li = (text: string) => ({ id: uid(), text });

// First-run content. Your real WIP, so a brand-new doc isn't an empty page.
export const SEED: WipDoc = {
  northStar: {
    statement:
      "To confidently build and present unique strategy for global brands at the forefront of culture.",
    skills:
      "Structured strategic thinking · data-backed storytelling · working backwards to one recommendation",
    focus:
      "Run a full strategy process solo on one live brief, start to finish, without checking how to begin each step.",
    success:
      "I can defend every slide out loud. The recommendation feels inevitable by the time you reach it.",
  },
  bets: [
    {
      id: uid(),
      name: "Build & document a strategy process I can run end-to-end",
      desc: "Confidence to present comes from trusting how you got the answer. The process is the engine of the North Star.",
      status: "active",
      progress: 35,
      evidence: "First draft of the framework written. Not yet run unsupported on a live brief.",
      notes: "Signal of done: I run the full process solo on Spark without asking how to start each step.",
    },
  ],
  weeks: [
    {
      id: uid(), weekOf: "Mon 2 Jun", oneOnOne: "Thu 5 Jun",
      accomplished: [li("Mapped the Spark category tensions, picked the one worth a deck")],
      priorities: [
        { id: uid(), text: "Spark Phase 1 — discovery", hrs: "10", status: "done" },
        { id: uid(), text: "Set up the strategy process doc", hrs: "4", status: "done" },
      ],
      blockers: [],
      feedback: [li("Polina: your discovery is strong, but you buried the insight on slide 9. Lead with it.")],
      discussion: [li("Agreed: insight goes first, evidence supports it, not the reverse.")],
    },
    {
      id: uid(), weekOf: "Mon 9 Jun", oneOnOne: "Thu 12 Jun",
      accomplished: [
        li("Rebuilt Spark deck insight-first, much sharper"),
        li("Ran first brand workshop solo"),
      ],
      priorities: [
        { id: uid(), text: "Spark Phase 2 — build the argument", hrs: "9", status: "done" },
        { id: uid(), text: "Prep L'Oreal kickoff", hrs: "4", status: "done" },
        { id: uid(), text: "Brand workshop #1", hrs: "3", status: "done" },
      ],
      blockers: [li("Spark client pushed the readout, freed up Thursday")],
      feedback: [li("Judgement check: I cut two routes down to one. My call held up in review.")],
      discussion: [li("FYI: L'Oreal kickoff moved to next week, their side.")],
    },
    {
      id: uid(), weekOf: "Mon 16 Jun", oneOnOne: "Thu 19 Jun",
      accomplished: [
        li("Spark Phase 3 deck: structure locked, story spine agreed"),
        li("Two brand workshops run, synthesis captured"),
      ],
      priorities: [
        { id: uid(), text: "Spark Phase 3 deck", hrs: "8", status: "active" },
        { id: uid(), text: "L'Oreal deck", hrs: "5", status: "todo" },
        { id: uid(), text: "Brand workshops: write up", hrs: "3", status: "todo" },
      ],
      blockers: [li("Waiting on L'Oreal category data to finish the size-of-prize slide")],
      feedback: [li("Judgement check: I led Spark with the cultural tension, not the brand. My call, it earns the recommendation. Agree?")],
      discussion: [
        li("Decision I need: which of the two Spark routes do we take into Phase 4?"),
        li("FYI / no surprise: L'Oreal timeline slipped a week, their side."),
        li("Ask: what else is happening I should know about?"),
      ],
    },
  ],
};
