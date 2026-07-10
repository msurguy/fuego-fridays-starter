/**
 * DelegatePanel — "Here You Do It" flow for prototyping a design idea
 *
 * Three-act sequence:
 *   Act 1  Align      "Just Need Your Input" — Ember drafts a plan with shimmering
 *                      uncertain fields. You fill in constraints, shimmer settles.
 *   Act 2  Consent    Ember surfaces the full plan for approval before acting.
 *   Act 3  Execute    Live step-by-step execution log.
 *   Act 4  Communicate "What Would They Think?" — pick recipients, Ember tailors
 *                      the brief for each audience.
 *
 * Humorphism foundations: Align · Delegate · Execute · Consent · Communicate
 */

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Sparkles,
  ChevronRight,
  Check,
  Circle,
  Loader,
  Users,
  Send,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { type DesignIdea } from "@/data/mock-design-ideas";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type PanelAct = "align" | "consent" | "execute" | "share" | "done";

export interface Constraints {
  fidelity: "lo-fi" | "hi-fi" | "";
  platform: "web" | "mobile" | "both" | "";
  techStack: string;
  deadline: string;
  avoidNotes: string;
}

interface Recipient {
  id: string;
  name: string;
  role: string;
  initials: string;
  audienceFrame: string; // how Ember reframes the brief for them
}

// ─── Static data ──────────────────────────────────────────────────────────────

const RECIPIENTS: Recipient[] = [
  {
    id: "priya",
    name: "Priya",
    role: "Product Manager",
    initials: "PR",
    audienceFrame:
      "Focused on user outcomes, timeline, and how this maps to roadmap priorities. Lead with the usability impact and estimated effort.",
  },
  {
    id: "marcus",
    name: "Marcus",
    role: "Engineer",
    initials: "MA",
    audienceFrame:
      "Wants to know tech constraints, integration points, and what's actually being handed off. Lead with the stack, scope boundaries, and open questions.",
  },
  {
    id: "dana",
    name: "Dana",
    role: "Design Lead",
    initials: "DA",
    audienceFrame:
      "Cares about design fidelity, interaction details, and alignment with the system. Lead with the prototype approach and any design decisions made.",
  },
  {
    id: "client",
    name: "Client",
    role: "Stakeholder",
    initials: "CL",
    audienceFrame:
      "Non-technical. Needs to understand what the prototype demonstrates and what feedback is being asked for. Lead with the problem being solved.",
  },
];

const EXECUTE_STEPS = [
  "Reading idea brief and constraints",
  "Scaffolding prototype structure",
  "Wiring core interaction logic",
  "Applying visual fidelity layer",
  "Running interaction smoke test",
  "Generating shareable prototype link",
];

// ─── Shimmer field ────────────────────────────────────────────────────────────

