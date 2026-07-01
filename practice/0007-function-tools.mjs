import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

// Mock product backlog — your code owns this data, not the model.
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

const tools = [
  {
    type: "function",
    name: "get_feature_status",
    description:
      "Look up a product feature in the backlog by slug (kebab-case id).",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        feature_slug: {
          type: "string",
          description: "Feature slug, e.g. dark-mode, sso, export",
        },
      },
      required: ["feature_slug"],
      additionalProperties: false,
    },
  },
];

const userQuestion =
  "Users keep asking for dark mode. Is it already on our roadmap, and what's its priority?";

console.log("User:", userQuestion, "\n");

// Turn 1 — model may call your function instead of answering from memory
const first = await client.responses.create({
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
console.log("Arguments:", toolCall.arguments);

const args = JSON.parse(toolCall.arguments);
const toolResult = getFeatureStatus(args);
console.log("Your code returned:", toolResult, "\n");

// Turn 2 — send tool output back; model writes the user-facing answer
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
console.log("\nProduct pattern:");
console.log(
  "define tools → model picks one → your backend runs it → model summarizes for the user."
);
