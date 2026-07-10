/**
 * Design Idea Backlog — humorphic patterns for a creative technologist
 *
 * Patterns demonstrated:
 *   Notice      — Ember flags stale high-value ideas proactively on load
 *   Chime In    — Ember detects hover hesitation between two candidates
 *   Hear Me Out — Archiving a high-scored idea requires reading Ember's rationale first
 *
 * Humorphism foundations: Notice · Communicate · Decide · Coach · Consent
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import {
  Sparkles,
  X,
  BookOpen,
  Archive,
  ChevronRight,
  ArrowUpRight,
  Clock,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import { Bubble, BubbleContent } from "@/components/ui/bubble";

import {
  mockDesignIdeas,
  getStaleFlagMessage,
  getArchiveBlockMessage,
  sourceConfig,
  statusConfig,
  type DesignIdea,
  type IdeaStatus,
} from "@/data/mock-design-ideas";
import { cn } from "@/lib/utils";
import DelegatePanel from "@/components/DelegatePanel";
// ─── Types ────────────────────────────────────────────────────────────────────

type AgentMode =
  | "notice" // proactive stale-idea notice on load
  | "chime" // hover-hesitation comparison
  | "hearmeout" // blocking archive of high-scored idea
  | null;

interface HoverRecord {
  id: string;
  count: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const HOVER_THRESHOLD = 3; // distinct cards that must be visited before chime eligible
const MIN_CARD_DWELL_MS = 600; // ms you must stay on a card for that visit to count
const TOTAL_DWELL_MS = 3000; // total qualifying dwell before chime fires
const HIGH_SCORE_THRESHOLD = 4; // Ember score >= this triggers Hear Me Out on archive

// ─── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({
  value,
  max = 5,
  color = "bg-fuego-500",
}: {
  value: number;
  max?: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: max }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-1.5 w-4 rounded-full transition-colors",
            i < value ? color : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

// ─── MarkdownText ──────────────────────────────────────────────────────────────

function MarkdownText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span>
      {parts.map((p, i) =>
        p.startsWith("**") && p.endsWith("**") ? (
          <strong key={i}>{p.slice(2, -2)}</strong>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </span>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DesignBacklog() {
  const [ideas, setIdeas] = useState<DesignIdea[]>(mockDesignIdeas);
  const [activeTab, setActiveTab] = useState<IdeaStatus | "all">("all");

  // Agent state
  const [agentMode, setAgentMode] = useState<AgentMode>(null);
  const [agentMessages, setAgentMessages] = useState<string[]>([]);
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [agentIdeaIds, setAgentIdeaIds] = useState<string[]>([]);

  // Notice (stale ideas on load)
  const [noticeIdeas, setNoticeIdeas] = useState<DesignIdea[]>([]);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  // Chime In (hover hesitation)
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [, setHoverLog] = useState<HoverRecord[]>([]);
  // Per-card dwell: resets each time you enter a new card
  const cardDwellRef = useRef<number>(0);
  // Total qualifying dwell: accumulates only when a card session lasted >= MIN_CARD_DWELL_MS
  const totalQualifyingDwellRef = useRef<number>(0);
  const dwellTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Scroll guard: suppresses hover events fired during active scroll
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hear Me Out (archive gate)
  const [hmofIdeaId, setHmofIdeaId] = useState<string | null>(null);
  const [hasReadRationale, setHasReadRationale] = useState(false);
  const [hmofBlocked, setHmofBlocked] = useState(false);
  const dismissControls = useAnimation();

  // Delegate panel
  const [delegateIdeaId, setDelegateIdeaId] = useState<string | null>(null);
  const delegateIdea = delegateIdeaId
    ? (ideas.find((i) => i.id === delegateIdeaId) ?? null)
    : null;

  // ── On mount: Notice pattern — flag stale high-value candidates ────────────
  // We don't fire immediately. We wait until the user shows intent (first scroll
  // or first card hover) before Ember leans in. A good teammate waits for you
  // to settle before interrupting.
  const noticeReadyRef = useRef(false);
  const noticeFiredRef = useRef(false);

  useEffect(() => {
    const stale = ideas.filter(
      (i) =>
        i.status === "candidate" &&
        i.emberScore >= HIGH_SCORE_THRESHOLD &&
        i.lastTouchedDaysAgo >= 5,
    );
    if (stale.length > 0) {
      setNoticeIdeas(stale);
      noticeReadyRef.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function maybeFireNotice() {
    if (!noticeReadyRef.current || noticeFiredRef.current) return;
    noticeFiredRef.current = true;
    // Small delay so it doesn't fire on the very first scroll tick
    setTimeout(() => setAgentMode("notice"), 800);
  }

  // ── Stream agent messages whenever mode or source idea changes ─────────────
  useEffect(() => {
    if (!agentMode || agentMessages.length > 0) return;
    if (agentMode === "notice") {
      const msgs = noticeIdeas.map((i) => getStaleFlagMessage(i));
      streamMessages(msgs);
      setAgentIdeaIds(noticeIdeas.map((i) => i.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentMode]);

  function streamMessages(msgs: string[]) {
    setAgentMessages(msgs);
    setVisibleMessages(0);
    setHasReadRationale(false);
    msgs.forEach((_, i) => {
      setTimeout(() => setVisibleMessages(i + 1), i * 1300 + 400);
    });
    setTimeout(() => setHasReadRationale(true), (msgs.length - 1) * 1300 + 500);
  }

  // ── Scroll guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    function onScroll() {
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 150);
      // First scroll = user has settled in; safe to fire Notice if pending
      maybeFireNotice();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Dwell tracking ─────────────────────────────────────────────────────────
  // Starts a fresh per-card timer. Does NOT reset cardDwellRef here —
  // stopDwell does that after committing the previous session.
  const startDwell = useCallback(() => {
    if (dwellTimerRef.current) clearInterval(dwellTimerRef.current);
    dwellTimerRef.current = setInterval(() => {
      cardDwellRef.current += 100;
    }, 100);
  }, []);

  // Commits qualifying dwell to the running total, then resets for the next card.
  const stopDwell = useCallback(() => {
    if (dwellTimerRef.current) {
      clearInterval(dwellTimerRef.current);
      dwellTimerRef.current = null;
    }
    if (cardDwellRef.current >= MIN_CARD_DWELL_MS) {
      totalQualifyingDwellRef.current += cardDwellRef.current;
    }
    cardDwellRef.current = 0; // reset AFTER committing
  }, []);

  useEffect(() => () => stopDwell(), [stopDwell]);

  // ── Hover detection (Chime In) ─────────────────────────────────────────────
  const handleHover = useCallback(
    (id: string) => {
      // Ignore if agent is already active or if this fired during a scroll
      if (agentMode === "chime" || agentMode === "hearmeout") return;
      if (isScrollingRef.current) return;

      // First deliberate hover = user has engaged; fire Notice if pending
      maybeFireNotice();

      setHoveredId(id);
      cardDwellRef.current = 0; // start fresh for this card
      startDwell();

      setHoverLog((prev) => {
        const existing = prev.find((r) => r.id === id);
        const updated = existing
          ? prev.map((r) => (r.id === id ? { ...r, count: r.count + 1 } : r))
          : [...prev, { id, count: 1 }];
        const top2 = [...updated].sort((a, b) => b.count - a.count).slice(0, 2);
        // Include current in-progress card dwell (not yet committed by stopDwell)
        const effectiveDwell =
          totalQualifyingDwellRef.current +
          (cardDwellRef.current >= MIN_CARD_DWELL_MS
            ? cardDwellRef.current
            : 0);
        if (
          top2.length === 2 &&
          top2[0].count >= HOVER_THRESHOLD &&
          top2[1].count >= 2 &&
          effectiveDwell >= TOTAL_DWELL_MS &&
          agentMode === null
        ) {
          const a = ideas.find((i) => i.id === top2[0].id)!;
          const b = ideas.find((i) => i.id === top2[1].id)!;
          setAgentIdeaIds([a.id, b.id]);
          setAgentMode("chime");
          streamMessages(getChimeMessages(a, b));
        }
        return updated;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [agentMode, ideas, startDwell],
  );

  const handleLeave = useCallback(() => {
    setHoveredId(null);
    stopDwell(); // commits qualifying dwell to the total
  }, [stopDwell]);

  // ── Archive action (Hear Me Out First) ─────────────────────────────────────
  function handleArchiveAttempt(idea: DesignIdea) {
    if (idea.emberScore >= HIGH_SCORE_THRESHOLD) {
      // Gate — must hear rationale first
      setHmofIdeaId(idea.id);
      setAgentMode("hearmeout");
      setAgentMessages([]);
      setVisibleMessages(0);
      setHasReadRationale(false);
      setHmofBlocked(false);
      streamMessages(getArchiveBlockMessage(idea));
      setAgentIdeaIds([idea.id]);
    } else {
      // Low-scored idea — archive immediately, no gate
      commitArchive(idea.id);
    }
  }

  function commitArchive(id: string) {
    setIdeas((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "archived" } : i)),
    );
    dismissAgent();
  }

  function handleDismissAttempt() {
    if (!hasReadRationale && agentMode !== "notice") {
      setHmofBlocked(true);
      dismissControls.start({
        x: [0, -6, 6, -5, 5, -3, 3, 0],
        transition: { duration: 0.45 },
      });
      setTimeout(() => setHmofBlocked(false), 3000);
      return;
    }
    dismissAgent();
  }

  function dismissAgent() {
    setAgentMode(null);
    setAgentMessages([]);
    setVisibleMessages(0);
    setHmofIdeaId(null);
    setHasReadRationale(false);
    setHmofBlocked(false);
    setHoverLog([]);
    cardDwellRef.current = 0;
    totalQualifyingDwellRef.current = 0;
    noticeFiredRef.current = true; // don't re-fire notice after explicit dismiss
    if (!noticeDismissed) setNoticeDismissed(true);
  }

  function handleArchiveConfirm() {
    if (hmofIdeaId) commitArchive(hmofIdeaId);
    else dismissAgent();
  }

  function handleStatusChange(id: string, status: IdeaStatus) {
    setIdeas((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)));
  }

  function handleDelegated(id: string) {
    setIdeas((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "prototyping" } : i)),
    );
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const filtered =
    activeTab === "all"
      ? ideas.filter((i) => i.status !== "archived")
      : ideas.filter((i) => i.status === activeTab);

  const tabs: { key: IdeaStatus | "all"; label: string; count: number }[] = [
    {
      key: "all",
      label: "All",
      count: ideas.filter((i) => i.status !== "archived").length,
    },
    {
      key: "candidate",
      label: "Candidates",
      count: ideas.filter((i) => i.status === "candidate").length,
    },
    {
      key: "prototyping",
      label: "Prototyping",
      count: ideas.filter((i) => i.status === "prototyping").length,
    },
    {
      key: "shipped",
      label: "Shipped",
      count: ideas.filter((i) => i.status === "shipped").length,
    },
    {
      key: "archived",
      label: "Archived",
      count: ideas.filter((i) => i.status === "archived").length,
    },
  ];

  const isAgentOpen = agentMode !== null;
  const hmofIdea = hmofIdeaId ? ideas.find((i) => i.id === hmofIdeaId) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider>
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur-sm">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-4 sm:px-8">
            <div className="flex items-center gap-3">
              <a
                href="#/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Creative Review
              </a>
              <span className="text-border">·</span>
              <span className="font-display text-base font-semibold tracking-tight">
                Design Backlog
              </span>
              <Badge
                variant="outline"
                className="rounded-full text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                {ideas.filter((i) => i.status !== "archived").length} ideas
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span
                className={cn(
                  "inline-block h-2 w-2 rounded-full transition-colors duration-500",
                  agentMode === null && "bg-border",
                  agentMode === "notice" && "animate-pulse bg-amber-400",
                  agentMode === "chime" && "bg-fuego-500",
                  agentMode === "hearmeout" && "animate-pulse bg-fuego-500",
                )}
              />
              <span>
                {agentMode === null && "Ember is watching"}
                {agentMode === "notice" && "Ember noticed something"}
                {agentMode === "chime" &&
                  (hasReadRationale
                    ? "Ember chimed in · free to decide"
                    : "Ember chimed in · reading…")}
                {agentMode === "hearmeout" &&
                  (hmofBlocked
                    ? "Hear me out first"
                    : "Ember has thoughts on this")}
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-6 pb-48 pt-6 sm:px-8">
          {/* Tabs */}
          <div className="mb-6 flex flex-wrap gap-1 border-b border-border pb-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    activeTab === tab.key
                      ? "bg-white/20 text-white"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Idea list */}
          <div className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {filtered.map((idea) => (
                <IdeaRow
                  key={idea.id}
                  idea={idea}
                  isHovered={hoveredId === idea.id}
                  isHighlighted={agentIdeaIds.includes(idea.id)}
                  onMouseEnter={() => handleHover(idea.id)}
                  onMouseLeave={handleLeave}
                  onArchive={() => handleArchiveAttempt(idea)}
                  onStatusChange={(s) => handleStatusChange(idea.id, s)}
                  onDelegate={() => setDelegateIdeaId(idea.id)}
                />
              ))}
            </AnimatePresence>

            {filtered.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-center text-muted-foreground">
                <span className="text-3xl">◎</span>
                <p className="text-sm">Nothing here yet.</p>
              </div>
            )}
          </div>
        </main>

        {/* ── Agent bar ── */}
        <AnimatePresence>
          {isAgentOpen && (
            <motion.div
              key="agent-bar"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 32 }}
              className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4"
            >
              <div className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
                <AgentBar
                  mode={agentMode}
                  messages={agentMessages}
                  visibleMessages={visibleMessages}
                  hasReadRationale={hasReadRationale}
                  hmofBlocked={hmofBlocked}
                  hmofIdea={hmofIdea}
                  dismissControls={dismissControls}
                  onDismiss={handleDismissAttempt}
                  onArchiveConfirm={handleArchiveConfirm}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <style>{`
          @keyframes bounce {
            0%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-4px); }
          }
        `}</style>
      </div>

      {/* ── Delegate panel ── */}
      <AnimatePresence>
        {delegateIdea && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setDelegateIdeaId(null)}
            />
            <DelegatePanel
              idea={delegateIdea}
              onClose={() => setDelegateIdeaId(null)}
              onDelegated={handleDelegated}
            />
          </>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}

