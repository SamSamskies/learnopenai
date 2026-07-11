import { describe, expect, it } from "vitest";
import {
  emptyTranscript,
  reduceTranscript,
  appendSystemTurn,
  type TranscriptState,
} from "./transcript-reducer";

describe("reduceTranscript", () => {
  it("builds and completes a user transcript", () => {
    const drafting = reduceTranscript(emptyTranscript, {
      type: "conversation.item.input_audio_transcription.delta",
      delta: "Hello",
    });
    const completed = reduceTranscript(drafting, {
      type: "conversation.item.input_audio_transcription.completed",
      transcript: "Hello there",
    });

    expect(completed).toEqual({
      history: [{ role: "user", text: "Hello there" }],
      draftUser: "",
      draftAssistant: "",
    });
  });

  it("falls back to the user draft when completion has no transcript", () => {
    const state: TranscriptState = {
      ...emptyTranscript,
      draftUser: "Draft text",
    };

    expect(
      reduceTranscript(state, {
        type: "conversation.item.input_audio_transcription.completed",
      }).history,
    ).toEqual([{ role: "user", text: "Draft text" }]);
  });

  it.each([
    [
      "response.output_audio_transcript.delta",
      "response.output_audio_transcript.done",
    ],
    ["response.audio_transcript.delta", "response.audio_transcript.done"],
  ])("builds an assistant transcript for %s", (deltaType, doneType) => {
    const drafting = reduceTranscript(emptyTranscript, {
      type: deltaType,
      delta: "Here is the answer.",
    });

    expect(reduceTranscript(drafting, { type: doneType })).toEqual({
      history: [{ role: "assistant", text: "Here is the answer." }],
      draftUser: "",
      draftAssistant: "",
    });
  });

  it("preserves a partial assistant transcript when cancelled", () => {
    const state: TranscriptState = {
      history: [{ role: "user", text: "Question" }],
      draftUser: "",
      draftAssistant: "Partial answer",
    };

    expect(reduceTranscript(state, { type: "response.cancelled" })).toEqual({
      history: [
        { role: "user", text: "Question" },
        { role: "assistant", text: "Partial answer", interrupted: true },
      ],
      draftUser: "",
      draftAssistant: "",
    });
  });

  it("marks the last assistant turn interrupted on response.done cancelled", () => {
    const state: TranscriptState = {
      history: [
        { role: "user", text: "Question" },
        { role: "assistant", text: "Full answer" },
      ],
      draftUser: "",
      draftAssistant: "",
    };

    expect(
      reduceTranscript(state, {
        type: "response.done",
        response: { status: "cancelled" },
      }),
    ).toEqual({
      history: [
        { role: "user", text: "Question" },
        { role: "assistant", text: "Full answer", interrupted: true },
      ],
      draftUser: "",
      draftAssistant: "",
    });
  });

  it("marks the last assistant turn interrupted when playback is cleared", () => {
    const state: TranscriptState = {
      history: [
        { role: "user", text: "Question" },
        { role: "assistant", text: "Full answer" },
      ],
      draftUser: "",
      draftAssistant: "",
    };

    expect(
      reduceTranscript(state, { type: "output_audio_buffer.cleared" }),
    ).toEqual({
      history: [
        { role: "user", text: "Question" },
        { role: "assistant", text: "Full answer", interrupted: true },
      ],
      draftUser: "",
      draftAssistant: "",
    });
  });

  it("appends a system turn", () => {
    expect(appendSystemTurn(emptyTranscript, "Looked up: RAG")).toEqual({
      history: [{ role: "system", text: "Looked up: RAG" }],
      draftUser: "",
      draftAssistant: "",
    });
  });

  it("ignores unknown events", () => {
    expect(reduceTranscript(emptyTranscript, { type: "unknown.event" })).toBe(
      emptyTranscript,
    );
  });
});
