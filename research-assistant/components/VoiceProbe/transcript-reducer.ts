export type Turn = {
  role: "user" | "assistant";
  text: string;
  interrupted?: boolean;
};

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

export type TranscriptEvent = {
  type: string;
  delta?: string;
  transcript?: string;
  response?: { status?: string };
};

function commitInterruptedAssistant(state: TranscriptState): TranscriptState {
  if (state.draftAssistant.trim()) {
    return {
      history: [
        ...state.history,
        { role: "assistant", text: state.draftAssistant, interrupted: true },
      ],
      draftUser: state.draftUser,
      draftAssistant: "",
    };
  }

  const lastIndex = state.history.length - 1;
  const lastTurn = state.history[lastIndex];
  if (lastTurn?.role === "assistant" && !lastTurn.interrupted) {
    return {
      ...state,
      history: [
        ...state.history.slice(0, lastIndex),
        { ...lastTurn, interrupted: true },
      ],
    };
  }

  return state;
}

export function reduceTranscript(
  state: TranscriptState,
  event: TranscriptEvent,
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
    case "response.cancelled":
    case "output_audio_buffer.cleared":
      return commitInterruptedAssistant(state);
    case "response.done":
      if (event.response?.status !== "cancelled") return state;
      return commitInterruptedAssistant(state);
    default:
      return state;
  }
}
