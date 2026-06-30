import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

const instructions =
  "You are a terse assistant. Never use more than five words in any reply.";

// Turn 1 — instructions shape behavior
const first = await client.responses.create({
  model: "gpt-4.1-nano",
  instructions,
  input: "What color is the sky on a clear day?",
  store: true,
});

console.log("Turn 1 (with instructions):", first.output_text);
console.log("Turn 1 word count:", first.output_text.trim().split(/\s+/).length);

// Turn 2 — same instructions + chain; terse style should persist
const second = await client.responses.create({
  model: "gpt-4.1-nano",
  instructions,
  input: "What about at sunset?",
  previous_response_id: first.id,
  store: true,
});

console.log("\nTurn 2 (instructions + chain):", second.output_text);
console.log("Turn 2 word count:", second.output_text.trim().split(/\s+/).length);

// Turn 3 — chain but NO instructions; model forgets the terse rule
const third = await client.responses.create({
  model: "gpt-4.1-nano",
  input: "Describe the sky at sunset.",
  previous_response_id: second.id,
  store: true,
});

console.log("\nTurn 3 (chain, no instructions):", third.output_text);
console.log("Turn 3 word count:", third.output_text.trim().split(/\s+/).length);
console.log(
  "\nGotcha check:",
  third.output_text.trim().split(/\s+/).length > 5
    ? "passed — instructions did not carry over"
    : "still terse — try a more open-ended turn 3 prompt"
);
