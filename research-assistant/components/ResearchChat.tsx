"use client";

import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { createResearchState, dedupeCitations } from "@/lib/research-state";

function formatBriefPreview(preview: string): string {
  try {
    return JSON.stringify(JSON.parse(preview), null, 2);
  } catch {
    return preview;
  }
}

const briefMarkdownComponents: Components = {
  p: ({ children }) => <p className="mt-2 first:mt-0">{children}</p>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="mt-2 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mt-2 list-decimal pl-5">{children}</ol>,
  li: ({ children }) => <li className="mt-1">{children}</li>,
};

const inlineMarkdownComponents: Components = {
  ...briefMarkdownComponents,
  p: ({ children }) => <>{children}</>,
};

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

      {state.phase === "searching" && (
        <p>{state.searched ? "Searching the web…" : "Working…"}</p>
      )}

      {(state.phase === "streaming-answer" || state.phase === "done") &&
        state.briefPreview && (
          <details
            open={state.phase === "streaming-answer"}
            className="rounded-lg border border-zinc-300 dark:border-zinc-600"
          >
            <summary className="cursor-pointer px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
              Brief preview
            </summary>
            <pre className="overflow-x-auto border-t border-zinc-300 px-4 py-3 font-mono text-sm whitespace-pre-wrap dark:border-zinc-600">
              {formatBriefPreview(state.briefPreview)}
            </pre>
          </details>
        )}

      {state.phase === "done" && state.brief && (
        <article className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-600">
          <h2 className="text-lg font-semibold">{state.brief.headline}</h2>
          <div className="mt-2 text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={briefMarkdownComponents}
            >
              {state.brief.summary}
            </ReactMarkdown>
          </div>
          <ul className="mt-3 list-disc pl-5 text-sm">
            {state.brief.key_points.map((point) => (
              <li key={point}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={inlineMarkdownComponents}
                >
                  {point}
                </ReactMarkdown>
              </li>
            ))}
          </ul>
          {state.citations.length > 0 && (
            <div className="mt-4 border-t border-zinc-300 pt-4 dark:border-zinc-600">
              <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
                Sources
              </h3>
              <ul className="mt-2 flex flex-col gap-1.5 text-sm">
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
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-wide text-zinc-500">
            <span>
              {state.searched ? "Grounded with web search" : "No web search"}
            </span>
            <span>Confidence: {state.brief.confidence}</span>
          </div>
        </article>
      )}

      {state.phase === "error" && <p>{state.error}</p>}
    </>
  );
}
