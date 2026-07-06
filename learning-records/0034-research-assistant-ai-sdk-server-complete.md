# Research Assistant AI SDK server migration complete

Sam migrated `lib/stream-research.ts` from raw `openai.responses.stream()` to Vercel AI SDK `streamText` + `openai.responses('gpt-5-mini')`. Same SSE contract (`ResearchUIState` phases), same tools (web search, conditional file search), structured brief via `Output.object({ schema: ResearchBrief })`, thread continuity via `providerOptions.openai.previousResponseId`, citations from `content` text-part annotations. Vitest mocks `streamText` instead of `openai.responses.stream`. Client (`ResearchChat`) unchanged.

**Evidence:** User requested server-side AI SDK migration; tests and `npm run build` pass.

**Implications:** Ready for Lesson 33 — client migration to `useChat` with custom message/data parts (optional), or cross-provider comparison (mission criterion #4). `lib/openai.ts` remains for upload/vector-store routes.
