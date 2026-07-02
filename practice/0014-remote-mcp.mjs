import "dotenv/config";
import OpenAI from "openai";

const client = new OpenAI();

// Public demo server from OpenAI's remote MCP docs — no auth required.
const DMCP = {
  type: "mcp",
  server_label: "dmcp",
  server_description: "Dungeons & Dragons dice rolling MCP server.",
  server_url: "https://dmcp-server.deno.dev/sse",
  require_approval: "never",
};

const PROMPT = "Roll 2d4+1 and reply with just the total number.";

console.log("Step 1 — declare remote MCP in tools (one request)");
console.log("  server:", DMCP.server_url);

const response = await client.responses.create({
  model: "gpt-5",
  tools: [DMCP],
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
