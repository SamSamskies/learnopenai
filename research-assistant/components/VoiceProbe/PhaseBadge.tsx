import { PaperclipIcon, Spinner } from "../ResearchChat/icons";
import type { PreparedImage } from "./realtime-image-attach";
import type { RealtimePhase } from "./realtime-phase";

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
  attachedImage = null,
  onAttachImage,
  onInterrupt,
}: {
  phase: RealtimePhase;
  connected: boolean;
  attachedImage?: PreparedImage | null;
  onAttachImage?: () => void;
  onInterrupt?: () => void;
}) {
  const showSpinner =
    phase === "connecting" ||
    phase === "listening" ||
    phase === "thinking" ||
    phase === "speaking";

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex items-center gap-2">
        <div
          className={`inline-flex items-center gap-3 rounded-xl border px-6 py-4 text-lg font-medium tracking-tight sm:text-xl ${PHASE_CHIP[phase]}`}
          role="status"
          aria-live="polite"
        >
          {showSpinner && <Spinner className="h-5 w-5" />}
          <span>{phaseLabel(phase, connected)}</span>
          {phase === "speaking" && onInterrupt && (
            <button
              type="button"
              onClick={onInterrupt}
              className="rounded-md border border-current/25 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:bg-primary/15"
            >
              Stop
            </button>
          )}
        </div>
        {onAttachImage && (
          <button
            type="button"
            onClick={onAttachImage}
            disabled={!connected}
            aria-label="Attach image"
            className="flex h-[3.75rem] w-[3.75rem] shrink-0 items-center justify-center rounded-xl border border-outline-variant bg-surface-container-low text-on-surface-variant transition-colors hover:bg-surface-container hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PaperclipIcon />
          </button>
        )}
      </div>
      {attachedImage && (
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachedImage.previewUrl}
            alt=""
            className="h-16 w-16 rounded-lg border border-outline-variant object-cover"
          />
          <p className="max-w-xs text-center text-sm text-on-surface-variant">
            Attached — ask about this aloud.
            <span className="mt-0.5 block truncate text-xs opacity-80">
              {attachedImage.label}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
