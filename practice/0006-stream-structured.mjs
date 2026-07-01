import "dotenv/config";
import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";

const client = new OpenAI();

const FeatureIdea = z.object({
  title: z.string().describe("Short product feature name"),
  user_problem: z.string().describe("The user pain this feature solves"),
  priority: z.enum(["low", "medium", "high"]).describe("Suggested build priority"),
});

const messyInput =
  "users keep asking for dark mode and honestly it's annoying to ship without it, feels like table stakes for any dev tool";

const stream = client.responses.stream({
  model: "gpt-4.1-nano",
  instructions:
    "Extract a product feature idea from messy user feedback. Be concise.",
  input: messyInput,
  text: {
    format: zodTextFormat(FeatureIdea, "feature_idea"),
  },
});

let jsonBuffer = "";

console.log("Streaming JSON (raw deltas):\n");

for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    process.stdout.write(event.delta);
    jsonBuffer += event.delta;
  }
}

const response = await stream.finalResponse();

console.log("\n\n--- stream done ---");
console.log("Accumulated JSON valid:", (() => {
  try {
    JSON.parse(jsonBuffer);
    return true;
  } catch {
    return false;
  }
})());
console.log("\noutput_parsed (Zod-validated, use this in UI):");
console.log("  title:", response.output_parsed?.title);
console.log("  user_problem:", response.output_parsed?.user_problem);
console.log("  priority:", response.output_parsed?.priority);
console.log(
  "\nProduct pattern:",
  "stream deltas for perceived speed → parse once at end → render typed card."
);
