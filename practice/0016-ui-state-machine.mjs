import "dotenv/config";
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

/** Same shape a React reducer would hold — see reference/streaming-ui-state.html */
function createInitialState() {
  return {
    phase: "idle",
    toolName: null,
    callId: null,
    argsPreview: "",
    cardPreview: "",
    card: null,
    error: null,
  };
}

function logState(state, note) {
  const snapshot = {
    phase: state.phase,
    toolName: state.toolName,
    argsLen: state.argsPreview.length,
    cardPreviewLen: state.cardPreview.length,
    hasCard: state.card !== null,
  };
  console.log(`[UI] ${note}`, snapshot);
}

function reduceTurn1(state, event) {
  if (
    event.type === "response.output_item.added" &&
    event.item.type === "function_call"
  ) {
    state.phase = "streaming-args";
    state.toolName = event.item.name;
    state.callId = event.item.call_id;
    logState(state, `tool call started → ${state.toolName}`);
    return;
  }

  if (event.type === "response.function_call_arguments.delta") {
    state.argsPreview += event.delta;
    return;
  }

  if (event.type === "response.function_call_arguments.done") {
    state.argsPreview = event.arguments;
    logState(state, "args complete");
    return;
  }

  if (event.type === "response.completed") {
    state.responseId = event.response.id;
  }
}

function reduceTurn2(state, event) {
  if (event.type === "response.output_text.delta") {
    state.cardPreview += event.delta;
  }
}

const userQuestion =
  "Users keep asking for dark mode. Is it on our roadmap, and what's its priority?";

console.log("User:", userQuestion, "\n");
console.log("This script logs UI state transitions — same reducer you'd use in React.\n");

const state = createInitialState();
logState(state, "submit question");

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
  reduceTurn1(state, event);
}

if (!state.toolName || !state.callId) {
  state.phase = "done";
  logState(state, "no tool call — direct answer");
  process.exit(0);
}

state.phase = "running-handler";
logState(state, "handler running");

const args = GetFeatureParams.parse(JSON.parse(state.argsPreview));
const toolResult = getFeatureStatus(args);

state.phase = "streaming-card";
state.cardPreview = "";
logState(state, "turn 2 stream started");

const turn2 = client.responses.stream({
  model: "gpt-4.1-nano",
  previous_response_id: state.responseId,
  instructions:
    "Return a triage card grounded in the tool result. Use unknown status/priority if data is missing.",
  input: [
    {
      type: "function_call_output",
      call_id: state.callId,
      output: toolResult,
    },
  ],
  text: { format: zodTextFormat(TriageCard, "triage_card") },
});

for await (const event of turn2) {
  reduceTurn2(state, event);
}

const response = await turn2.finalResponse();
state.card = response.output_parsed;
state.phase = "done";
logState(state, "card ready — render typed fields");

console.log("\n--- what React renders at phase=done ---");
console.log("  feature_title:", state.card?.feature_title);
console.log("  current_status:", state.card?.current_status);
console.log("  priority:", state.card?.priority);
console.log("  recommendation:", state.card?.recommendation);

console.log("\nNext: move this reducer into a useReducer + SSE from your API route.");
