import { MicIcon } from "../ResearchChat/icons";
import type { RealtimePhase } from "./realtime-phase";

export function VoiceStartPrompt({
  phase,
  connected,
  hasTranscript,
}: {
  phase: RealtimePhase;
  connected: boolean;
  hasTranscript: boolean;
}) {
  if (hasTranscript) return null;

  if (phase === "connecting") {
    return (
      <p className="mt-4 text-center text-base text-on-surface-variant">
        Setting up your microphone…
      </p>
    );
  }

  if (!connected || phase !== "idle") return null;

  return (
    <div className="mt-6 flex flex-col items-center gap-3 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/30 bg-primary/5 text-primary">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/20" />
        <span className="relative">
          <MicIcon />
        </span>
      </div>
      <div>
        <p className="text-lg font-medium text-foreground">
          Say your question out loud
        </p>
        <p className="mt-1 max-w-xs text-sm text-on-surface-variant">
          No button to press — just start speaking when you&apos;re ready.
        </p>
      </div>
    </div>
  );
}
