"use client";

import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useRef, useState } from "react";
import { createResearchState, dedupeCitations } from "@/lib/research-state";

export function ResearchChat() {
  const [state, setState] = useState(createResearchState());
  const abortRef = useRef<AbortController | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const message = new FormData(form).get("message");
    if (typeof message !== "string" || !message.trim()) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState(createResearchState({ phase: "searching" }));

    try {
      await fetchEventSource("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() }),
        signal: abortRef.current.signal,
        async onopen(response) {
          if (!response.ok) {
            throw new Error(`Request failed (${response.status})`);
          }
        },
        onmessage(ev) {
          setState(JSON.parse(ev.data));
        },
        onerror(err) {
          throw err;
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState(
        createResearchState({
          phase: "error",
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }
  }

  const busy =
    state.phase !== "idle" &&
    state.phase !== "done" &&
    state.phase !== "error";

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <textarea
          name="message"
          className="min-h-32 w-full resize-y rounded-lg border border-zinc-300 bg-white px-4 py-3 text-base text-foreground outline-none placeholder:text-zinc-500 focus:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:bg-zinc-800 dark:placeholder:text-zinc-400 dark:focus:border-zinc-500"
          placeholder="Ask a research question…"
          rows={4}
          disabled={busy}
        />
        <button
          type="submit"
          disabled={busy}
          className="self-end rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Send
        </button>
      </form>

      {state.phase === "searching" && <p>Searching the web…</p>}

      {(state.phase === "streaming-answer" || state.phase === "done") &&
        state.answerPreview && (
          <details
            open={state.phase === "streaming-answer"}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600"
          >
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Live draft
            </summary>
            <p className="border-t border-zinc-300 px-4 py-3 text-sm whitespace-pre-wrap dark:border-zinc-600">
              {state.answerPreview}
            </p>
          </details>
        )}

      {state.phase === "done" && (
        <>
          <p>{state.answer}</p>
          {state.citations.length > 0 && (
            <ul className="flex flex-col gap-2 pl-5 list-disc marker:text-zinc-400">
              {dedupeCitations(state.citations).map((c) => (
                <li key={c.url}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    {c.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {state.phase === "error" && <p>{state.error}</p>}
    </>
  );
}
