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
  
  export function extractFunctionCall(event: {
    type: string;
    response?: {
      output?: Array<{
        type?: string;
        name?: string;
        call_id?: string;
        arguments?: string;
      }>;
    };
  }): RealtimeFunctionCall | null {
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
  