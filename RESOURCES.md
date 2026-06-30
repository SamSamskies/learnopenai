# OpenAI Platform Resources

## Knowledge

- [OpenAI Developer Quickstart](https://platform.openai.com/docs/quickstart)
  Entry point: API key, first Responses API call, links to tools/streaming/agents guides. Use for: session 1 setup.
- [Responses API guide](https://platform.openai.com/docs/guides/migrate-to-responses)
  The current unified API surface (replaces much of Chat Completions + Assistants patterns). Use for: core platform mental model.
- [Function calling](https://platform.openai.com/docs/guides/function-calling)
  Custom tools your code executes. Use for: agentic product features.
- [Structured outputs](https://platform.openai.com/docs/guides/structured-outputs)
  JSON Schema-constrained model responses. Use for: reliable parsing in product UIs.
- [Streaming responses](https://platform.openai.com/docs/guides/streaming-responses)
  Server-sent events for incremental output. Use for: chat UIs, latency perception.
- [Built-in tools (web search, file search, code interpreter)](https://platform.openai.com/docs/guides/tools)
  Platform-managed tool execution. Use for: deciding build vs buy for tool features.
- [Remote MCP](https://platform.openai.com/docs/guides/tools-remote-mcp)
  Connect external MCP servers to the Responses API. Use for: MCP integration topic.
- [Conversation state](https://platform.openai.com/docs/guides/conversation-state)
  `previous_response_id`, server-side state. Use for: multi-turn product flows.
- [Prompt engineering](https://platform.openai.com/docs/guides/prompt-engineering)
  `instructions`, message roles, prompt versioning. Use for: system prompts and product behavior.
- [Prompt caching](https://platform.openai.com/docs/guides/prompt-caching)
  Cost/latency optimization for repeated prefixes. Use for: production economics.
- [Background mode](https://platform.openai.com/docs/guides/background)
  Long-running async responses. Use for: jobs that outlive a request timeout.
- [API pricing](https://platform.openai.com/docs/pricing)
  Per-model token and tool pricing. Use for: model selection and cost modeling.
- [OpenAI Agents SDK](https://platform.openai.com/docs/guides/agents)
  Orchestration layer on top of Responses API. Use for: multi-step agent workflows.
- [openai-responses-starter-app](https://github.com/openai/openai-responses-starter-app)
  Official starter repo. Use for: reference implementation patterns.

## Wisdom (Communities)

- [OpenAI Developer Community](https://community.openai.com/)
  Official forum; high signal on API changes and edge cases. Use for: debugging platform behavior.
- [r/OpenAI](https://reddit.com/r/OpenAI) / [r/LocalLLaMA](https://reddit.com/r/LocalLLaMA)
  Broader discussion; filter for API/product engineering threads. Use for: ecosystem awareness.

## Gaps

- Curated comparison of Responses API patterns → Anthropic Messages API / Google Gemini (needed once core OpenAI fluency is established)
- Cost budgeting guide for solo builders doing API experimentation
