# Teaching Notes

## Learner profile

- Solo builder, occasional OSS contributor
- 10+ years frontend engineering
- Transitioning to AI Product Engineer
- Completed deep dive on Cursor ([learncursor NOTES](https://github.com/SamSamskies/learncursor/blob/main/NOTES.md))
- No current OpenAI subscription

## ChatGPT's suggested curriculum (starting point)

Responses API, streaming, tool calling, structured outputs, image generation, file search, background mode, prompt caching, reasoning models, conversation state, MCP integration.

## Subscription decision (session 0)

- **API access** (`platform.openai.com`) is required for this mission — separate billing, pay-as-you-go (~$5 minimum prepaid credits).
- **ChatGPT subscription** (`chatgpt.com`) does NOT include API credits. Useful as a complement, not a substitute.
- Recommended: start with API platform only; add **ChatGPT Plus** if wanting Codex/thinking models for interactive exploration alongside API work. Skip Pro unless hitting Plus limits daily.

## Capstone app (session 25+)

- **Product:** Research Assistant — web-grounded Q&A with citations, not internal backlog triage.
- **Stack:** Next.js App Router, TypeScript, Zod, OpenAI Node SDK. App lives in `research-assistant/`.
- **Lesson arc:** One vertical slice per lesson — scaffold → API → streaming UI → structured brief → threads → file search → hardening.
- **Reuse:** Port patterns from `practice/lib/` (stream helpers, triage guard) rather than relearning from scratch.
- **Streaming client:** Hand-rolled `fetch` + SSE (Lessons 20, 27) → AI SDK `useChat` + `data-research` parts (Lesson 33). Server on `streamText` since Lesson 32. React Query deferred for non-streaming state (threads, session list) in a later pass.
- **Tests (Lesson 31+):** Vitest in `research-assistant/`. Mock `streamText` from `ai` (Lesson 32+) for fast CI; optional integration tests tagged separately for live API calls. Assert SSE contract on `POST /api/research` (phase order, final `done` frame shape, 400 on missing message). Extract shared `readSseStream` helper for route tests and client.

## AI-native design (session 34+)

- **Goal:** Fluency in AI-native design tools generically, starting with Google Stitch — not a separate repo for now.
- **Lesson 34:** Full Research Assistant redesign in Stitch (one page, five UI phases). Export `DESIGN.md` to `research-assistant/`.
- **Lesson 35:** Apply `DESIGN.md` to `ResearchChat.tsx` — visuals only, behavior unchanged.
- **Reference:** [reference/google-stitch.html](./reference/google-stitch.html).

## Future lessons

- **Model routing:** Lesson 13 covered effort / latency–cost–quality and when-not-to-use reasoning, but not product routing. Teach: (1) when one strong reasoning call replaces a multi-step agent chain, (2) route hard tasks → reasoning models, easy → fast/nano. Builds on Lesson 13 + Agents SDK (18).

## Preferences

- **No org ID / KYC:** Will not verify OpenAI organization for gated features (e.g. reasoning summaries). Practice scripts should not require it.
- **Structured outputs default:** Zod + `client.responses.parse()` for TypeScript practice scripts. Raw `create` + `json_schema` kept as the wire-level reference (see learning record 0006).
- **Function tool parameters default:** Zod + `zodResponsesFunction` + `responses.parse()` for TypeScript practice scripts. Raw `create` + hand-written `parameters` JSON Schema kept as the wire-level reference (see learning record 0008).
- **Follow-up depth:** Asks good "why is it like this?" questions (`required` vs `properties`, SDK patterns) — worth capturing in learning records, not just chat.
