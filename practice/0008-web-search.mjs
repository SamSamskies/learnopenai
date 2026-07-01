import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

// Built-in tools run on OpenAI's platform — no handler code, no second turn.
// Web search needs a model that supports it (gpt-5 here); costs more than nano.
const question =
  "What is the current stable version of the OpenAI Node SDK on npm? One sentence.";

console.log("User:", question, "\n");

const response = await client.responses.create({
  model: "gpt-5",
  instructions:
    "Answer concisely. Cite sources when web search is used.",
  input: question,
  tools: [{ type: "web_search", search_context_size: "low" }],
});

const searchCall = response.output.find((item) => item.type === "web_search_call");
const message = response.output.find((item) => item.type === "message");

if (searchCall) {
  console.log("Platform ran web_search_call:");
  console.log("  status:", searchCall.status);
  console.log("  action:", JSON.stringify(searchCall.action, null, 2));
} else {
  console.log("No web_search_call — model answered without searching.");
}

console.log("\nFinal answer:");
console.log(response.output_text);

if (message?.content?.[0]?.annotations?.length) {
  console.log("\nCitations (render these in your UI):");
  for (const note of message.content[0].annotations) {
    if (note.type === "url_citation") {
      console.log(`  - ${note.title ?? note.url}`);
      console.log(`    ${note.url}`);
    }
  }
}

console.log("\nContrast with practice/0007-function-tools.mjs:");
console.log(
  "custom function → you run handler + function_call_output second turn."
);
console.log("web_search → OpenAI runs search; answer in one response.");
