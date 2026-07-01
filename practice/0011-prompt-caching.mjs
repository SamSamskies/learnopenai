import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

// ~1100 tokens of stable product context — static prefix for caching demos.
const HANDBOOK_SECTION = `
## Product handbook excerpt
Acme Analytics is a B2B dashboard for revenue teams. Plans: Starter ($29/mo, 3 seats),
Growth ($99/mo, 15 seats), Enterprise (custom). SSO ships on Enterprise; dark mode is
planned for Q3. CSV export is backlog. Support SLA: Starter 48h, Growth 24h, Enterprise 4h.
Data retention: Starter 90 days, Growth 1 year, Enterprise configurable. API rate limits:
Starter 60 req/min, Growth 300 req/min, Enterprise negotiated. Billing is monthly or annual
(15% discount). Trials are 14 days, no credit card. Onboarding includes one import wizard
for Salesforce or HubSpot. PII fields are masked by default; admins can unmask with audit log.
`;

const STATIC_INSTRUCTIONS =
  "You are Acme Analytics support. Answer from the handbook only. Be concise.\n" +
  HANDBOOK_SECTION.repeat(16);

function logUsage(label, usage) {
  const input = usage?.input_tokens ?? 0;
  const cached = usage?.input_tokens_details?.cached_tokens ?? 0;
  const pct = input ? Math.round((cached / input) * 100) : 0;
  console.log(
    `${label}: input_tokens=${input} cached_tokens=${cached} (${pct}% cached)`
  );
}

console.log("Step 1 — cold thread (first request with this prefix)");
const first = await client.responses.create({
  model: "gpt-4.1-nano",
  instructions: STATIC_INSTRUCTIONS,
  input: "What SLA does Growth include?",
  store: true,
});
console.log("Answer:", first.output_text.trim());
logUsage("  turn 1", first.usage);

console.log("\nStep 2 — same instructions, new thread (prefix should cache)");
const second = await client.responses.create({
  model: "gpt-4.1-nano",
  instructions: STATIC_INSTRUCTIONS,
  input: "Is dark mode shipped yet?",
  store: true,
});
console.log("Answer:", second.output_text.trim());
logUsage("  turn 2", second.usage);

console.log("\nStep 3 — chained follow-up (instructions block still caches)");
const third = await client.responses.create({
  model: "gpt-4.1-nano",
  instructions: STATIC_INSTRUCTIONS,
  input: "And what about SSO?",
  previous_response_id: first.id,
  store: true,
});
console.log("Answer:", third.output_text.trim());
logUsage("  turn 3", third.usage);

console.log("\nStep 4 — break the cache (version bump in instructions)");
const broken = await client.responses.create({
  model: "gpt-4.1-nano",
  instructions: `Prompt v2.\n${STATIC_INSTRUCTIONS}`,
  input: "What SLA does Growth include?",
  store: true,
});
logUsage("  broken prefix", broken.usage);

console.log("\nProduct pattern:");
console.log("Put stable instructions + tools at the front; user text at the end.");
console.log("Log usage.input_tokens_details.cached_tokens in production.");
console.log("Expect 0 cached on first hit; look for cached_tokens > 0 on repeats.");
