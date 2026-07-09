import { Spinner } from "../ResearchChat/icons";
import type { RealtimePhase } from "./realtimePhase";

const PHASE_COPY: Record<RealtimePhase, string> = {
  idle: "Ready — tap Connect",
  connecting: "Connecting…",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  interrupted: "Interrupted — keep talking",
  error: "Something went wrong",
};

const PHASE_CHIP: Record<RealtimePhase, string> = {
  idle: "border-outline-variant bg-surface-container-low text-on-surface-variant",
  connecting: "border-outline-variant bg-surface-container-low text-on-surface-variant",
  listening: "border-primary/30 bg-primary/5 text-primary",
  thinking: "border-outline-variant bg-surface-container text-on-surface-variant",
  speaking: "border-primary/40 bg-primary/10 text-primary",
  interrupted: "border-outline-variant bg-surface-container-low text-on-surface-variant",
  error: "border-error/30 bg-error-container text-on-error-container",
};

function phaseLabel(phase: RealtimePhase, connected: boolean): string {
  if (phase === "idle") {
    return connected ? "Ready" : "Ready — tap Connect";
  }
  return PHASE_COPY[phase];
}

export function PhaseBadge({
  phase,
  connected,
}: {
  phase: RealtimePhase;
  connected: boolean;
}) {
  const showSpinner =
    phase === "connecting" ||
    phase === "listening" ||
    phase === "thinking" ||
    phase === "speaking";

  return (
    <div
      className={`inline-flex items-center gap-3 rounded-xl border px-6 py-4 text-lg font-medium tracking-tight sm:text-xl ${PHASE_CHIP[phase]}`}
      role="status"
      aria-live="polite"
    >
      {showSpinner && <Spinner className="h-5 w-5" />}
      <span>{phaseLabel(phase, connected)}</span>
    </div>
  );
}
