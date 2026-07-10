/**
 * Fuego Fridays — "Chime In" + "Hear Me Out First" for Creative Technology
 *
 * Chime In: The AI watches which concepts you hover. When it detects back-and-forth
 * hesitation, it chimes in with a comparison and a recommendation.
 *
 * Hear Me Out First: Once Ember has chimed in, you can't dismiss it until you've
 * read the full rationale. Trying to close early triggers a gentle block — the
 * dismiss button shakes and Ember asks you to hear it out. Once all messages are
 * visible, you're free to go either way.
 *
 * Humorphism foundations: Notice · Communicate · Decide · Coach · Consent
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { Sparkles, X, ChevronRight, BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";

import {
  mockConcepts,
  getAgentComparison,
  type Concept,
} from "@/data/mock-concepts";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentState = "dormant" | "watching" | "chiming" | "comparing" | "done";

interface HoverRecord {
  id: string;
  count: number;
  lastAt: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** How many back-and-forth hovers before the agent chimes in */
const HOVER_THRESHOLD = 3;
/** Minimum total dwell time (ms) before the agent considers you "hesitating" */
const DWELL_THRESHOLD_MS = 2000;

// ─── Accent color map ─────────────────────────────────────────────────────────

const colorMap: Record<string, { bg: string; border: string; dot: string }> = {
  fuego: { bg: "bg-fuego-50", border: "border-fuego-200", dot: "bg-fuego-500" },
  blue: { bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500" },
  stone: { bg: "bg-stone-50", border: "border-stone-200", dot: "bg-stone-400" },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    dot: "bg-violet-500",
  },
  amber: { bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
};

const boldnessLabel: Record<Concept["boldness"], string> = {
  safe: "Safe bet",
  considered: "Considered",
  bold: "Bold",
  risky: "Risky",
};

const effortLabel: Record<Concept["effort"], string> = {
  low: "Low lift",
  medium: "Medium",
  high: "High effort",
};

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [agentState, setAgentState] = useState<AgentState>("dormant");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoverLog, setHoverLog] = useState<HoverRecord[]>([]);
  const [watchingIds, setWatchingIds] = useState<[string, string] | null>(null);
  const [agentMessages, setAgentMessages] = useState<string[]>([]);
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [selectedForCompare, setSelectedForCompare] = useState<
    [string, string] | null
  >(null);
  const [dismissed, setDismissed] = useState(false);
  const [, setTotalDwell] = useState(0);
  const dwellRef = useRef<number>(0);
  const dwellTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── "Hear Me Out First" state ───────────────────────────────────────────────
  // hasReadRationale: true once all agent messages are visible
  // hmofBlocked: true while the user is being blocked from dismissing
  const [hasReadRationale, setHasReadRationale] = useState(false);
  const [hmofBlocked, setHmofBlocked] = useState(false);
  const dismissBtnControls = useAnimation();

  // ── Dwell tracking ──────────────────────────────────────────────────────────

  const startDwell = useCallback(() => {
    if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
    dwellTimerRef.current = setInterval(() => {
      dwellRef.current += 100;
      setTotalDwell(dwellRef.current);
    }, 100);
  }, []);

  const stopDwell = useCallback(() => {
    if (dwellTimerRef.current) {
      clearInterval(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopDwell(), [stopDwell]);

  // ── Hover detection ─────────────────────────────────────────────────────────

  const handleConceptHover = useCallback(
    (id: string) => {
      if (
        agentState === "chiming" ||
        agentState === "comparing" ||
        agentState === "done"
      )
        return;
      setHoveredId(id);
      startDwell();

      setHoverLog((prev) => {
        const existing = prev.find((r) => r.id === id);
        const updated = existing
          ? prev.map((r) =>
              r.id === id
                ? { ...r, count: r.count + 1, lastAt: Date.now() }
                : r,
            )
          : [...prev, { id, count: 1, lastAt: Date.now() }];

        // Find the two most-hovered
        const top2 = [...updated].sort((a, b) => b.count - a.count).slice(0, 2);
        const totalHovers = updated.reduce((s, r) => s + r.count, 0);

        if (
          top2.length === 2 &&
          top2[0].count >= HOVER_THRESHOLD &&
          top2[1].count >= 2 &&
          dwellRef.current >= DWELL_THRESHOLD_MS &&
          agentState === "dormant"
        ) {
          setWatchingIds([top2[0].id, top2[1].id]);
          setAgentState("watching");
        }

        if (totalHovers > 0)
          setAgentState((s) => (s === "dormant" ? "dormant" : s));

        return updated;
      });
    },
    [agentState, startDwell],
  );

  const handleConceptLeave = useCallback(() => {
    setHoveredId(null);
    stopDwell();
  }, [stopDwell]);

  // ── Watching → Chiming transition ───────────────────────────────────────────

  useEffect(() => {
    if (agentState !== "watching" || !watchingIds) return;
    const t = setTimeout(() => setAgentState("chiming"), 800);
    return () => clearTimeout(t);
  }, [agentState, watchingIds]);

  // ── Stream agent messages ────────────────────────────────────────────────────

  useEffect(() => {
    if (agentState !== "chiming" || !watchingIds) return;
    const [aId, bId] = watchingIds;
    const conceptA = mockConcepts.find((c) => c.id === aId)!;
    const conceptB = mockConcepts.find((c) => c.id === bId)!;
    const messages = getAgentComparison(conceptA, conceptB);
    setAgentMessages(messages);
    setVisibleMessages(0);
    setSelectedForCompare([aId, bId]);

    // Stream messages in one by one
    messages.forEach((_, i) => {
      setTimeout(() => setVisibleMessages(i + 1), i * 1400 + 300);
    });
    // Mark rationale as read once the last message appears
    setTimeout(
      () => setHasReadRationale(true),
      (messages.length - 1) * 1400 + 300 + 100,
    );
  }, [agentState, watchingIds]);

  // ── Reset ────────────────────────────────────────────────────────────────────

  function handleDismiss() {
    // "Hear Me Out First" — block dismiss until rationale is fully read
    if (!hasReadRationale) {
      setHmofBlocked(true);
      // Shake the dismiss button
      dismissBtnControls.start({
        x: [0, -6, 6, -5, 5, -3, 3, 0],
        transition: { duration: 0.45, ease: "easeInOut" },
      });
      // Auto-clear the blocked message after a moment
      setTimeout(() => setHmofBlocked(false), 3000);
      return;
    }

    setDismissed(true);
    setAgentState("done");
    setWatchingIds(null);
    setAgentMessages([]);
    setVisibleMessages(0);
    setSelectedForCompare(null);
    setHoverLog([]);
    setHasReadRationale(false);
    setHmofBlocked(false);
    dwellRef.current = 0;
    setTotalDwell(0);
    setTimeout(() => {
      setDismissed(false);
      setAgentState("dormant");
    }, 400);
  }

  function handleRestart() {
    setAgentState("dormant");
    setWatchingIds(null);
    setAgentMessages([]);
    setVisibleMessages(0);
    setSelectedForCompare(null);
    setHoverLog([]);
    setHasReadRationale(false);
    setHmofBlocked(false);
    dwellRef.current = 0;
    setTotalDwell(0);
  }

  // ── Derived ──────────────────────────────────────────────────────────────────

  const isAgentVisible = agentState === "chiming" || agentState === "comparing";
  const compareConceptA = selectedForCompare
    ? mockConcepts.find((c) => c.id === selectedForCompare[0])
    : null;
  const compareConceptB = selectedForCompare
    ? mockConcepts.find((c) => c.id === selectedForCompare[1])
    : null;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <span className="font-display text-base font-semibold tracking-tight">
              Creative Review
            </span>
            <Badge
              variant="outline"
              className="rounded-full border-border text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
            >
              6 concepts
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="#/backlog"
              className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Design Backlog →
            </a>
            {/* Agent status dot */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full transition-colors duration-500",
                  agentState === "dormant" && "bg-border",
                  agentState === "watching" && "animate-pulse bg-amber-400",
                  (agentState === "chiming" || agentState === "comparing") &&
                    hmofBlocked
                    ? "animate-pulse bg-fuego-500"
                    : (agentState === "chiming" ||
                        agentState === "comparing") &&
                        "bg-fuego-500",
                  agentState === "done" && "bg-border",
                )}
              />
              <span>
                {agentState === "dormant" && "Hover concepts to begin"}
                {agentState === "watching" && "Ember is watching…"}
                {(agentState === "chiming" || agentState === "comparing") &&
                  (hmofBlocked
                    ? "Hear me out first"
                    : hasReadRationale
                      ? "Ember chimed in · free to decide"
                      : "Ember chimed in · reading…")}
                {agentState === "done" && "All good"}
              </span>
            </div>

            {(agentState === "chiming" ||
              agentState === "comparing" ||
              agentState === "done") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRestart}
                className="text-xs text-muted-foreground"
              >
                Reset
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 pb-40 pt-8 sm:px-8">
        {/* Instruction hint */}
        <AnimatePresence>
          {agentState === "dormant" && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 text-sm text-muted-foreground"
            >
              Hover over the concepts you're drawn to. If you go back and forth,
              Ember will notice.
            </motion.p>
          )}
        </AnimatePresence>

        {/* Concept grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockConcepts.map((concept) => (
            <ConceptCard
              key={concept.id}
              concept={concept}
              isHovered={hoveredId === concept.id}
              isWatched={watchingIds?.includes(concept.id) ?? false}
              isCompared={selectedForCompare?.includes(concept.id) ?? false}
              hoverCount={hoverLog.find((r) => r.id === concept.id)?.count ?? 0}
              onMouseEnter={() => handleConceptHover(concept.id)}
              onMouseLeave={handleConceptLeave}
            />
          ))}
        </div>
      </main>

      {/* ── Agent chat bar — slides up from the bottom ── */}
      <AnimatePresence>
        {isAgentVisible && !dismissed && (
          <motion.div
            key="agent-bar"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4"
          >
            <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-fuego-500">
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold">Ember</span>
                  <span className="text-xs text-muted-foreground">
                    · chimed in
                  </span>
                </div>
                <motion.button
                  animate={dismissBtnControls}
                  onClick={handleDismiss}
                  className={cn(
                    "rounded-md p-1 transition-colors",
                    hasReadRationale
                      ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                      : "text-muted-foreground/40 cursor-not-allowed",
                  )}
                  aria-label="Dismiss"
                >
                  <X className="h-4 w-4" />
                </motion.button>
              </div>

              {/* "Hear Me Out First" nudge — appears when user tries to close early */}
              <AnimatePresence>
                {hmofBlocked && (
                  <motion.div
                    key="hmof-nudge"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 border-b border-border bg-fuego-50 px-4 py-2.5">
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-fuego-600" />
                      <p className="text-xs text-fuego-700">
                        <strong>Hear me out first.</strong> I'll be done in a
                        second — then you can decide whatever you want.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="space-y-1 px-4 py-3">
                <AnimatePresence initial={false}>
                  {agentMessages.slice(0, visibleMessages).map((msg, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Message>
                        {i === 0 && (
                          <MessageAvatar>
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuego-500 text-[11px] font-bold text-white">
                              AI
                            </div>
                          </MessageAvatar>
                        )}
                        {i > 0 && <div className="w-8 shrink-0" />}
                        <MessageContent>
                          <Bubble variant="secondary">
                            <BubbleContent>
                              <MarkdownText text={msg} />
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Typing indicator */}
                <AnimatePresence>
                  {visibleMessages < agentMessages.length && (
                    <motion.div
                      key="typing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 pl-10"
                    >
                      <div className="flex gap-1 rounded-xl bg-muted px-3 py-2">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50"
                            style={{
                              animation: `bounce 1s ${i * 0.15}s infinite`,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Compare panel — appears after all messages */}
              <AnimatePresence>
                {visibleMessages >= agentMessages.length &&
                  compareConceptA &&
                  compareConceptB && (
                    <motion.div
                      key="compare"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      transition={{ duration: 0.3, delay: 0.2 }}
                    >
                      <Separator />
                      <div className="grid grid-cols-2 divide-x divide-border px-4 py-3">
                        <CompareColumn concept={compareConceptA} side="left" />
                        <CompareColumn concept={compareConceptB} side="right" />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          Pick one to move forward — or keep browsing.
                        </span>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleDismiss}
                          >
                            Still deciding
                          </Button>
                          <Button
                            size="sm"
                            className="bg-fuego-500 text-white hover:bg-fuego-600"
                            onClick={handleDismiss}
                          >
                            Got it, thanks
                            <ChevronRight className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bounce keyframes */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-4px); }
        }
      `}</style>
    </div>
  );
}

// ─── Concept Card ─────────────────────────────────────────────────────────────

function ConceptCard({
  concept,
  isHovered,
  isWatched,
  isCompared,
  hoverCount,
  onMouseEnter,
  onMouseLeave,
}: {
  concept: Concept;
  isHovered: boolean;
  isWatched: boolean;
  isCompared: boolean;
  hoverCount: number;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const accent = colorMap[concept.color] ?? colorMap.fuego;

  return (
    <motion.div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      animate={{
        scale: isHovered ? 1.015 : 1,
        y: isHovered ? -2 : 0,
      }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={cn(
        "relative flex cursor-default flex-col gap-4 rounded-2xl border p-5 transition-shadow duration-200",
        isCompared
          ? cn("border-2", accent.border, accent.bg, "shadow-md")
          : isHovered
            ? "border-border shadow-md bg-card"
            : "border-border bg-card shadow-sm",
      )}
    >
      {/* Watched indicator */}
      <AnimatePresence>
        {isWatched && !isCompared && (
          <motion.div
            key="watch-ring"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[9px] font-bold text-white shadow"
          >
            {hoverCount}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compared indicator */}
      <AnimatePresence>
        {isCompared && (
          <motion.div
            key="compare-ring"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={cn(
              "absolute -top-1.5 -right-1.5 h-3 w-3 rounded-full shadow",
              accent.dot,
            )}
          />
        )}
      </AnimatePresence>

      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div
          className={cn("h-2.5 w-2.5 mt-1 shrink-0 rounded-full", accent.dot)}
        />
        <div className="flex flex-wrap gap-1.5 justify-end">
          <Badge
            variant="outline"
            className="text-[10px] rounded-full text-muted-foreground"
          >
            {boldnessLabel[concept.boldness]}
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] rounded-full text-muted-foreground"
          >
            {effortLabel[concept.effort]}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-base font-semibold leading-tight">
          {concept.title}
        </h2>
        <p className="text-sm font-medium text-muted-foreground leading-snug">
          {concept.logline}
        </p>
      </div>

      <p className="text-sm leading-relaxed text-foreground/80">
        {concept.description}
      </p>

      {/* Footer */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-xs text-muted-foreground italic">
          {concept.medium}
        </span>
        <div className="flex flex-wrap gap-1">
          {concept.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Compare Column ───────────────────────────────────────────────────────────

function CompareColumn({
  concept,
  side,
}: {
  concept: Concept;
  side: "left" | "right";
}) {
  const accent = colorMap[concept.color] ?? colorMap.fuego;
  return (
    <div
      className={cn("flex flex-col gap-1.5", side === "left" ? "pr-4" : "pl-4")}
    >
      <div className="flex items-center gap-2">
        <div className={cn("h-2 w-2 shrink-0 rounded-full", accent.dot)} />
        <span className="text-xs font-semibold truncate">{concept.title}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {boldnessLabel[concept.boldness]}
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
          {effortLabel[concept.effort]}
        </span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
        {concept.logline}
      </p>
    </div>
  );
}

// ─── Markdown-lite renderer (just bold) ───────────────────────────────────────

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i}>{part.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}
