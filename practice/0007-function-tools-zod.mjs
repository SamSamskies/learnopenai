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
  "Users keep asking for dark mode. Is it already on our roadmap, and what's its priority?";

console.log("User:", userQuestion, "\n");

// Turn 1 — parse() auto-validates tool arguments via Zod
const first = await client.responses.parse({
  model: "gpt-4.1-nano",
  instructions:
    "You are a product assistant. Use get_feature_status when you need real backlog data. Be concise.",
  input: userQuestion,
  tools,
  parallel_tool_calls: false,
});

const toolCall = first.output.find((item) => item.type === "function_call");

if (!toolCall) {
  console.log("No tool call — model answered directly:");
  console.log(first.output_text);
  process.exit(0);
}

console.log("Model requested tool:", toolCall.name);
console.log("arguments (raw JSON string):", toolCall.arguments);

// responses.parse() validates via Zod — nested under .parsed_arguments today
const args =
  toolCall.parsed_arguments?.parsed_arguments ??
  GetFeatureParams.parse(JSON.parse(toolCall.arguments));
console.log("parsed_arguments (Zod-validated):", args);

const toolResult = getFeatureStatus(args);
console.log("Your code returned:", toolResult, "\n");

// Turn 2 — same handoff as the raw-schema script
const second = await client.responses.create({
  model: "gpt-4.1-nano",
  previous_response_id: first.id,
  input: [
    {
      type: "function_call_output",
      call_id: toolCall.call_id,
      output: toolResult,
    },
  ],
});

console.log("Final answer:");
console.log(second.output_text);

const sentTool = first.tools?.[0];
console.log("\nWire tool strict:", sentTool?.strict);
console.log(
  "\nContrast with practice/0007-function-tools.mjs:",
  "hand-written parameters + JSON.parse vs zodResponsesFunction + parsed_arguments."
);
