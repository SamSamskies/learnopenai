import "dotenv/config";
import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";

const FEATURES = {
  "dark-mode": { title: "Dark mode", status: "planned", priority: "high" },
  sso: { title: "SSO login", status: "shipped", priority: "medium" },
  export: { title: "CSV export", status: "backlog", priority: "low" },
};

const getFeatureStatus = tool({
  name: "get_feature_status",
  description: "Look up a product feature in the backlog by slug.",
  parameters: z.object({
    feature_slug: z
      .string()
      .describe("Feature slug, e.g. dark-mode, sso, export"),
  }),
  execute: async ({ feature_slug }) => {
    const feature = FEATURES[feature_slug];
    if (!feature) {
      return JSON.stringify({ found: false, feature_slug });
    }
    return JSON.stringify({ found: true, ...feature, feature_slug });
  },
});

const TriageCard = z.object({
  feature_title: z.string(),
  current_status: z.enum(["shipped", "planned", "backlog", "unknown"]),
  priority: z.enum(["low", "medium", "high", "unknown"]),
  recommendation: z
    .string()
    .describe("One sentence product recommendation for the PM"),
});

const triageAgent = new Agent({
  name: "Product Triage",
  model: "gpt-4.1-nano",
  instructions:
    "You are a product assistant. Call get_feature_status at most once per question. If tool results are already in the conversation, use them — do not call the tool again. Return a triage card grounded in the tool result.",
  tools: [getFeatureStatus],
  outputType: TriageCard,
});

const userQuestion =
  "Users keep asking for dark mode. Is it on our roadmap, and what's its priority?";

console.log("User:", userQuestion, "\n");
console.log("Agents SDK — one run() replaces the hand-rolled two-turn loop.\n");

const result = await run(triageAgent, userQuestion, { maxTurns: 5 });

const toolCalls = result.newItems.filter((item) => item.type === "tool_call_item");
const toolOutputs = result.newItems.filter(
  (item) => item.type === "tool_call_output_item"
);

if (toolCalls.length) {
  console.log("SDK ran the tool loop for you:");
  for (const call of toolCalls) {
    console.log(`  tool: ${call.rawItem?.name ?? call.name}`);
  }
  for (const out of toolOutputs) {
    console.log(`  output: ${out.output}`);
  }
  console.log();
}

const card = result.finalOutput;

console.log("--- typed TriageCard (same shape as Lesson 15) ---");
console.log("  feature_title:", card?.feature_title);
console.log("  current_status:", card?.current_status);
console.log("  priority:", card?.priority);
console.log("  recommendation:", card?.recommendation);

console.log("\nContrast with practice/0015-capstone-feature-triage.mjs:");
console.log("  Lesson 15 — you stream turn 1, run handler, stream turn 2.");
console.log("  Lesson 18 — run() loops until finalOutput; traces in OpenAI dashboard.");
