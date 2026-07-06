# Mission: OpenAI Platform for AI Product Engineering

## Why

Become a proficient AI Product Engineer who can design, build, and ship products on top of LLM APIs — not just prompt in a chat UI. As a solo builder with 10+ years of frontend experience (and growing Cursor fluency), the goal is to master the OpenAI platform primitives (Responses API, tools, structured outputs, streaming, state, MCP) so those patterns transfer cleanly to other providers and into real shipped products.

## Capstone project (in progress)

**Research Assistant** — a Next.js app for solo builders to research topics with web search, streaming answers, citations, multi-turn threads, and optional uploaded docs. Built incrementally in Lessons 25+ inside `research-assistant/`. Reuses the triage capstone architecture (server boundary, SSE UI snapshots, guards, `previous_response_id`) with a research-shaped product surface.

## Success looks like

- Ship the Research Assistant end-to-end (streaming UI, web search, citations, multi-turn threads, doc upload, hardened routes) — Lesson 31 in progress
- Ship a small end-to-end AI product feature using the Responses API (streaming UI, tool calls, structured JSON output) — met at practice level via triage capstone; now shipping as the research app
- Confidently choose when to use built-in tools vs custom functions vs MCP vs file search
- Manage conversation state, prompt caching, and background mode with intentional tradeoffs — not cargo-culting
- Read OpenAI docs and changelog and know what changed and what it means for a product
- Explain how OpenAI platform concepts map to Anthropic, Google, etc. when evaluating alternatives

## Constraints

- Solo builder; learning time is self-directed alongside shipping
- No current OpenAI subscription; budget-conscious but willing to pay for the right tooling
- Strong frontend background; API/backend integration is in scope but not the primary identity
- Already invested in Cursor as an agentic coding environment (see [learncursor NOTES](https://github.com/SamSamskies/learncursor/blob/main/NOTES.md))

## Out of scope

- Becoming an ML researcher or training custom models
- Deep infra / MLOps (Kubernetes, GPU clusters, fine-tuning pipelines)
- Chasing every new model release — focus on durable platform skills
- Replacing Cursor with ChatGPT/Codex as primary dev environment (complementary, not competitive)
