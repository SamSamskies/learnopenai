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

// Zod path — SDK converts schema to json_schema and parses output_parsed
const response = await client.responses.parse({
  model: "gpt-4.1-nano",
  instructions:
    "Extract a product feature idea from messy user feedback. Be concise.",
  input: messyInput,
  text: {
    format: zodTextFormat(FeatureIdea, "feature_idea"),
  },
});

console.log("output_text (still JSON string):", response.output_text);
console.log("\noutput_parsed (Zod-validated object):");
console.log("  title:", response.output_parsed?.title);
console.log("  user_problem:", response.output_parsed?.user_problem);
console.log("  priority:", response.output_parsed?.priority);

// Same schema the API received (converted from Zod under the hood)
const sentFormat = response.text?.format;
console.log("\nWire format type:", sentFormat?.type);
console.log("Wire format name:", sentFormat?.name);
console.log("Wire format strict:", sentFormat?.strict);

console.log(
  "\nContrast with practice/0005-structured.mjs:",
  "manual JSON Schema + JSON.parse vs Zod + output_parsed."
);
