# Structured outputs completed

Sam completed Lesson 5: ran `practice/0005-structured.mjs` and `practice/0005-structured-zod.mjs`, compared structured vs unstructured extraction, and asked sharp follow-up questions about JSON Schema semantics and SDK patterns.

**Evidence:** User reported lesson 5 complete; explored `required` vs `properties`, and when to use `create` + `json_schema` vs `parse` + Zod.

**Implications:** Ready to combine streaming with structured output — the pattern behind live AI product UIs that eventually render typed cards/forms. Default to **Zod + `parse`** for TS practice scripts; keep raw `json_schema` visible as the wire primitive.

## Notes captured from session

### `create` + `json_schema` vs `parse` + Zod

| Approach | When to use |
|----------|-------------|
| `client.responses.create()` + hand-written `text.format` (`json_schema`) | Any language; learning the platform primitive; full control over the exact schema on the wire; escape hatch when Zod conversion fails |
| `client.responses.parse()` + `zodTextFormat` | TypeScript/Node product code (Sam's default); one schema for API shape + validation; `output_parsed` without manual `JSON.parse` |

The API always receives `json_schema` — Zod is a client-side convenience that converts and validates. Avoid `create` + `zodTextFormat` (schema works, no auto-parse).

### `properties` vs `required`

- `properties` defines allowed fields and their types — does **not** make them mandatory.
- `required` lists which fields must always appear.
- OpenAI **strict** mode forces every `properties` key into `required` + `additionalProperties: false` — feels redundant, but that's JSON Schema semantics tightened for reliable UIs.

### Practice convention going forward

- **Ship with:** Zod + `parse` (or `stream` + `finalResponse` when streaming).
- **Understand:** raw `json_schema` + `create` — one example per concept kept in repo for reference.
