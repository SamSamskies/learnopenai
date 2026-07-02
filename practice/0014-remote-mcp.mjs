import "dotenv/config";
import OpenAI from "openai";

// Remote MCP can take 15–60s: OpenAI lists tools from the server, may call one, then answers.
// dmcp-server.deno.dev (dice demo in older docs) is often slow or unresponsive — use DeepWiki.
const client = new OpenAI({ timeout: 120_000 });

const MCP = {
  type: "mcp",
  server_label: "deepwiki",
  server_description: "MCP spec documentation via DeepWiki.",
  server_url: "https://mcp.deepwiki.com/mcp",
  require_approval: {
    never: { tool_names: ["ask_question", "read_wiki_structure"] },
  },
};

const PROMPT =
  "What transport protocols does the MCP spec support? One short sentence.";

console.log("Step 1 — declare remote MCP in tools (one request)");
console.log("  server:", MCP.server_url);
console.log("  waiting — OpenAI fetches tools from the server, then may call one…");

const response = await client.responses.create({
  model: "gpt-5",
  tools: [MCP],
  input: PROMPT,
});

const listTools = response.output.find((item) => item.type === "mcp_list_tools");
const mcpCall = response.output.find((item) => item.type === "mcp_call");

console.log("\nStep 2 — inspect output items");
if (listTools) {
  const names = listTools.tools?.map((t) => t.name).join(", ") ?? "(none)";
  console.log("  mcp_list_tools:", names);
} else {
  console.log("  mcp_list_tools: (not in output — model skipped MCP)");
}

if (mcpCall) {
  console.log("  mcp_call:", mcpCall.name);
  console.log("  arguments:", mcpCall.arguments);
  console.log("  output:", mcpCall.output);
  if (mcpCall.error) console.log("  error:", mcpCall.error);
} else {
  console.log("  mcp_call: (not in output)");
}

console.log("\nStep 3 — final answer");
console.log(response.output_text.trim());

console.log("\nProduct pattern:");
console.log("Remote MCP = built-in type mcp; OpenAI lists tools and calls the server.");
console.log("Trust the server — malicious MCP can exfiltrate context. Use require_approval in prod.");
console.log("Custom function = your code runs it. MCP = external server, still one Responses request.");
