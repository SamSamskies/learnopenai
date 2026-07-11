import { Spinner } from "../ResearchChat/icons";
import type { RealtimePhase } from "./realtime-phase";

const PHASE_COPY: Record<RealtimePhase, string> = {
  idle: "Start talking",
  connecting: "Connecting…",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
  interrupted: "Interrupted — keep talking",
  error: "Something went wrong",
};

const PHASE_TEXT: Record<RealtimePhase, string> = {
  idle: "text-on-surface-variant",
  connecting: "text-on-surface-variant",
  listening: "text-primary",
  thinking: "text-on-surface-variant",
  speaking: "text-primary",
  interrupted: "text-on-surface-variant",
  error: "text-error",
};

function StatusDot({ className = "bg-primary" }: { className?: string }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
      <span
        className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-40 ${className}`}
      />
      <span className={`relative inline-flex h-2 w-2 rounded-full ${className}`} />
    </span>
  );
}

function PhaseIndicator({ phase }: { phase: RealtimePhase }) {
  if (phase === "listening" || phase === "speaking") {
    return <StatusDot />;
  }
  if (phase === "error") {
    return <StatusDot className="bg-error" />;
  }
  if (phase === "connecting" || phase === "thinking") {
    return <Spinner className="h-4 w-4 shrink-0" />;
  }
  return null;
}

export function SessionDock({
  phase,
  toolLabel,
  turnLatencyMs,
  turnDetection,
  onInterrupt,
  onDisconnect,
}: {
  phase: RealtimePhase;
  toolLabel?: string | null;
  turnLatencyMs: number | null;
  turnDetection: string;
  onInterrupt: () => void;
  onDisconnect: () => void;
}) {
  const statusLabel = toolLabel ?? PHASE_COPY[phase];
  const showIndicator =
    phase === "connecting" ||
    phase === "listening" ||
    phase === "thinking" ||
    phase === "speaking" ||
    phase === "error" ||
    toolLabel != null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-10 sm:inset-x-auto sm:right-6 sm:w-72">
      <div className="rounded-xl border border-outline-variant bg-surface-container-low/95 p-4 shadow-lg backdrop-blur-sm">
        <div
          className={`flex min-w-0 items-center gap-2 text-base font-medium ${PHASE_TEXT[phase]}`}
          role="status"
          aria-live="polite"
        >
          {showIndicator && (
            <PhaseIndicator phase={toolLabel != null ? "thinking" : phase} />
          )}
          <span className="truncate">{statusLabel}</span>
        </div>
        {phase === "idle" && (
          <p className="mt-1 text-xs text-on-surface-variant">
            Just speak — I&apos;ll listen automatically.
          </p>
        )}

        <div className="mt-3 flex items-center gap-3 text-xs">
          {phase === "speaking" && (
            <button
              type="button"
              onClick={onInterrupt}
              className="font-medium text-on-surface-variant underline-offset-4 transition-colors hover:text-foreground hover:underline"
            >
              Stop
            </button>
          )}
          <button
            type="button"
            onClick={onDisconnect}
            className="font-medium text-on-surface-variant underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            Disconnect
          </button>
        </div>

        <div className="mt-3 border-t border-outline-variant/60 pt-2 text-xs text-on-surface-variant">
          {turnLatencyMs != null && (
            <p>
              Last turn: {turnLatencyMs} ms
              {turnLatencyMs > 800 && (
                <span className="text-warn"> — over budget</span>
              )}
            </p>
          )}
          <p>{turnDetection}</p>
        </div>
      </div>
    </div>
  );
}
