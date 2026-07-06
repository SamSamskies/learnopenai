# Research Assistant structured brief complete

Sam completed Lesson 28: `ResearchBrief` Zod schema, `responses.stream()` + `zodTextFormat`, `briefPreview` JSON streaming, typed brief card at `done`, markdown rendering for summary/key points, sources on the card, and `searched` footer metadata.

**Evidence:** User reported lesson 28 complete and asked for the next lesson.

**Implications:** Ready for Lesson 29 — wire `sessionId` + `previous_response_id` so follow-up questions keep context. Research is single-response-per-turn (unlike triage's two-turn tool loop); save `response.id` from `finalResponse()`. Client should show thread history so follow-ups are verifiable.