function ShimmerField({
  label,
  value,
  placeholder,
  settled,
  children,
}: {
  label: string;
  value: string;
  placeholder: string;
  settled: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {!settled && (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <AlertCircle className="h-3 w-3 text-amber-500" />
            needs your input
          </span>
        )}
        {settled && (
          <span className="flex items-center gap-1 text-[10px] text-emerald-600">
            <Check className="h-3 w-3" />
            set
          </span>
        )}
      </div>
      <div
        className={cn(
          "rounded-lg border transition-all duration-500",
          !settled && !value
            ? "fuego-shimmer animate-[shimmer_2s_linear_infinite] border-amber-200"
            : "border-border bg-background",
        )}
      >
        {children}
      </div>
      {!settled && !value && (
        <p className="text-[10px] italic text-muted-foreground">
          {placeholder}
        </p>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function DelegatePanel({
  idea,
  onClose,
  onDelegated,
}: {
  idea: DesignIdea;
  onClose: () => void;
  onDelegated: (id: string) => void;
}) {
  const [act, setAct] = useState<PanelAct>("align");
  const [constraints, setConstraints] = useState<Constraints>({
    fidelity: "",
    platform: "",
    techStack: "",
    deadline: "",
    avoidNotes: "",
  });
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [activeRecipient, setActiveRecipient] = useState<string | null>(null);
  const [executeStep, setExecuteStep] = useState(0);
  const [executeDone, setExecuteDone] = useState(false);
  const [cutInShown, setCutInShown] = useState(false);
  const cutInTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // "Sorry To Cut In" — fires when enough constraints are filled
  const filledCount = Object.values(constraints).filter(Boolean).length;
  useEffect(() => {
    if (cutInShown || act !== "align") return;
    if (filledCount >= 2) {
      cutInTimerRef.current = setTimeout(() => setCutInShown(true), 600);
    }
    return () => {
      if (cutInTimerRef.current) clearTimeout(cutInTimerRef.current);
    };
  }, [filledCount, act, cutInShown]);

  // Execute step runner
  useEffect(() => {
    if (act !== "execute") return;
    if (executeStep >= EXECUTE_STEPS.length) {
      setTimeout(() => setExecuteDone(true), 400);
      return;
    }
    const t = setTimeout(
      () => setExecuteStep((s) => s + 1),
      900 + Math.random() * 400,
    );
    return () => clearTimeout(t);
  }, [act, executeStep]);

  function handleSetConstraint<K extends keyof Constraints>(
    key: K,
    val: Constraints[K],
  ) {
    setConstraints((prev) => ({ ...prev, [key]: val }));
  }

  function allConstraintsMet() {
    return constraints.fidelity && constraints.platform;
  }

  function handleProceedToConsent() {
    setAct("consent");
  }

  function handleApproveAndRun() {
    setAct("execute");
    setExecuteStep(0);
    setExecuteDone(false);
  }

  function handleProceedToShare() {
    onDelegated(idea.id);
    setAct("share");
  }

  function toggleRecipient(id: string) {
    setSelectedRecipients((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id],
    );
    setActiveRecipient(id);
  }

  const activeRecipientData = RECIPIENTS.find((r) => r.id === activeRecipient);

  return (
    <motion.div
      key="delegate-panel"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 34 }}
      className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-background shadow-2xl"
    >
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-fuego-500">
            <Sparkles className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">
              Delegate to Ember
            </p>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              {idea.title}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 border-b border-border">
        {(["align", "consent", "execute", "share"] as PanelAct[]).map(
          (step, i) => {
            const steps: PanelAct[] = ["align", "consent", "execute", "share"];
            const currentIdx = steps.indexOf(act === "done" ? "share" : act);
            const stepIdx = i;
            const isActive = stepIdx === currentIdx;
            const isDone = stepIdx < currentIdx;
            const labels = ["Align", "Consent", "Execute", "Share"];
            return (
              <div
                key={step}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium transition-colors",
                  isActive
                    ? "border-b-2 border-fuego-500 text-fuego-600"
                    : isDone
                      ? "text-emerald-600"
                      : "text-muted-foreground",
                )}
              >
                {isDone ? <Check className="h-3 w-3" /> : <span>{i + 1}</span>}
                {labels[i]}
              </div>
            );
          },
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          {/* ── ACT 1: ALIGN ──────────────────────────────────────────────── */}
          {act === "align" && (
            <motion.div
              key="align"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <p className="mb-1 text-sm font-semibold">Prototype plan</p>
              <p className="mb-4 text-xs text-muted-foreground">
                I've drafted what I know. The fields I'm guessing about are
                marked — fill them in and the plan locks in.
              </p>

              {/* "Sorry To Cut In" nudge */}
              <AnimatePresence>
                {cutInShown && !allConstraintsMet() && (
                  <motion.div
                    key="cutin"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mb-4 overflow-hidden"
                  >
                    <div className="flex items-start gap-2 rounded-xl border border-fuego-200 bg-fuego-50 p-3">
                      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-fuego-500" />
                      <p className="text-xs text-fuego-700">
                        <strong>Sorry to cut in</strong> — I think I have most
                        of this. I just need <strong>fidelity</strong> and{" "}
                        <strong>platform</strong> to proceed.
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex flex-col gap-4">
                {/* Fidelity */}
                <ShimmerField
                  label="Fidelity"
                  value={constraints.fidelity}
                  placeholder="Ember will guess hi-fi — is that right?"
                  settled={!!constraints.fidelity}
                >
                  <div className="flex gap-0">
                    {(["lo-fi", "hi-fi"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => handleSetConstraint("fidelity", v)}
                        className={cn(
                          "flex-1 px-3 py-2 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg",
                          constraints.fidelity === v
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </ShimmerField>

                {/* Platform */}
                <ShimmerField
                  label="Platform"
                  value={constraints.platform}
                  placeholder="I'll default to web — override if needed."
                  settled={!!constraints.platform}
                >
                  <div className="flex gap-0">
                    {(["web", "mobile", "both"] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => handleSetConstraint("platform", v)}
                        className={cn(
                          "flex-1 px-3 py-2 text-xs font-medium transition-colors first:rounded-l-lg last:rounded-r-lg",
                          constraints.platform === v
                            ? "bg-primary text-primary-foreground"
                            : "bg-background text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </ShimmerField>

                {/* Tech stack */}
                <ShimmerField
                  label="Tech stack"
                  value={constraints.techStack}
                  placeholder="Assuming React + Tailwind — correct this if needed."
                  settled={!!constraints.techStack}
                >
                  <input
                    type="text"
                    value={constraints.techStack}
                    onChange={(e) =>
                      handleSetConstraint("techStack", e.target.value)
                    }
                    placeholder="e.g. React, Framer, plain HTML…"
                    className="w-full rounded-lg bg-transparent px-3 py-2 text-xs outline-none placeholder:text-muted-foreground"
                  />
                </ShimmerField>

                {/* Deadline */}
                <ShimmerField
                  label="Deadline"
                  value={constraints.deadline}
                  placeholder="No deadline set — add one if time-sensitive."
                  settled={!!constraints.deadline}
                >
                  <input
                    type="text"
                    value={constraints.deadline}
                    onChange={(e) =>
                      handleSetConstraint("deadline", e.target.value)
                    }
                    placeholder="e.g. EOW, July 18, next sprint…"
                    className="w-full rounded-lg bg-transparent px-3 py-2 text-xs outline-none placeholder:text-muted-foreground"
                  />
                </ShimmerField>

                {/* Avoid */}
                <ShimmerField
                  label="Avoid / constraints"
                  value={constraints.avoidNotes}
                  placeholder="Nothing flagged — add anything off-limits."
                  settled={!!constraints.avoidNotes}
                >
                  <textarea
                    value={constraints.avoidNotes}
                    onChange={(e) =>
                      handleSetConstraint("avoidNotes", e.target.value)
                    }
                    placeholder="e.g. No third-party libraries, keep it static, avoid animations…"
                    rows={2}
                    className="w-full resize-none rounded-lg bg-transparent px-3 py-2 text-xs outline-none placeholder:text-muted-foreground"
                  />
                </ShimmerField>
              </div>
            </motion.div>
          )}

          {/* ── ACT 2: CONSENT ────────────────────────────────────────────── */}
          {act === "consent" && (
            <motion.div
              key="consent"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <p className="mb-1 text-sm font-semibold">Before I start</p>
              <p className="mb-4 text-xs text-muted-foreground">
                Here's exactly what I'm going to do. Say go and I'll run it — or
                go back to adjust anything.
              </p>

              <div className="rounded-xl border border-border bg-secondary/40 p-4 text-xs leading-relaxed space-y-3">
                <div>
                  <span className="font-semibold text-foreground">Idea: </span>
                  <span className="text-muted-foreground">{idea.title}</span>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="font-medium text-foreground">
                      Fidelity
                    </span>
                    <p className="text-muted-foreground">
                      {constraints.fidelity || "hi-fi (default)"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Platform
                    </span>
                    <p className="text-muted-foreground">
                      {constraints.platform || "web (default)"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">Stack</span>
                    <p className="text-muted-foreground">
                      {constraints.techStack || "React + Tailwind (default)"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-foreground">
                      Deadline
                    </span>
                    <p className="text-muted-foreground">
                      {constraints.deadline || "None"}
                    </p>
                  </div>
                </div>
                {constraints.avoidNotes && (
                  <>
                    <Separator />
                    <div>
                      <span className="font-medium text-foreground">
                        Avoid:{" "}
                      </span>
                      <span className="text-muted-foreground">
                        {constraints.avoidNotes}
                      </span>
                    </div>
                  </>
                )}
                <Separator />
                <div>
                  <span className="font-semibold text-foreground">Steps: </span>
                  <span className="text-muted-foreground">
                    {EXECUTE_STEPS.length} tasks · estimated ~
                    {idea.prototypeEase >= 4 ? "15" : "45"} min
                  </span>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <strong>This is a simulated prototype.</strong> Ember will run
                through the steps and produce a shareable brief — no real code
                will be written in this demo.
              </div>
            </motion.div>
          )}

          {/* ── ACT 3: EXECUTE ────────────────────────────────────────────── */}
          {act === "execute" && (
            <motion.div
              key="execute"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <p className="mb-1 text-sm font-semibold">Running prototype</p>
              <p className="mb-4 text-xs text-muted-foreground">
                I'm working through it now. You can keep going — I'll let you
                know when it's ready to share.
              </p>

              <div className="flex flex-col gap-2">
                {EXECUTE_STEPS.map((step, i) => {
                  const isDone = i < executeStep;
                  const isActive = i === executeStep && !executeDone;
                  return (
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: isDone || isActive ? 1 : 0.35, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3"
                    >
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                        {isDone ? (
                          <Check className="h-4 w-4 text-emerald-500" />
                        ) : isActive ? (
                          <Loader className="h-4 w-4 animate-spin text-fuego-500" />
                        ) : (
                          <Circle className="h-4 w-4 text-border" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs",
                          isDone
                            ? "text-foreground"
                            : isActive
                              ? "font-medium text-foreground"
                              : "text-muted-foreground",
                        )}
                      >
                        {step}
                      </span>
                    </motion.div>
                  );
                })}
              </div>

              <AnimatePresence>
                {executeDone && (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Check className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-semibold text-emerald-800">
                        Prototype ready
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700">
                      <strong>{idea.title}</strong> —{" "}
                      {constraints.fidelity || "hi-fi"} prototype for{" "}
                      {constraints.platform || "web"}. Ready to share.
                    </p>
                    <div className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-[11px] font-mono text-emerald-800">
                      prototype.ember/{idea.id}/v1
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ── ACT 4: SHARE ──────────────────────────────────────────────── */}
          {act === "share" && (
            <motion.div
              key="share"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <div className="mb-1 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold">Who should see this?</p>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Pick who to share with. I'll tailor the brief for each audience
                — a PM gets a different framing than an engineer.
              </p>

              <div className="flex flex-col gap-2 mb-5">
                {RECIPIENTS.map((r) => {
                  const selected = selectedRecipients.includes(r.id);
                  return (
                    <button
                      key={r.id}
                      onClick={() => toggleRecipient(r.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                        selected
                          ? "border-fuego-300 bg-fuego-50 ring-1 ring-fuego-200"
                          : "border-border bg-card hover:border-border hover:bg-muted/50",
                      )}
                    >
                      <Avatar size="sm">
                        <AvatarFallback
                          className={cn(
                            "text-[10px]",
                            selected ? "bg-fuego-200 text-fuego-800" : "",
                          )}
                        >
                          {r.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold">{r.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {r.role}
                        </p>
                      </div>
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                          selected
                            ? "border-fuego-500 bg-fuego-500"
                            : "border-border",
                        )}
                      >
                        {selected && <Check className="h-3 w-3 text-white" />}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* "What Would They Think?" — audience reframe */}
              <AnimatePresence>
                {activeRecipientData &&
                  selectedRecipients.includes(activeRecipientData.id) && (
                    <motion.div
                      key={activeRecipientData.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="rounded-xl border border-border bg-secondary/40 p-4"
                    >
                      <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        <Sparkles className="h-3 w-3 text-fuego-500" />
                        Brief tailored for {activeRecipientData.name} (
                        {activeRecipientData.role})
                      </div>
                      <p className="text-xs font-semibold mb-1">{idea.title}</p>
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {activeRecipientData.audienceFrame}
                      </p>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="font-medium text-foreground">
                            Fidelity:{" "}
                          </span>
                          <span className="text-muted-foreground">
                            {constraints.fidelity || "hi-fi"}
                          </span>
                        </div>
                        <div>
                          <span className="font-medium text-foreground">
                            Platform:{" "}
                          </span>
                          <span className="text-muted-foreground">
                            {constraints.platform || "web"}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer actions */}
      <div className="border-t border-border bg-background p-4">
        {act === "align" && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              {allConstraintsMet()
                ? "Constraints set — ready to proceed."
                : "Fill in at least fidelity and platform to continue."}
            </p>
            <Button
              size="sm"
              disabled={!allConstraintsMet()}
              onClick={handleProceedToConsent}
              className="shrink-0 gap-1.5 bg-fuego-500 text-white hover:bg-fuego-600 disabled:opacity-40"
            >
              Review plan
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {act === "consent" && (
          <div className="flex items-center justify-between gap-3">
            <Button size="sm" variant="outline" onClick={() => setAct("align")}>
              ← Go back
            </Button>
            <Button
              size="sm"
              onClick={handleApproveAndRun}
              className="gap-1.5 bg-fuego-500 text-white hover:bg-fuego-600"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Go — run it
            </Button>
          </div>
        )}

        {act === "execute" && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              {executeDone ? "Done — ready to share." : "Working…"}
            </p>
            <Button
              size="sm"
              disabled={!executeDone}
              onClick={handleProceedToShare}
              className="shrink-0 gap-1.5 bg-fuego-500 text-white hover:bg-fuego-600 disabled:opacity-40"
            >
              <Users className="h-3.5 w-3.5" />
              Share
            </Button>
          </div>
        )}

        {act === "share" && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              {selectedRecipients.length > 0
                ? `${selectedRecipients.length} recipient${selectedRecipients.length > 1 ? "s" : ""} selected.`
                : "Select at least one recipient."}
            </p>
            <Button
              size="sm"
              disabled={selectedRecipients.length === 0}
              onClick={onClose}
              className="shrink-0 gap-1.5 bg-fuego-500 text-white hover:bg-fuego-600 disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
              Send
            </Button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}</style>
    </motion.div>
  );
}
