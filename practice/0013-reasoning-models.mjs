import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

// o4-mini is a cost-conscious reasoning model; gpt-5.4-mini works too.
const MODEL = "o4-mini";

const PUZZLE =
  "A bat and ball cost $1.10 total. The bat costs $1.00 more than the ball. " +
  "How much does the ball cost, in cents? Reply with just the number.";

// Ball = 5¢, bat = 105¢ → total $1.10 and bat is $1.00 more. The intuitive trap is 10¢.
const EXPECTED_BALL_CENTS = 5;

function checkBallAnswer(text) {
  const match = text.trim().match(/\d+/);
  const cents = match ? Number(match[0]) : NaN;
  const ok = cents === EXPECTED_BALL_CENTS;
  let note = ok
    ? `correct (${EXPECTED_BALL_CENTS}¢)`
    : `expected ${EXPECTED_BALL_CENTS}¢, got ${Number.isNaN(cents) ? "?" : `${cents}¢`}`;
  if (!ok && cents === 10) note += " — common trap answer";
  return { cents, ok, note };
}

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
const lowCheck = checkBallAnswer(low.output_text);
console.log("Answer:", low.output_text.trim(), `(${lowCheck.note})`);
logUsage("  low", low);

console.log("\nStep 2 — high reasoning effort (same puzzle)");
const high = await client.responses.create({
  model: MODEL,
  reasoning: { effort: "high" },
  input: PUZZLE,
  store: true,
});
const highCheck = checkBallAnswer(high.output_text);
console.log("Answer:", high.output_text.trim(), `(${highCheck.note})`);
logUsage("  high", high);

console.log("\nStep 3 — gpt-4.1-nano × 3 (no reasoning, same puzzle)");
const nanoRuns = [];
for (let i = 1; i <= 3; i++) {
  const nano = await client.responses.create({
    model: "gpt-4.1-nano",
    input: PUZZLE,
    store: true,
  });
  const check = checkBallAnswer(nano.output_text);
  nanoRuns.push(check);
  console.log(`  run ${i}:`, nano.output_text.trim(), `(${check.note})`);
  logUsage(`  nano-${i}`, nano);
}
const nanoCorrect = nanoRuns.filter((r) => r.ok).length;
console.log(`  nano: ${nanoCorrect}/3 correct — cheap models can flip on trap questions`);

console.log("\nProduct pattern:");
console.log("Reasoning tokens bill as output — log usage.output_tokens_details.reasoning_tokens.");
console.log("Start with the cheapest model that passes evals — but eval with multiple runs, not one lucky call.");
console.log("Reserve headroom (max_output_tokens) so reasoning does not exhaust the budget.");
console.log("Pair high effort with background mode for long jobs that outlive HTTP timeouts.");
