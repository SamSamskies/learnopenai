import type { TranscriptState } from "./transcriptReducer";

export function Transcript({
  transcript,
}: {
  transcript: TranscriptState;
}) {
  const hasTranscript =
    transcript.history.length > 0 ||
    transcript.draftUser ||
    transcript.draftAssistant;

  if (!hasTranscript) return null;

  return (
    <div
      className="mt-6 w-full max-w-xl space-y-5 text-base leading-relaxed text-foreground"
      aria-label="Conversation transcript"
      aria-live="polite"
    >
      {transcript.history.map((turn, index) => (
        <p
          key={index}
          className={`whitespace-pre-wrap ${turn.role === "user" ? "ml-auto max-w-[85%] text-right" : "max-w-[90%]"}`}
        >
          <span className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            {turn.role}
          </span>
          <br />
          {turn.text}
        </p>
      ))}

      {transcript.draftUser && (
        <p className="ml-auto max-w-[85%] text-right text-foreground/70 whitespace-pre-wrap">
          <span className="text-xs text-on-surface-variant">
            You (transcribing…)
          </span>
          <br />
          {transcript.draftUser}
        </p>
      )}

      {transcript.draftAssistant && (
        <p className="max-w-[90%] text-foreground/90 whitespace-pre-wrap">
          <span className="text-xs text-on-surface-variant">Assistant</span>
          <br />
          {transcript.draftAssistant}
        </p>
      )}
    </div>
  );
}
