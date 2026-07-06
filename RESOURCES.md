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
- [File search](https://platform.openai.com/docs/guides/tools-file-search)
  Vector stores + hosted RAG over uploaded docs. Use for: doc-Q&A without rolling your own retrieval.
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
- [Reasoning models](https://platform.openai.com/docs/guides/reasoning)
  Thinking tokens, `reasoning.effort`, summaries, tool-loop context. Use for: when to pay for reasoning vs nano/mini.
- [API pricing](https://platform.openai.com/docs/pricing)
  Per-model token and tool pricing. Use for: model selection and cost modeling.
- [OpenAI Agents SDK](https://platform.openai.com/docs/guides/agents)
  Orchestration layer on top of Responses API. Use for: multi-step agent workflows.
- [Image generation](https://platform.openai.com/docs/guides/image-generation)
  Image API (`images.generate` / `images.edit`) and Responses `image_generation` built-in tool. Use for: product image features, conversational mockup editors.
- [Next.js App Router](https://nextjs.org/docs/app)
  Route handlers, layouts, server components. Use for: Research Assistant capstone (Lessons 25+).
- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
  `app/api/*/route.ts` — replaces Node `http.createServer` from triage practice. Use for: streaming research API.
- [openai-responses-starter-app](https://github.com/openai/openai-responses-starter-app)
  Official starter repo. Use for: reference implementation patterns; compare to `research-assistant/` as you build.
- [Vercel AI SDK — OpenAI Responses API cookbook](https://ai-sdk.dev/cookbook/guides/openai-responses)
  `streamText` + `openai.responses()`, built-in web/file search tools, `previousResponseId`, structured `Output.object`. Use for: Lesson 32+ server migration in `research-assistant/`.
- [AI SDK Core — streamText reference](https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text)
  Stream parts (`tool-call`, `text-delta`, `finish`), `result.output`, `finalStep.providerMetadata`. Use for: mapping AI SDK events to custom SSE snapshots.

## Wisdom (Communities)

- [OpenAI Developer Community](https://community.openai.com/)
  Official forum; high signal on API changes and edge cases. Use for: debugging platform behavior.
- [r/OpenAI](https://reddit.com/r/OpenAI) / [r/LocalLLaMA](https://reddit.com/r/LocalLLaMA)
  Broader discussion; filter for API/product engineering threads. Use for: ecosystem awareness.

## Third-party search (custom tool alternatives)

Use with the Lesson 7 two-turn function pattern when built-in `web_search` is not the right fit. See learning record `0010-web-search-build-vs-buy.md`.

- [Firecrawl](https://docs.firecrawl.dev/features/search) — keyless search + scrape; ~1k credits/month free. Practice: `practice/0008-firecrawl-search.mjs`.
- [Kagi Search API](https://help.kagi.com/kagi/api/search.html) — premium search; ~$12 / 1k requests (paid).
- [OpenAI web search pricing](https://platform.openai.com/docs/pricing) — built-in tool ~$10 / 1k search actions + model tokens.

## Hosted RAG (cross-provider)

Use when evaluating doc-Q&A build vs buy beyond OpenAI. Full table in [reference/file-search.html](./reference/file-search.html#hosted-rag-across-providers).

- [OpenAI file search](https://platform.openai.com/docs/guides/tools-file-search) — `file_search` built-in on Responses API; $0.10/GB/day storage (1 GB free) + $2.50/1k tool calls + model tokens. Best when already on the OpenAI stack.
- [Gemini File Search](https://ai.google.dev/gemini-api/docs/file-search) — closest hosted-RAG peer; free storage, free query embeddings, 1 GB on free tier; indexing free on free tier ([pricing](https://ai.google.dev/gemini-api/docs/pricing)). Different API surface — not a drop-in swap.
- [Supabase pgvector](https://supabase.com/docs/guides/database/extensions/pgvector) — 500 MB free DB with vectors ([pricing](https://supabase.com/pricing)). Generous for learning; you write the retrieval loop (embed → search → LLM).
- [Pinecone Starter](https://www.pinecone.io/pricing/) — 2 GB free vector storage; vector DB only — wire embeddings + LLM yourself.
- [Qdrant Cloud](https://qdrant.tech/pricing/) — ~1 GB permanent free tier; same DIY pattern as Pinecone.
- [Claude Files API](https://platform.claude.com/docs/en/build-with-claude/files) — attach files to messages; no hosted semantic corpus search equivalent to `file_search`.

## Gaps

- Broader Responses API patterns → Anthropic Messages API / Google Gemini (streaming, tools, state) — partial RAG comparison above
- Cost budgeting guide for solo builders doing API experimentation
