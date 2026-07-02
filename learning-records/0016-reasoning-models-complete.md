# Reasoning models: effort, billing, evals, and when nano fails

Completed Lesson 13 and `practice/0013-reasoning-models.mjs`. Can set `reasoning: { effort: "low" | "high" }` on reasoning-capable models, read `usage.output_tokens_details.reasoning_tokens`, and choose reasoning vs cheap models based on evals — not single lucky runs.

**Evidence:** Ran bat-and-ball puzzle at low vs high effort on `o4-mini` (both answered 5¢). Compared `gpt-4.1-nano` × 3 — inconsistent (10¢ trap answer on reruns). Skipped reasoning summaries (org ID verification not desired). Noted `low` effort can show 0 `reasoning_tokens` on easy prompts (adaptive); `high` spends more.

**Implications:** Ready for remote MCP (Lesson 14) — third built-in tool pattern after custom functions and platform tools like `web_search`. Key product takeaway: trap/cognitive puzzles are where cheap models flip; run eval suites before assuming nano is enough. Reasoning summaries optional — not required for the mission.
