# Stream structured output completed

Sam completed Lesson 6: ran `practice/0006-stream-structured.mjs`, understood that structured deltas are raw JSON text chunks (not per-field events), and knows to read `output_parsed` only after `finalResponse()`.

**Evidence:** User reported lesson 6 complete with no follow-up questions.

**Implications:** Ready for **custom function tools** — the agentic loop where the model requests actions and your code executes them. Keep Zod + `parse`/`stream` as default for structured text; function tools use the same JSON Schema rules for `parameters`.
