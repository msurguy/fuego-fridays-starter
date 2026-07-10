/**
 * Mock creative concepts — campaign/project directions for a creative technology brief.
 *
 * These are the "options on the table" that the human is reviewing.
 * The AI watches hovering behavior and chimes in when it detects hesitation.
 */

export interface Concept {
  id: string;
  title: string;
  logline: string;
  description: string;
  medium: string;
  effort: "low" | "medium" | "high";
  boldness: "safe" | "considered" | "bold" | "risky";
  tags: string[];
  color: string; // Tailwind color for the concept card accent
}

export const mockConcepts: Concept[] = [
  {
    id: "concept-a",
    title: "The Living Brief",
    logline: "A brief that rewrites itself as the project evolves.",
    description:
      "Replace the static PDF brief with a document that updates in real time — pulling in campaign metrics, stakeholder feedback, and cultural signals. The brief is never 'done'; it's alive.",
    medium: "Interactive document / data visualization",
    effort: "high",
    boldness: "bold",
    tags: ["data", "editorial", "long-form"],
    color: "fuego",
  },
  {
    id: "concept-b",
    title: "Ambient Mood Board",
    logline: "A mood board that responds to the time of day and weather.",
    description:
      "The visual references shift subtly based on ambient context — morning light vs. late-night energy, sunny vs. overcast. The creative direction breathes with the real world.",
    medium: "Generative UI / ambient display",
    effort: "medium",
    boldness: "considered",
    tags: ["generative", "ambient", "visual"],
    color: "blue",
  },
  {
    id: "concept-c",
    title: "Concept Obituary",
    logline: "Kill your darlings — with ceremony.",
    description:
      "When a concept gets cut, instead of deleting it, the team writes a one-paragraph obituary: what it was, why it almost made it, what it taught you. Builds institutional memory.",
    medium: "Ritual / documentation practice",
    effort: "low",
    boldness: "safe",
    tags: ["process", "writing", "ritual"],
    color: "stone",
  },
  {
    id: "concept-d",
    title: "The Reverse Pitch",
    logline: "The client pitches back — tell us what you saw.",
    description:
      "After presenting work, flip the table: ask the client to present the work back to you in their own words. What they describe tells you exactly what landed and what didn't.",
    medium: "Workshop / facilitation format",
    effort: "low",
    boldness: "bold",
    tags: ["process", "client", "facilitation"],
    color: "emerald",
  },
  {
    id: "concept-e",
    title: "Signal Decay",
    logline: "A campaign that degrades intentionally over time.",
    description:
      "Launch assets that slowly corrupt, fade, or simplify as the campaign ages — visually embodying the lifecycle of a trend. The last frame is always the most honest.",
    medium: "Motion / campaign",
    effort: "high",
    boldness: "risky",
    tags: ["motion", "campaign", "conceptual"],
    color: "violet",
  },
  {
    id: "concept-f",
    title: "One Constraint",
    logline: "Ship with exactly one creative rule.",
    description:
      "The entire project runs under a single, deliberately limiting constraint chosen up front — one color, one typeface, one interaction, one word. Constraint as creative engine.",
    medium: "Design system / campaign",
    effort: "medium",
    boldness: "considered",
    tags: ["constraint", "systems", "minimalism"],
    color: "amber",
  },
];

/** The AI's canned comparison when it detects hesitation between two concepts. */
export function getAgentComparison(a: Concept, b: Concept): string[] {
  return [
    `I noticed you going back and forth between **${a.title}** and **${b.title}**. Want me to help you decide?`,
    `Here's how I read it: **${a.title}** pushes harder — ${a.boldness === "risky" || a.boldness === "bold" ? "it's the riskier bet but it's the one people will remember" : "it's ambitious but executable"}. **${b.title}** is ${b.boldness === "safe" || b.boldness === "considered" ? "the safer choice — lower stakes, easier to sell" : "a strong contender with a clearer path to execution"}.`,
    `The real question is: what does this project need to *say*? If the goal is to make a point, go with **${a.title}**. If the goal is to land cleanly and leave room for the relationship, **${b.title}** has the edge.`,
    `My read: **${a.effort === "high" ? b.title : a.title}** — ${a.effort === "high" ? `${b.title} gets you 80% of the impact with half the lift. Save the big swing for when you have the runway.` : `${a.title} is the move. The constraint forces focus, and focus is what makes creative work land.`}`,
  ];
}
