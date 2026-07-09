export type Turn = { role: "user" | "assistant"; text: string };

export type TranscriptState = {
  history: Turn[];
  draftUser: string;
  draftAssistant: string;
};

export const emptyTranscript: TranscriptState = {
  history: [],
  draftUser: "",
  draftAssistant: "",
};

export function reduceTranscript(
  state: TranscriptState,
  event: { type: string; delta?: string; transcript?: string },
): TranscriptState {
  switch (event.type) {
    case "conversation.item.input_audio_transcription.delta":
      return {
        ...state,
        draftUser: state.draftUser + (event.delta ?? ""),
      };
    case "conversation.item.input_audio_transcription.completed": {
      const text = event.transcript ?? state.draftUser;
      if (!text.trim()) return { ...state, draftUser: "" };
      return {
        history: [...state.history, { role: "user", text }],
        draftUser: "",
        draftAssistant: state.draftAssistant,
      };
    }
    case "response.output_audio_transcript.delta":
    case "response.audio_transcript.delta":
      return {
        ...state,
        draftAssistant: state.draftAssistant + (event.delta ?? ""),
      };
    case "response.output_audio_transcript.done":
    case "response.audio_transcript.done": {
      const text = state.draftAssistant;
      if (!text.trim()) return state;
      return {
        history: [...state.history, { role: "assistant", text }],
        draftUser: state.draftUser,
        draftAssistant: "",
      };
    }
    case "response.cancelled": {
      if (!state.draftAssistant.trim()) return state;
      return {
        history: [
          ...state.history,
          { role: "assistant", text: state.draftAssistant },
        ],
        draftUser: state.draftUser,
        draftAssistant: "",
      };
    }
    default:
      return state;
  }
}
