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
  feature_slug: z
    .string()
    .describe("Feature slug, e.g. dark-mode, sso, export"),
});

const TriageCard = z.object({
  feature_title: z.string(),
  current_status: z.enum(["shipped", "planned", "backlog", "unknown"]),
  priority: z.enum(["low", "medium", "high", "unknown"]),
  recommendation: z
    .string()
    .describe("One sentence product recommendation for the PM"),
});

const tools = [
  zodResponsesFunction({
    name: "get_feature_status",
    description: "Look up a product feature in the backlog by slug.",
    parameters: GetFeatureParams,
  }),
];

const userQuestion =
  "Users keep asking for dark mode. Is it on our roadmap, and what's its priority?";

console.log("User:", userQuestion, "\n");
console.log("Phase 1 — stream tool call (Lesson 9)\n");

let responseId;
let toolName;
let callId;
let argsBuffer = "";

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
  if (event.type === "response.output_item.added" && event.item.type === "function_call") {
    toolName = event.item.name;
    callId = event.item.call_id;
    console.log(`Tool call started: ${toolName}`);
    process.stdout.write("Arguments streaming: ");
  }

  if (event.type === "response.function_call_arguments.delta") {
    process.stdout.write(event.delta);
    argsBuffer += event.delta;
  }

  if (event.type === "response.function_call_arguments.done") {
    argsBuffer = event.arguments;
    console.log("\nArguments complete.");
  }

  if (event.type === "response.completed") {
    responseId = event.response.id;
  }
}

if (!toolName || !callId) {
  console.log("No tool call — model answered directly in turn 1.");
  process.exit(0);
}

const args = GetFeatureParams.parse(JSON.parse(argsBuffer));
const toolResult = getFeatureStatus(args);
console.log("Handler returned:", toolResult, "\n");

console.log("Phase 2 — stream structured card (Lessons 6 + 10)\n");
process.stdout.write("JSON streaming: ");

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

let jsonBuffer = "";

for await (const event of turn2) {
  if (event.type === "response.output_text.delta") {
    process.stdout.write(event.delta);
    jsonBuffer += event.delta;
  }
}

const response = await turn2.finalResponse();
const card = response.output_parsed;

console.log("\n\n--- render typed card (what React state gets) ---");
console.log("  feature_title:", card?.feature_title);
console.log("  current_status:", card?.current_status);
console.log("  priority:", card?.priority);
console.log("  recommendation:", card?.recommendation);

console.log("\nCapstone pattern:");
console.log("Stream tool progress → run handler → stream structured JSON → render card.");
console.log("Built-in tools/MCP/reasoning/caching layer on when the product needs them.");
