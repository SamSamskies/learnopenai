# Function tool schema conventions

During Lesson 7, Sam asked whether tool `parameters` can be defined with Zod (yes) and which approach is more common in practice.

**Evidence:** User requested Zod practice script; asked about common usage; asked to document conventions like structured outputs.

**Implications:** Default to **Zod + `zodResponsesFunction` + `parse()`** for TS product code. Keep raw `parameters` JSON Schema visible as the wire primitive. Same JSON Schema strict rules as structured outputs apply to `parameters`.

## `create` + `parameters` vs `parse` + Zod

| Approach | When to use |
|----------|-------------|
| `client.responses.create()` + hand-written `tools[].parameters` (JSON Schema) | Any language; learning the platform primitive; full control over the exact schema on the wire; debugging curl/logs |
| `client.responses.parse()` + `zodResponsesFunction()` | TypeScript/Node product code (Sam's default); one schema for API shape + validation; `parsed_arguments` without manual `JSON.parse` |

The API always receives JSON Schema in `parameters` — Zod is a client-side convenience that converts and validates. Avoid `create` + `zodResponsesFunction` (schema works, no auto-parse).

Chat Completions uses `zodFunction` instead of `zodResponsesFunction`; `runTools()` automates the loop there. Responses API still uses the manual two-turn loop from Lesson 7.

## Reading `parsed_arguments`

With `responses.parse()` + `zodResponsesFunction`, validated args are on the function call item. As of `openai@6.45`, the SDK nests them at `toolCall.parsed_arguments.parsed_arguments` — use that or fall back to `Schema.parse(JSON.parse(toolCall.arguments))` with the same Zod object.

## Practice convention

- **Ship with:** `zodResponsesFunction` + `parse` — see `practice/0007-function-tools-zod.mjs`.
- **Understand:** raw `parameters` + `create` — see `practice/0007-function-tools.mjs`.

## Ecosystem note

In TypeScript repos using the OpenAI SDK, Zod helpers are the common product default. Across the wider API (Python/Pydantic, other languages, non-SDK clients), hand-written or generated JSON Schema is the universal primitive.
