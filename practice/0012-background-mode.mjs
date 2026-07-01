import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

console.log("Step 1 — kick off a background response (returns immediately)");
const started = await client.responses.create({
  model: "gpt-4.1-nano",
  instructions: "You are a concise product writer.",
  input:
    "Write three short paragraphs on why async background jobs matter for AI products.",
  background: true,
  store: true,
});

console.log("  id:", started.id);
console.log("  status:", started.status);
console.log("  output_text length:", started.output_text?.length ?? 0);

console.log("\nStep 2 — poll until terminal status");
let response = started;
while (response.status === "queued" || response.status === "in_progress") {
  console.log("  polling…", response.status);
  await sleep(1500);
  response = await client.responses.retrieve(response.id);
}

console.log("  final status:", response.status);
console.log("Answer preview:", response.output_text.trim().slice(0, 200) + "…");

console.log("\nProduct pattern:");
console.log("background: true + store: true for jobs that may exceed your HTTP timeout.");
console.log("Save response.id, poll with responses.retrieve until completed or failed.");
console.log("Notify the user (webhook, email, push) when the job finishes — do not block the UI.");
