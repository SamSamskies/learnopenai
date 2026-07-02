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

## Preferences

- **No org ID / KYC:** Will not verify OpenAI organization for gated features (e.g. reasoning summaries). Practice scripts should not require it.
- **Structured outputs default:** Zod + `client.responses.parse()` for TypeScript practice scripts. Raw `create` + `json_schema` kept as the wire-level reference (see learning record 0006).
- **Function tool parameters default:** Zod + `zodResponsesFunction` + `responses.parse()` for TypeScript practice scripts. Raw `create` + hand-written `parameters` JSON Schema kept as the wire-level reference (see learning record 0008).
- **Follow-up depth:** Asks good "why is it like this?" questions (`required` vs `properties`, SDK patterns) — worth capturing in learning records, not just chat.
