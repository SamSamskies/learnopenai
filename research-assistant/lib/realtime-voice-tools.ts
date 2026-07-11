export function lookupDefinitionLabel(term?: string): string {
  const trimmed = term?.trim();
  return trimmed ? `Looking up “${trimmed}”…` : "Looking up…";
}

export function lookedUpSystemLine(term: string): string {
  const trimmed = term.trim();
  return trimmed ? `Looked up: ${trimmed}` : "Looked up definition";
}

export const LOOKUP_DEFINITION_TOOL = {
    type: "function" as const,
    name: "lookup_definition",
    description:
      "Look up a one-sentence definition when the user asks what a term, acronym, or concept means.",
    parameters: {
      type: "object",
      properties: {
        term: {
          type: "string",
          description: "The word or phrase to define",
        },
      },
      required: ["term"],
    },
  };
  
  export type RealtimeFunctionCall = {
    callId: string;
    name: string;
    args: Record<string, unknown>;
  };
  
  export type RealtimeVoiceEvent = {
    type: string;
    call_id?: string;
    arguments?: string;
    item?: {
      type?: string;
      name?: string;
      call_id?: string;
    };
    response?: {
      output?: Array<{
        type?: string;
        name?: string;
        call_id?: string;
        arguments?: string;
      }>;
    };
  };

  export function extractFunctionCall(event: RealtimeVoiceEvent): RealtimeFunctionCall | null {
    if (event.type !== "response.done") return null;
    const item = event.response?.output?.find((o) => o.type === "function_call");
    if (!item?.call_id || !item.name) return null;
    let args: Record<string, unknown> = {};
    try {
      args = JSON.parse(item.arguments ?? "{}") as Record<string, unknown>;
    } catch {
      args = {};
    }
    return { callId: item.call_id, name: item.name, args };
  }
  
  export function functionOutputEvent(callId: string, output: unknown) {
    return {
      type: "conversation.item.create",
      item: {
        type: "function_call_output",
        call_id: callId,
        output: JSON.stringify(output),
      },
    };
  }
  