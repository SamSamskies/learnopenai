import { describe, expect, it } from "vitest";
import {
  reduceRealtimePhase,
  type RealtimePhase,
} from "./realtime-phase";

describe("reduceRealtimePhase", () => {
  it.each([
    ["session.created", "idle"],
    ["input_audio_buffer.speech_started", "listening"],
    ["input_audio_buffer.speech_stopped", "thinking"],
    ["response.output_audio.delta", "speaking"],
    ["output_audio_buffer.started", "speaking"],
    ["output_audio_buffer.stopped", "idle"],
    ["response.cancelled", "interrupted"],
    ["error", "error"],
  ] as const)("maps %s to %s", (type, expected) => {
    expect(reduceRealtimePhase("idle", { type })).toBe(expected);
  });

  it.each(["speaking", "thinking"] satisfies RealtimePhase[])(
    "keeps the %s phase when generation finishes before playback",
    (phase) => {
      expect(reduceRealtimePhase(phase, { type: "response.done" })).toBe(phase);
    },
  );

  it("returns to idle after a completion event from another phase", () => {
    expect(reduceRealtimePhase("listening", { type: "response.done" })).toBe(
      "idle",
    );
  });

  it("preserves the current phase for unknown events", () => {
    expect(reduceRealtimePhase("listening", { type: "unknown.event" })).toBe(
      "listening",
    );
  });
});
