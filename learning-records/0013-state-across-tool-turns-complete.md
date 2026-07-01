# State across tool turns complete

Sam completed Lesson 10 and `practice/0010-conversation-state.mjs`. Understands saving `second.id` (not `first.id`) after a tool loop, chaining multi-turn chat with tools, and that `instructions` + `tools` must be resent every turn while prior tool results ride the server-side chain.

**Evidence:** User reported lesson 10 complete; practice script demonstrates three-message thread with two tool lookups and a memory-only comparison on message 3.

**Implications:** Ready for prompt caching — why chained threads bill input tokens each turn, how repeated `instructions` prefixes get discounted, and product-level prompt structure. Background mode and MCP can follow once production economics are intentional.
