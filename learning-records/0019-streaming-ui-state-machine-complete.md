# Streaming UI state machine complete

Sam completed Lesson 16 and `practice/0016-ui-state-machine.mjs`. Can map Responses API stream events to UI phases (idle → streaming-args → running-handler → streaming-card → done), separate server transport from client reducer state, and defer typed structured output until `phase === "done"`.

**Evidence:** User reported lesson 16 complete.

**Implications:** The capstone flow now has both terminal implementation and UI mental model. Next: file search for doc-Q&A (mission build-vs-buy for RAG) or Agents SDK when orchestration outgrows a hand-rolled loop.
