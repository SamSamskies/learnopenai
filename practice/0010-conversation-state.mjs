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

const INSTRUCTIONS =
  "You are a product assistant. Use get_feature_status when you need real backlog data. Be concise.";

let lastResponseId = null;

async function ask(userMessage) {
  console.log("\nUser:", userMessage);

  const first = await client.responses.parse({
    model: "gpt-4.1-nano",
    instructions: INSTRUCTIONS,
    input: userMessage,
    tools,
    parallel_tool_calls: false,
    store: true,
    ...(lastResponseId && { previous_response_id: lastResponseId }),
  });

  const toolCall = first.output.find((item) => item.type === "function_call");

  if (!toolCall) {
    lastResponseId = first.id;
    console.log("Assistant:", first.output_text);
    console.log("lastResponseId:", lastResponseId);
    return;
  }

  const args =
    toolCall.parsed_arguments?.parsed_arguments ??
    GetFeatureParams.parse(JSON.parse(toolCall.arguments));
  const toolResult = getFeatureStatus(args);
  console.log(`Tool: ${toolCall.name}(${args.feature_slug}) →`, toolResult);

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
    store: true,
  });

  // Chain the NEXT user message on turn 2 — not turn 1.
  lastResponseId = second.id;
  console.log("Assistant:", second.output_text);
  console.log("lastResponseId:", lastResponseId);
}

await ask("Users keep asking for dark mode. What's its status and priority?");
await ask("What about SSO — is that shipped yet?");
await ask("Between dark mode and SSO, which has higher priority?");

console.log("\nProduct pattern:");
console.log("After a tool loop, save the id from the FINAL response (turn 2).");
console.log("Each new user message: input + previous_response_id + resend instructions.");
