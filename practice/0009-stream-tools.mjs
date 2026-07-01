import "dotenv/config";
import OpenAI from "openai";
import { zodResponsesFunction } from "openai/helpers/zod";
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

const tools = [
  zodResponsesFunction({
    name: "get_feature_status",
    description:
      "Look up a product feature in the backlog by slug (kebab-case id).",
    parameters: GetFeatureParams,
  }),
];

const userQuestion =
  "Users keep asking for dark mode. Is it on our roadmap, and what's its priority?";

console.log("User:", userQuestion, "\n");

// --- Turn 1: stream until the model finishes the tool call ---
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
    console.log(`\nTool call started: ${toolName}`);
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

const args =
  GetFeatureParams.parse(JSON.parse(argsBuffer));
console.log("parsed_arguments:", args);

const toolResult = getFeatureStatus(args);
console.log("Your code returned:", toolResult, "\n");

// --- Turn 2: stream the user-facing answer ---
console.log("Final answer (streaming):\n");

const turn2 = await client.responses.create({
  model: "gpt-4.1-nano",
  previous_response_id: responseId,
  input: [
    {
      type: "function_call_output",
      call_id: callId,
      output: toolResult,
    },
  ],
  stream: true,
});

for await (const event of turn2) {
  if (event.type === "response.output_text.delta") {
    process.stdout.write(event.delta);
  }
}

console.log("\n\nProduct pattern:");
console.log(
  "Turn 1 → show tool name + args as they stream; run handler when args complete."
);
console.log(
  "Turn 2 → stream output_text.delta for the final reply (same as Lesson 2)."
);
