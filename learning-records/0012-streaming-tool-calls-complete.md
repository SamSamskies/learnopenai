# Streaming tool calls complete

Sam completed Lesson 9 and `practice/0009-stream-tools.mjs`. Understands turn-1 tool events (`output_item.added`, `function_call_arguments.delta/done`), buffering args until JSON is complete, and streaming turn-2 text with `function_call_output`.

**Evidence:** User reported lesson 9 complete; practice script matches the two-turn streaming pattern from the lesson.

**Implications:** Ready for conversation state across tool loops — which `response.id` becomes `lastResponseId` after a tool cycle, and multi-turn chat with tools. Prompt caching and background mode can follow once state management is product-grade.
