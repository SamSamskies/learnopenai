import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

// Turn 1 — establish something the model must remember
const first = await client.responses.create({
  model: "gpt-4.1-nano",
  input: "My favorite color is teal. Remember this for our chat.",
  store: true,
});

console.log("Turn 1:", first.output_text);
console.log("Turn 1 id:", first.id);
console.log("Turn 1 tokens:", first.usage?.total_tokens);

// Turn 2 — only the new message; server replays prior context
const second = await client.responses.create({
  model: "gpt-4.1-nano",
  input: "What is my favorite color? Answer in one word.",
  previous_response_id: first.id,
  store: true,
});

console.log("\nTurn 2:", second.output_text);
console.log("Turn 2 id:", second.id);
console.log("Turn 2 tokens:", second.usage?.total_tokens);
console.log(
  "\nMemory check:",
  second.output_text.toLowerCase().includes("teal") ? "passed" : "failed — check previous_response_id"
);
