/**
 * Mock design idea backlog — proposals from designers across various channels.
 *
 * Used by the Design Idea Backlog page to demonstrate Notice + Chime In +
 * Hear Me Out First patterns applied to a real creative-technologist workflow.
 */

export type IdeaSource = "figma" | "slack" | "email" | "in-person" | "other";
export type IdeaStatus = "candidate" | "prototyping" | "shipped" | "archived";
export type ScoreLevel = 1 | 2 | 3 | 4 | 5;

export interface DesignIdea {
  id: string;
  title: string;
  description: string;
  source: IdeaSource;
  proposedBy: string;
  proposedDaysAgo: number;
  status: IdeaStatus;

  /** Ratings 1–5 */
  usabilityImpact: ScoreLevel;
  feasibility: ScoreLevel;
  complexity: ScoreLevel; // higher = more complex = harder
  prototypeEase: ScoreLevel; // higher = easier to prototype

  /** Source-specific reference */
  sourceRef?: string; // e.g. "figma.com/file/…", "#design-system channel", etc.

  /** Set by Ember — a 1–5 priority score derived from the dimensions */
  emberScore: ScoreLevel;
  /** Ember's one-line rationale for its score */
  emberRationale: string;
  /** True when Ember wants to flag this idea proactively */
  emberFlagged?: boolean;
  /** Days since last touched — Ember uses this for the "stale" notice */
  lastTouchedDaysAgo: number;
}

export const mockDesignIdeas: DesignIdea[] = [
  {
    id: "idea-1",
    title: "Inline annotation mode",
    description:
      "Let reviewers drop sticky-note annotations directly on a live prototype instead of screenshotting and marking up in Figma. Reduces the translation step between feedback and fix.",
    source: "figma",
    proposedBy: "Camille",
    proposedDaysAgo: 3,
    status: "candidate",
    usabilityImpact: 5,
    feasibility: 3,
    complexity: 4,
    prototypeEase: 3,
    sourceRef: "figma.com/file/annotationmode-spec",
    emberScore: 4,
    emberRationale:
      "High usability payoff, complexity is real but prototypable in a week.",
    emberFlagged: true,
    lastTouchedDaysAgo: 3,
  },
  {
    id: "idea-2",
    title: "Skeleton loader micro-variants",
    description:
      "Design a set of skeleton loader shapes tuned per component type — cards, avatars, text blocks — instead of the current one-size-fits-all rectangle.",
    source: "slack",
    proposedBy: "Raj",
    proposedDaysAgo: 7,
    status: "candidate",
    usabilityImpact: 3,
    feasibility: 5,
    complexity: 2,
    prototypeEase: 5,
    sourceRef: "#design-system",
    emberScore: 5,
    emberRationale:
      "Lowest effort, immediate polish win — should be top of the queue.",
    emberFlagged: true,
    lastTouchedDaysAgo: 7,
  },
  {
    id: "idea-3",
    title: "Gesture-based undo on mobile",
    description:
      "Two-finger swipe left to undo the last action on the mobile editor — mirrors the iOS system gesture and removes the need for a visible undo button.",
    source: "in-person",
    proposedBy: "Dana",
    proposedDaysAgo: 12,
    status: "candidate",
    usabilityImpact: 4,
    feasibility: 3,
    complexity: 3,
    prototypeEase: 4,
    sourceRef: "Hallway chat, sprint planning",
    emberScore: 3,
    emberRationale:
      "Good idea but gesture conflicts with the scroll — needs testing before committing.",
    lastTouchedDaysAgo: 12,
  },
  {
    id: "idea-4",
    title: "Ambient progress ring",
    description:
      "Replace the linear progress bar on long exports with an ambient pulsing ring that conveys 'working' without implying a specific % — reduces perceived wait anxiety.",
    source: "email",
    proposedBy: "Priya",
    proposedDaysAgo: 2,
    status: "candidate",
    usabilityImpact: 3,
    feasibility: 5,
    complexity: 2,
    prototypeEase: 5,
    sourceRef: "Thread: 'Export UX feedback'",
    emberScore: 4,
    emberRationale:
      "Trivial to prototype, measurably better UX for async ops. Quick win.",
    lastTouchedDaysAgo: 2,
  },
  {
    id: "idea-5",
    title: "Contextual empty states",
    description:
      "Each empty state surfaces the most relevant action for that context instead of a generic 'nothing here yet.' First-run, filtered, and error empty states all behave differently.",
    source: "figma",
    proposedBy: "Camille",
    proposedDaysAgo: 18,
    status: "candidate",
    usabilityImpact: 5,
    feasibility: 4,
    complexity: 3,
    prototypeEase: 4,
    sourceRef: "figma.com/file/empty-states-audit",
    emberScore: 4,
    emberRationale:
      "High impact, clear scope. This one's been waiting 18 days — worth a look.",
    emberFlagged: true,
    lastTouchedDaysAgo: 18,
  },
  {
    id: "idea-6",
    title: "Type-ahead command palette",
    description:
      "A ⌘K-style command palette that surfaces actions, recent files, and shortcuts — eliminates hunting through menus for power users.",
    source: "slack",
    proposedBy: "Marcus",
    proposedDaysAgo: 9,
    status: "prototyping",
    usabilityImpact: 5,
    feasibility: 4,
    complexity: 4,
    prototypeEase: 3,
    sourceRef: "#eng-design-collab",
    emberScore: 5,
    emberRationale:
      "Already prototyping — this one's the right call. Keep going.",
    lastTouchedDaysAgo: 1,
  },
  {
    id: "idea-7",
    title: "Focus mode — hide chrome",
    description:
      "A single keypress collapses all UI chrome — nav, toolbar, panels — leaving only the canvas. For deep creative work or presenting to a client.",
    source: "in-person",
    proposedBy: "You",
    proposedDaysAgo: 21,
    status: "candidate",
    usabilityImpact: 4,
    feasibility: 5,
    complexity: 2,
    prototypeEase: 5,
    sourceRef: "Your own idea, team retro",
    emberScore: 5,
    emberRationale:
      "High feasibility, high ease — and it's been sitting 21 days. This is the one.",
    emberFlagged: true,
    lastTouchedDaysAgo: 21,
  },
  {
    id: "idea-8",
    title: "Haptic confirmation on destructive actions",
    description:
      "Trigger a haptic pulse on mobile when the user confirms a delete or irreversible action — tactile reinforcement that something real happened.",
    source: "email",
    proposedBy: "Raj",
    proposedDaysAgo: 5,
    status: "archived",
    usabilityImpact: 2,
    feasibility: 2,
    complexity: 3,
    prototypeEase: 2,
    sourceRef: "Thread: 'Mobile polish Q3'",
    emberScore: 2,
    emberRationale:
      "Low feasibility on our stack and limited browser support. Revisit if we go native.",
    lastTouchedDaysAgo: 5,
  },
];

