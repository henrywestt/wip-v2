import type { WipDoc, KpiBlock, QuarterFocus } from "./types";

export const uid = () => Math.random().toString(36).slice(2, 9);
// New list items carry a `checked` flag (default false). Harmless on
// non-checkable lists, which simply ignore it.
export const li = (text: string, checked = false) => ({ id: uid(), text, checked });

// ---- default KPI table (Change 1) ---------------------------------------
// Exported so migrateDoc can backfill it into docs created before KPIs existed.
export const SEED_KPI: KpiBlock = {
  reviewDate: "28-May-27",
  promotionGoal: "Promotion to Senior Strategy Manager",
  themes: [
    {
      id: uid(),
      theme: "1. Deliver Financial Targets",
      target:
        "1. Lead and deliver a combination of projects that total ~20-25% of revenue target across the year (~$300k P.A / ~$30k per month).\n2. Managing all aspects of project.",
      stretch:
        "1. Lead and deliver a combination of projects that total ~30% of revenue target across the year (~$425k P.A / ~$42.5k per month).\n2. Managing all aspects of project.",
      progress: "",
    },
    {
      id: uid(),
      theme: "2. Build Brand Profile",
      target: "1. Explore opportunities to build personal brand.",
      stretch: "1. Quarterly Substack post of cultural/sporting insight separate to Insights Project.",
      progress: "",
    },
    {
      id: uid(),
      theme: "3. Build AI Capability",
      target:
        "1. Complete AI Training.\n2. Support Strategy Director in assessing the role for AI across the division based on insights.",
      stretch: "1. Create/enhance an AI-based tool that streamlines the process.",
      progress: "",
    },
    {
      id: uid(),
      theme: "4. Improve Operational Model",
      target:
        "1. Organise 1 x catch-up a month with members of the broader agency to understand what they do / where they could support.",
      stretch: "1. Turn 2 of the 12 catch-ups into collaborating on a project or referred lead.",
      progress: "",
    },
    {
      id: uid(),
      theme: "5. Grow Revenue from Whales",
      target:
        "1. Develop understanding of \u201con-sell\u201d opportunities across all projects and when/how to position additional scope in front of clients.\n2. Deliver high-quality service that builds strong relationships with clients.",
      stretch: "1. Produce X amount of additional scope to clients.",
      progress: "",
    },
    {
      id: uid(),
      theme: "6. Strengthen People & Culture",
      target: "1. Work with manager to identify 2 L&D opportunities to pursue across the year.",
      stretch: "",
      progress: "",
    },
    {
      id: uid(),
      theme: "7. Build Competitive Strength",
      target: "N/A",
      stretch: "",
      progress: "",
    },
    {
      id: uid(),
      theme: "8. Personal KPI",
      target: "TBC",
      stretch: "",
      progress: "",
    },
  ],
};

// ---- default Quarterly Focus (Change 2) ---------------------------------
const quarter = (q: string, area: string): QuarterFocus => ({
  id: uid(),
  quarter: q,
  area,
  objective: "",
  meetings: [
    {
      id: uid(),
      date: "",
      people: "",
      unit: "",
      purpose: "",
      notes: "",
      status: "not-started",
    },
  ],
  notes: "",
  progress: "",
});

export const SEED_QUARTERS: QuarterFocus[] = [
  quarter("Q1", "Finance"),
  quarter("Q2", "Negotiation"),
  quarter("Q3", "Media Planning"),
  quarter("Q4", "Tech & AI"),
];

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
  kpi: SEED_KPI,
  quarters: SEED_QUARTERS,
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
      keyActions: [
        li("Send Spark Phase 3 deck to Polina for review"),
        li("Chase L'Oreal category data"),
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