// ─── Idea Row ─────────────────────────────────────────────────────────────────

function IdeaRow({
  idea,
  isHovered,
  isHighlighted,
  onMouseEnter,
  onMouseLeave,
  onArchive,
  onStatusChange,
  onDelegate,
}: {
  idea: DesignIdea;
  isHovered: boolean;
  isHighlighted: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onArchive: () => void;
  onStatusChange: (s: IdeaStatus) => void;
  onDelegate: () => void;
}) {
  const src = sourceConfig[idea.source];
  const stat = statusConfig[idea.status];
  const isArchived = idea.status === "archived";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        "group relative rounded-2xl border bg-card p-5 transition-shadow duration-200",
        isHighlighted
          ? "border-fuego-300 shadow-md ring-1 ring-fuego-200"
          : isHovered
            ? "border-border shadow-md"
            : "border-border shadow-sm",
        isArchived && "opacity-60",
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        {/* Ember score column */}
        <div className="flex shrink-0 flex-col items-center gap-1 sm:w-10">
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                  idea.emberScore >= 5
                    ? "bg-fuego-500 text-white"
                    : idea.emberScore >= 4
                      ? "bg-fuego-100 text-fuego-700"
                      : idea.emberScore >= 3
                        ? "bg-amber-100 text-amber-700"
                        : "bg-muted text-muted-foreground",
                )}
              >
                {idea.emberScore}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p className="max-w-48 text-xs">{idea.emberRationale}</p>
            </TooltipContent>
          </Tooltip>
          {idea.emberFlagged && <Sparkles className="h-3 w-3 text-fuego-500" />}
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-start gap-2">
            <h3 className="font-display text-sm font-semibold leading-tight">
              {idea.title}
            </h3>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                src.color,
              )}
            >
              {src.icon} {src.label}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                stat.color,
              )}
            >
              {stat.label}
            </span>
            {idea.lastTouchedDaysAgo >= 14 && idea.status === "candidate" && (
              <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                <Clock className="h-2.5 w-2.5" />
                {idea.lastTouchedDaysAgo}d untouched
              </span>
            )}
          </div>

          <p className="mb-3 text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {idea.description}
          </p>

          {/* Dimension bars */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-4">
            {(
              [
                ["Usability", idea.usabilityImpact, "bg-fuego-400"],
                ["Feasibility", idea.feasibility, "bg-emerald-400"],
                ["Ease", idea.prototypeEase, "bg-blue-400"],
                ["Complexity", 6 - idea.complexity, "bg-amber-400"],
              ] as [string, number, string][]
            ).map(([label, val, color]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">
                  {label}
                </span>
                <ScoreBar value={val} color={color} />
              </div>
            ))}
          </div>
        </div>

        {/* Right column — proposer + actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-1.5">
            <Avatar size="sm">
              <AvatarFallback className="text-[9px]">
                {idea.proposedBy.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[11px] text-muted-foreground">
              {idea.proposedBy}
            </span>
          </div>

          <div className="flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            {idea.status === "candidate" && (
              <Button
                size="xs"
                variant="outline"
                onClick={onDelegate}
                className="gap-1 text-[10px]"
              >
                <Zap className="h-2.5 w-2.5" />
                Delegate to Ember
              </Button>
            )}
            {idea.status === "prototyping" && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => onStatusChange("shipped")}
                className="gap-1 text-[10px]"
              >
                <ArrowUpRight className="h-2.5 w-2.5" />
                Ship
              </Button>
            )}
            {idea.status !== "archived" && (
              <Button
                size="xs"
                variant="ghost"
                onClick={onArchive}
                className="gap-1 text-[10px] text-muted-foreground hover:text-destructive"
              >
                <Archive className="h-2.5 w-2.5" />
                Archive
              </Button>
            )}
          </div>

          {idea.sourceRef && (
            <span className="max-w-32 truncate text-[10px] text-muted-foreground italic">
              {idea.sourceRef}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Agent Bar ────────────────────────────────────────────────────────────────

function AgentBar({
  mode,
  messages,
  visibleMessages,
  hasReadRationale,
  hmofBlocked,
  dismissControls,
  onDismiss,
  onArchiveConfirm,
}: {
  mode: AgentMode;
  messages: string[];
  visibleMessages: number;
  hasReadRationale: boolean;
  hmofBlocked: boolean;
  hmofIdea: DesignIdea | null | undefined;
  dismissControls: ReturnType<typeof useAnimation>;
  onDismiss: () => void;
  onArchiveConfirm: () => void;
}) {
  const modeLabel =
    mode === "notice"
      ? "noticed something"
      : mode === "chime"
        ? "chimed in"
        : mode === "hearmeout"
          ? "has thoughts on this"
          : "";

  const canDismiss = hasReadRationale || mode === "notice";

  return (
    <>
      {/* Bar header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-fuego-500">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold">Ember</span>
          <span className="text-xs text-muted-foreground">· {modeLabel}</span>
        </div>
        <motion.button
          animate={dismissControls}
          onClick={onDismiss}
          aria-label="Dismiss"
          className={cn(
            "rounded-md p-1 transition-colors",
            canDismiss
              ? "text-muted-foreground hover:bg-muted hover:text-foreground"
              : "cursor-not-allowed text-muted-foreground/30",
          )}
        >
          <X className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Hear Me Out nudge */}
      <AnimatePresence>
        {hmofBlocked && (
          <motion.div
            key="nudge"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 border-b border-border bg-fuego-50 px-4 py-2.5">
              <BookOpen className="h-3.5 w-3.5 shrink-0 text-fuego-600" />
              <p className="text-xs text-fuego-700">
                <strong>Hear me out first.</strong> I scored this idea highly —
                just give me a second.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="space-y-1 px-4 py-3">
        <AnimatePresence initial={false}>
          {messages.slice(0, visibleMessages).map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <Message>
                {i === 0 ? (
                  <MessageAvatar>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-fuego-500 text-[11px] font-bold text-white">
                      AI
                    </div>
                  </MessageAvatar>
                ) : (
                  <div className="w-8 shrink-0" />
                )}
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
          {visibleMessages < messages.length && (
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
                    style={{ animation: `bounce 1s ${i * 0.15}s infinite` }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer actions — only shown after all messages visible */}
      <AnimatePresence>
        {hasReadRationale && (
          <motion.div
            key="footer"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.25, delay: 0.1 }}
            className="overflow-hidden"
          >
            <Separator />
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-xs text-muted-foreground">
                {mode === "hearmeout"
                  ? "Still want to archive it? Up to you."
                  : "Got it — head back to the list."}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onDismiss}>
                  {mode === "hearmeout" ? "Keep it" : "Thanks, Ember"}
                </Button>
                {mode === "hearmeout" && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1.5"
                    onClick={onArchiveConfirm}
                  >
                    <Archive className="h-3.5 w-3.5" />
                    Archive anyway
                  </Button>
                )}
                {mode === "chime" && (
                  <Button
                    size="sm"
                    className="bg-fuego-500 text-white hover:bg-fuego-600"
                    onClick={onDismiss}
                  >
                    Got it
                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Chime In messages for two competing ideas ────────────────────────────────

function getChimeMessages(a: DesignIdea, b: DesignIdea): string[] {
  const winner = a.emberScore >= b.emberScore ? a : b;
  const loser = winner.id === a.id ? b : a;
  return [
    `I noticed you going back and forth between **${a.title}** and **${b.title}**. Want me to help break the tie?`,
    `**${a.title}**: Ember score ${a.emberScore}/5 — ${a.emberRationale}`,
    `**${b.title}**: Ember score ${b.emberScore}/5 — ${b.emberRationale}`,
    `My read: go with **${winner.title}**. ${winner.prototypeEase >= 4 ? "It's easy to prototype and" : "It's more complex, but"} the usability payoff is ${winner.usabilityImpact >= 4 ? "significant" : "solid"}. **${loser.title}** can wait.`,
  ];
}
