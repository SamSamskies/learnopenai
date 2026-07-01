# Prompt caching: structure, observe, and non-obvious partial hits

Completed Lesson 11 and `practice/0011-prompt-caching.mjs`. Can structure prompts static-front / dynamic-end, read `usage.input_tokens_details.cached_tokens`, and explain that caching discounts prefill — it is not conversation memory (`previous_response_id`).

**Evidence:** Ran the practice script; step 3 (chained) reliably showed ~95% cached on the instructions block. Step 2 (new thread, no `prompt_cache_key`) was often 0% — routing is probabilistic. Step 4 only showed 0% when instructions were a wholly different handbook body; tiny edits inside a huge repeated block still partially cached (~96%).

**Implications:** Ready for background mode (Lesson 12) — long-running jobs that outlive HTTP timeouts. In production, log `cached_tokens` per request; treat instruction deploys as new prefixes; optional `prompt_cache_key` when many tenants share the same long prefix.
