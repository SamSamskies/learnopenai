export type RealtimePhase =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error";

export type RealtimeEvent = {
  type: string;
  response?: { status?: string };
  error?: { code?: string | null };
};

export function reduceRealtimePhase(
  prev: RealtimePhase,
  event: RealtimeEvent,
): RealtimePhase {
  switch (event.type) {
    case "session.created":
      return "idle";
    case "input_audio_buffer.speech_started":
      return "listening";
    case "input_audio_buffer.speech_stopped":
      return "thinking";
    case "response.output_audio.delta":
    case "response.audio.delta":
    case "response.output_audio_transcript.delta":
    case "response.audio_transcript.delta":
    case "output_audio_buffer.started":
      return "speaking";
    case "output_audio_buffer.stopped":
      return "idle";
    case "output_audio_buffer.cleared":
      return prev === "speaking" ? "interrupted" : prev;
    case "response.done":
      if (event.response?.status === "cancelled") return "interrupted";
      // Generation can finish before WebRTC playback; keep phase until stopped.
      return prev === "speaking" || prev === "thinking" ? prev : "idle";
    case "response.output_audio.done":
    case "response.audio.done":
    case "response.output_audio_transcript.done":
    case "response.audio_transcript.done":
      return prev === "speaking" || prev === "thinking" ? prev : "idle";
    case "response.cancelled":
      return "interrupted";
    case "error":
      if (event.error?.code === "response_cancel_not_active") {
        return prev === "speaking" || prev === "thinking" ? "interrupted" : prev;
      }
      return "error";
    default:
      return prev;
  }
}
