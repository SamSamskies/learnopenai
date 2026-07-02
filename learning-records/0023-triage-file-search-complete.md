# Triage with file search complete

Sam completed Lesson 21 and `practice/0021-triage-file-search.mjs`. Can register `get_feature_status` and `file_search` on one route, branch the server phase machine on `function_call` vs `file_search_call`, render two UI paths (`path: backlog | docs`) over the same SSE contract, and surface `file_citation` filenames for doc-grounded answers.

**Evidence:** User reported lesson 21 complete and ready for the next lesson. Follow-up clarified that docs-path slowness is hosted `file_search` retrieval (not `gpt-4.1-nano` being slower than larger models).

**Implications:** Mission capstone is feature-complete at the practice-server level (streaming UI, custom tools, structured output, file search, fetch client). Next: production hardening — auth on the route, pre-stream HTTP errors vs mid-stream SSE errors, rate limits — before cross-provider comparison or multi-turn conversation state.