/** Source metadata */
export const sourceConfig: Record<
  IdeaSource,
  { label: string; color: string; icon: string }
> = {
  figma: {
    label: "Figma",
    color: "text-violet-600 bg-violet-50 border-violet-200",
    icon: "◈",
  },
  slack: {
    label: "Slack",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
    icon: "◆",
  },
  email: {
    label: "Email",
    color: "text-blue-600 bg-blue-50 border-blue-200",
    icon: "◉",
  },
  "in-person": {
    label: "In person",
    color: "text-amber-700 bg-amber-50 border-amber-200",
    icon: "◎",
  },
  other: {
    label: "Other",
    color: "text-stone-600 bg-stone-50 border-stone-200",
    icon: "○",
  },
};

export const statusConfig: Record<
  IdeaStatus,
  { label: string; color: string }
> = {
  candidate: {
    label: "Candidate",
    color: "text-foreground bg-secondary border-border",
  },
  prototyping: {
    label: "Prototyping",
    color: "text-fuego-700 bg-fuego-50 border-fuego-200",
  },
  shipped: {
    label: "Shipped",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  archived: {
    label: "Archived",
    color: "text-muted-foreground bg-muted border-border",
  },
};

/** Ember's proactive notice when high-value ideas have been stale too long */
export function getStaleFlagMessage(idea: DesignIdea): string {
  if (idea.lastTouchedDaysAgo >= 14) {
    return `**${idea.title}** has been sitting for ${idea.lastTouchedDaysAgo} days. Ember score: ${idea.emberScore}/5. ${idea.emberRationale}`;
  }
  return `**${idea.title}** is worth a second look — ${idea.emberRationale}`;
}

/** Ember's "hear me out" rationale when user tries to archive a high-scored idea */
export function getArchiveBlockMessage(idea: DesignIdea): string[] {
  return [
    `Wait — I scored **${idea.title}** a ${idea.emberScore}/5. Before you archive it, here's why I think it matters.`,
    idea.emberRationale,
    `Usability impact: **${idea.usabilityImpact}/5** · Prototype ease: **${idea.prototypeEase}/5**. That's a strong combination. Are you sure you want to shelve it?`,
  ];
}
