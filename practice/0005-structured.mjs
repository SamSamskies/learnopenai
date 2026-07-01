import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

const featureIdeaSchema = {
  type: "object",
  properties: {
    title: {
      type: "string",
      description: "Short product feature name",
    },
    user_problem: {
      type: "string",
      description: "The user pain this feature solves",
    },
    priority: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Suggested build priority",
    },
  },
  required: ["title", "user_problem", "priority"],
  additionalProperties: false,
};

const messyInput =
  "users keep asking for dark mode and honestly it's annoying to ship without it, feels like table stakes for any dev tool";

// Structured — model must match the schema
const structured = await client.responses.create({
  model: "gpt-4.1-nano",
  instructions:
    "Extract a product feature idea from messy user feedback. Be concise.",
  input: messyInput,
  text: {
    format: {
      type: "json_schema",
      name: "feature_idea",
      strict: true,
      schema: featureIdeaSchema,
    },
  },
});

const parsed = JSON.parse(structured.output_text);

console.log("Structured output_text:", structured.output_text);
console.log("\nParsed fields (ready for React state):");
console.log("  title:", parsed.title);
console.log("  user_problem:", parsed.user_problem);
console.log("  priority:", parsed.priority);

// Unstructured — same prompt, no schema (fragile for UIs)
const unstructured = await client.responses.create({
  model: "gpt-4.1-nano",
  instructions:
    "Extract a product feature idea from messy user feedback. Be concise.",
  input: messyInput,
});

console.log("\nUnstructured output_text:");
console.log(unstructured.output_text);
console.log(
  "\nContrast:",
  "structured → JSON.parse once, typed fields.",
  "unstructured → hope the model used your format."
);
