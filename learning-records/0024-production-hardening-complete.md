# Production hardening complete

Sam completed Lesson 22 and `practice/0022-production-hardening.mjs`. Can guard a streaming triage route with app-level Bearer auth and per-IP rate limits before SSE opens, return pre-stream HTTP errors as JSON (`401`/`429`), handle mid-stream failures as `phase: "error"` SSE snapshots, and branch the fetch client on `!res.ok` before parsing SSE.

**Evidence:** User reported lesson 22 complete and ready for the next lesson.

**Implications:** Capstone is ship-shaped at the route level (auth, rate limits, two error channels). Next: multi-turn conversation state on the same assistant — `previous_response_id` per session on the hardened route — then cross-provider comparison (mission success criterion #4).
