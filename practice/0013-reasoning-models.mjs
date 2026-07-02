import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

// o4-mini is a cost-conscious reasoning model; gpt-5.4-mini works too.
const MODEL = "o4-mini";

const PUZZLE =
  "A bat and ball cost $1.10 total. The bat costs $1.00 more than the ball. " +
  "How much does the ball cost, in cents? Reply with just the number.";

function logUsage(label, response) {
  const usage = response.usage ?? {};
  const reasoning = usage.output_tokens_details?.reasoning_tokens ?? 0;
  const output = usage.output_tokens ?? 0;
  const input = usage.input_tokens ?? 0;
  console.log(
    `${label}: input=${input} output=${output} reasoning_tokens=${reasoning}`
  );
}

console.log(`Model: ${MODEL}`);
console.log("Puzzle:", PUZZLE);

console.log("\nStep 1 — low reasoning effort");
const low = await client.responses.create({
  model: MODEL,
  reasoning: { effort: "low" },
  input: PUZZLE,
  store: true,
});
console.log("Answer:", low.output_text.trim());
logUsage("  low", low);

console.log("\nStep 2 — high reasoning effort (same puzzle)");
const high = await client.responses.create({
  model: MODEL,
  reasoning: { effort: "high" },
  input: PUZZLE,
  store: true,
});
console.log("Answer:", high.output_text.trim());
logUsage("  high", high);

console.log("\nStep 3 — optional reasoning summary (effort + summary: auto)");
const withSummary = await client.responses.create({
  model: MODEL,
  reasoning: { effort: "low", summary: "auto" },
  input: "What is 17 × 23? Reply with just the number.",
  store: true,
});
const reasoningItem = withSummary.output.find((item) => item.type === "reasoning");
const summaryText =
  reasoningItem?.summary
    ?.map((part) => part.text)
    .join("\n")
    .trim() ?? "(no summary in output)";
console.log("Answer:", withSummary.output_text.trim());
console.log("Summary preview:", summaryText.slice(0, 180) + (summaryText.length > 180 ? "…" : ""));
logUsage("  summary", withSummary);

console.log("\nProduct pattern:");
console.log("Reasoning tokens bill as output — log usage.output_tokens_details.reasoning_tokens.");
console.log("Start with low effort; raise effort only when evals show a quality gap.");
console.log("Reserve headroom (max_output_tokens) so reasoning does not exhaust the budget.");
console.log("Pair high effort with background mode for long jobs that outlive HTTP timeouts.");
