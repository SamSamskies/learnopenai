import "dotenv/config";
import OpenAI from "openai";
import { Firecrawl } from "firecrawl";

const client = new OpenAI();

// Custom web search via Firecrawl — Lesson 7 two-turn loop, not Lesson 8 built-in.
// Keyless: no API key needed (~1k credits/month per IP). Optional FIRECRAWL_API_KEY
// for higher limits — free at https://firecrawl.dev
const firecrawl = process.env.FIRECRAWL_API_KEY
  ? new Firecrawl({ apiKey: process.env.FIRECRAWL_API_KEY })
  : new Firecrawl({});

async function firecrawlSearch({ query, limit = 5 }) {
  const data = await firecrawl.search(query, { limit });
  const results = (data.web ?? []).map(({ title, url, description }) => ({
    title,
    url,
    description: description ?? null,
  }));

  return JSON.stringify({ query, results });
}

const tools = [
  {
    type: "function",
    name: "web_search",
    description:
      "Search the web for current information. Use when the answer depends on live or recent data.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query — concise keywords work best.",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
];

const userQuestion =
  "What is the current stable version of the OpenAI Node SDK on npm? One sentence.";

console.log("User:", userQuestion, "\n");

// Turn 1 — model may call your Firecrawl-backed web_search function
const first = await client.responses.create({
  model: "gpt-4.1-nano",
  instructions:
    "You are a helpful assistant. Use web_search when you need current information. Answer concisely and cite result URLs.",
  input: userQuestion,
  tools,
  parallel_tool_calls: false,
});

const toolCall = first.output.find((item) => item.type === "function_call");

if (!toolCall) {
  console.log("No tool call — model answered from memory:");
  console.log(first.output_text);
  process.exit(0);
}

console.log("Model requested tool:", toolCall.name);
console.log("Arguments:", toolCall.arguments);

const args = JSON.parse(toolCall.arguments);
const toolResult = await firecrawlSearch(args);
console.log("Firecrawl returned:", toolResult, "\n");

// Turn 2 — model summarizes search results for the user
const second = await client.responses.create({
  model: "gpt-4.1-nano",
  previous_response_id: first.id,
  input: [
    {
      type: "function_call_output",
      call_id: toolCall.call_id,
      output: toolResult,
    },
  ],
});

console.log("Final answer:");
console.log(second.output_text);
console.log("\nContrast with practice/0008-web-search.mjs:");
console.log(
  "built-in web_search → OpenAI runs search + cites in one response (~$0.01/search)."
);
console.log(
  "Firecrawl custom tool → you run search, two turns, you format citations (free tier / credits)."
);
