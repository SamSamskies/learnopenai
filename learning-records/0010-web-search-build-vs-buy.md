# Web search: build vs buy

During Lesson 8, Sam explored whether built-in OpenAI `web_search` is the right production default, or whether a custom search provider (Firecrawl, Kagi) is cheaper or better.

**Evidence:** Lesson 8 practice; discussion of tool surcharges, `search_context_size`, Firecrawl free tier; request for a custom-search practice script.

**Implications:** Default to **built-in `web_search`** for learning and early MVPs (simplest, citations included). Reach for **Lesson 8's build path** (custom search provider) when cost at scale, retrieval control, caching, or result quality justify the two-turn loop from Lesson 7.

## OpenAI built-in (`practice/0008-web-search.mjs`)

| | |
|---|---|
| **Pattern** | Lesson 8 — one `responses.create`, platform runs search |
| **Model** | Needs web-search-capable model (e.g. `gpt-5`, `gpt-4.1-mini`); not `gpt-4.1-nano` |
| **Tool surcharge** | ~**$10 / 1k search actions** (~$0.01 each) |
| **Tokens** | Search content billed as model input; reasoning models may run **multiple** searches per request |
| **`search_context_size`** | `low` / `medium` / `high` — how much retrieved web content the model sees before answering; not an exact token count |
| **Citations** | `url_citation` annotations in response — must be visible in product UI |
| **Best for** | Fastest integration, low engineering overhead, acceptable per-query cost |

## Firecrawl (`practice/0008-firecrawl-search.mjs`)

| | |
|---|---|
| **Pattern** | Lesson 8 build path — custom `web_search` function; handler calls Firecrawl SDK |
| **Auth** | **Keyless by default** — no API key (~1k credits/month per IP). Optional free `FIRECRAWL_API_KEY` for higher limits |
| **Cost** | Free tier for learning/low volume; search ≈ 2 credits per 10 results; paid plans beyond that |
| **SDK** | `firecrawl` npm package — `new Firecrawl({})` for keyless |
| **Best for** | Budget-conscious MVPs, full-page scrape option (`scrapeOptions`), caching on your side |
| **Tradeoff** | Two-turn loop; you own citations, retries, and when to search |

## Kagi Search API (reference only)

| | |
|---|---|
| **Pattern** | Lesson 8 build path — custom tool POSTing to `https://kagi.com/api/v1/search` |
| **Cost** | ~**$12 / 1k searches** + OpenAI tokens — not cheaper than OpenAI built-in |
| **Best for** | Premium index quality, lenses/filters/domain rules when search quality > cost |

## Decision shorthand

```
Need simplest path + built-in citations     → OpenAI web_search (0008-web-search.mjs)
Need free tier / scrape full pages          → Firecrawl as custom tool (0008-firecrawl-search.mjs)
Need best search quality / control          → Kagi or similar as custom tool
High volume                                 → Cache aggressively; compare $/1k searches + token costs at your traffic
```

## Practice scripts

- **Buy:** `practice/0008-web-search.mjs` — built-in tool, one request
- **Build:** `practice/0008-firecrawl-search.mjs` — Firecrawl handler, two-turn loop (same question for easy comparison)
