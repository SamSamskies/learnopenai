# Agents SDK complete

Sam completed Lesson 18 and `practice/0018-agents-sdk.mjs`. Can define an `Agent` with `tool()` + Zod `execute`, set `outputType` for typed `finalOutput`, and let `run()` handle the tool loop instead of hand-rolling two turns. Explored why `get_feature_status` can fire twice when tools stay available across structured-output turns — explicit instructions (“call at most once”) fixed it in practice, but the capstone split (tools off on turn 2) remains the hard guarantee at scale.

**Evidence:** User reported lesson 18 complete; follow-up session tested instruction tweak and confirmed single tool call in traces.

**Implications:** Can choose raw Responses API (custom streaming UI) vs Agents SDK (orchestration, traces) per feature. Next: ship the capstone end-to-end — SSE from a server route to a browser UI (mission success criterion #1).
