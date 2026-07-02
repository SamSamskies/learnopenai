import OpenAI from "openai";
import { zodResponsesFunction, zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const client = new OpenAI();

const FEATURES = {
  "dark-mode": { title: "Dark mode", status: "planned", priority: "high" },
  sso: { title: "SSO login", status: "shipped", priority: "medium" },
  export: { title: "CSV export", status: "backlog", priority: "low" },
};

function getFeatureStatus({ feature_slug }) {
  const feature = FEATURES[feature_slug];
  if (!feature) {
    return JSON.stringify({ found: false, feature_slug });
  }
  return JSON.stringify({ found: true, ...feature, feature_slug });
}

const GetFeatureParams = z.object({
  feature_slug: z.string().describe("Feature slug, e.g. dark-mode, sso, export"),
});

const TriageCard = z.object({
  feature_title: z.string(),
  current_status: z.enum(["shipped", "planned", "backlog", "unknown"]),
  priority: z.enum(["low", "medium", "high", "unknown"]),
  recommendation: z.string(),
});

const tools = [
  zodResponsesFunction({
    name: "get_feature_status",
    description: "Look up a product feature in the backlog by slug.",
    parameters: GetFeatureParams,
  }),
];

export const defaultUserQuestion =
  "Users keep asking for dark mode. Is it on our roadmap, and what's its priority?";

export function createUiState(overrides = {}) {
  return {
    phase: "idle",
    toolName: null,
    callId: null,
    argsPreview: "",
    cardPreview: "",
    card: null,
    error: null,
    ...overrides,
  };
}

export function encodeUiSnapshot(state) {
  return `data: ${JSON.stringify(state)}\n\n`;
}

export async function streamTriage(onSnapshot, userQuestion = defaultUserQuestion) {
  const state = createUiState({ phase: "streaming-args" });
  let responseId;
  let toolName;
  let callId;

  onSnapshot(state);

  const turn1 = await client.responses.create({
    model: "gpt-4.1-nano",
    instructions:
      "You are a product assistant. Use get_feature_status when you need real backlog data.",
    input: userQuestion,
    tools,
    parallel_tool_calls: false,
    stream: true,
  });

  for await (const event of turn1) {
    if (
      event.type === "response.output_item.added" &&
      event.item.type === "function_call"
    ) {
      toolName = event.item.name;
      callId = event.item.call_id;
      state.toolName = toolName;
      state.callId = callId;
      state.phase = "streaming-args";
      onSnapshot({ ...state });
    }

    if (event.type === "response.function_call_arguments.delta") {
      state.argsPreview += event.delta;
      onSnapshot({ ...state });
    }

    if (event.type === "response.function_call_arguments.done") {
      state.argsPreview = event.arguments;
      onSnapshot({ ...state });
    }

    if (event.type === "response.completed") {
      responseId = event.response.id;
    }
  }

  if (!toolName || !callId) {
    onSnapshot(createUiState({ phase: "error", error: "No tool call in turn 1." }));
    return;
  }

  state.phase = "running-handler";
  onSnapshot({ ...state });

  const args = GetFeatureParams.parse(JSON.parse(state.argsPreview));
  const toolResult = getFeatureStatus(args);

  state.phase = "streaming-card";
  state.cardPreview = "";
  onSnapshot({ ...state });

  const turn2 = client.responses.stream({
    model: "gpt-4.1-nano",
    previous_response_id: responseId,
    instructions:
      "Return a triage card grounded in the tool result. Use unknown status/priority if data is missing.",
    input: [
      {
        type: "function_call_output",
        call_id: callId,
        output: toolResult,
      },
    ],
    text: { format: zodTextFormat(TriageCard, "triage_card") },
  });

  for await (const event of turn2) {
    if (event.type === "response.output_text.delta") {
      state.cardPreview += event.delta;
      onSnapshot({ ...state });
    }
  }

  const response = await turn2.finalResponse();
  state.card = response.output_parsed;
  state.phase = "done";
  onSnapshot({ ...state });
}
