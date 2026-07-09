export type RealtimePhase =
  | "idle"
  | "connecting"
  | "listening"
  | "thinking"
  | "speaking"
  | "interrupted"
  | "error";

export function reduceRealtimePhase(
  prev: RealtimePhase,
  event: { type: string },
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
    case "response.done":
    case "response.output_audio.done":
    case "response.audio.done":
    case "response.output_audio_transcript.done":
    case "response.audio_transcript.done":
      // Generation can finish before WebRTC playback; keep phase until stopped.
      return prev === "speaking" || prev === "thinking" ? prev : "idle";
    case "response.cancelled":
      return "interrupted";
    case "error":
      return "error";
    default:
      return prev;
  }
}
