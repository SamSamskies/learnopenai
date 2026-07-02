# Remote MCP: declare, inspect output items, tool failure ≠ grounded answer

Completed Lesson 14 and `practice/0014-remote-mcp.mjs`. Can declare `type: "mcp"` in `tools`, read `mcp_list_tools` and `mcp_call` in `output`, and contrast with Lesson 7's two-turn custom function loop (platform runs the server in one request).

**Evidence:** Ran practice script against DeepWiki (dmcp demo server was unresponsive). Observed `mcp_call` with error text in `output` while `output_text` still looked correct — asked why the model called MCP if it "already knew" and why a failed tool didn't block the answer.

**Implications:** Ready for capstone (Lesson 15) — wire streaming + custom tools + structured output into one product-shaped flow. Key MCP product takeaways: inspect `mcp_call.output`/`error` before trusting answers; tool calls are probabilistic routing, not proof data came from the server; use instructions or fail-fast when answers must be tool-grounded.
