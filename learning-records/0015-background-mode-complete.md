# Background mode: async jobs, poll, and store requirement

Completed Lesson 12 and `practice/0012-background-mode.mjs`. Can start a background response with `background: true` + `store: true`, poll `responses.retrieve(id)` until terminal status, and map the pattern to a 202-accepted product flow (save id, notify when done).

**Evidence:** Completed lesson 12; practice script demonstrates immediate return with `queued`/`in_progress` then `completed`.

**Implications:** Ready for reasoning models (Lesson 13) — when to pay for thinking tokens and tune `reasoning.effort`. Background mode pairs well with high-effort reasoning jobs that exceed HTTP timeouts.
