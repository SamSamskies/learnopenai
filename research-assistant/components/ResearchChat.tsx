"use client";

import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  createResearchState,
  dedupeCitations,
  type Citation,
  type ResearchUIState,
} from "@/lib/research-state";
import type { ResearchBrief } from "@/lib/schemas";

const SESSION_KEY = "researchSessionId";

type Turn = {
  question: string;
  brief: ResearchBrief;
  citations: Citation[];
  searched: boolean;
};

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

function resizeTextarea(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
}

function BriefArticle({
  brief,
  citations,
  searched,
}: {
  brief: ResearchBrief;
  citations: Citation[];
  searched: boolean;
}) {
  return (
    <article className="rounded-lg border border-zinc-300 p-4 dark:border-zinc-600">
      <h2 className="text-lg font-semibold">{brief.headline}</h2>
      <div className="mt-2 text-sm">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={briefMarkdownComponents}
        >
          {brief.summary}
        </ReactMarkdown>
      </div>
      <ul className="mt-3 list-disc pl-5 text-sm">
        {brief.key_points.map((point) => (
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
      {citations.length > 0 && (
        <div className="mt-4 border-t border-zinc-300 pt-4 dark:border-zinc-600">
          <h3 className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Sources
          </h3>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {dedupeCitations(citations).map((c) => (
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
        <span>{searched ? "Grounded with web search" : "No web search"}</span>
        <span>Confidence: {brief.confidence}</span>
      </div>
    </article>
  );
}

function LiveTurn({
  question,
  state,
}: {
  question: string;
  state: ResearchUIState;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900/50">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
          You
        </p>
        <p className="mt-1 text-sm">{question}</p>
      </div>

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
        <BriefArticle
          brief={state.brief}
          citations={state.citations}
          searched={state.searched}
        />
      )}

      {state.phase === "error" && <p>{state.error}</p>}
    </div>
  );
}

export function ResearchChat() {
  const [sessionId, setSessionId] = useState(() => {
    if (typeof window !== "undefined") {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) return stored;
      const id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
      return id;
    }
    return crypto.randomUUID();
  });
  const [turns, setTurns] = useState<Turn[]>([]);
  const [state, setState] = useState(createResearchState());
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const busy =
    state.phase !== "idle" &&
    state.phase !== "done" &&
    state.phase !== "error";

  const canSend = input.trim().length > 0 && !busy;

  async function sendMessage(message: string) {
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setPendingQuestion(message);
    setState(createResearchState({ phase: "searching" }));
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    let finalState = createResearchState({ phase: "searching" });

    try {
      await fetchEventSource("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, sessionId }),
        signal: abortRef.current.signal,
        async onopen(response) {
          if (!response.ok) {
            throw new Error(`Request failed (${response.status})`);
          }
        },
        onmessage(ev) {
          finalState = JSON.parse(ev.data);
          setState(finalState);
        },
        onerror(err) {
          throw err;
        },
      });

      if (finalState.phase === "done" && finalState.brief) {
        setTurns((prev) => [
          ...prev,
          {
            question: message,
            brief: finalState.brief!,
            citations: finalState.citations,
            searched: finalState.searched,
          },
        ]);
        setState(createResearchState());
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setState(
        createResearchState({
          phase: "error",
          error: err instanceof Error ? err.message : String(err),
        })
      );
    } finally {
      setPendingQuestion(null);
    }
  }

  async function newChat() {
    abortRef.current?.abort();

    try {
      await fetch(`/api/session?id=${encodeURIComponent(sessionId)}`, {
        method: "DELETE",
      });
    } catch {
      // ignore — client reset still applies
    }

    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    setSessionId(id);
    setTurns([]);
    setState(createResearchState());
    setPendingQuestion(null);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    void sendMessage(message);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const message = input.trim();
      if (!message || busy) return;
      void sendMessage(message);
    }
  }

  const showLiveTurn =
    pendingQuestion !== null || state.phase === "error";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => void newChat()}
          disabled={busy}
          className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          New chat
        </button>
      </div>

      {turns.map((turn, i) => (
        <div key={i} className="flex flex-col gap-4">
          <div className="rounded-lg border border-zinc-300 bg-zinc-50 px-4 py-3 dark:border-zinc-600 dark:bg-zinc-900/50">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              You
            </p>
            <p className="mt-1 text-sm">{turn.question}</p>
          </div>
          <BriefArticle
            brief={turn.brief}
            citations={turn.citations}
            searched={turn.searched}
          />
        </div>
      ))}

      {showLiveTurn && pendingQuestion && (
        <LiveTurn question={pendingQuestion} state={state} />
      )}

      {showLiveTurn && !pendingQuestion && state.phase === "error" && (
        <p>{state.error}</p>
      )}

      <form
        onSubmit={onSubmit}
        className="flex items-end gap-2 rounded-2xl border border-zinc-300 bg-white p-2 pl-4 shadow-sm focus-within:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-900 dark:focus-within:border-zinc-500"
      >
        <textarea
          ref={textareaRef}
          name="message"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            resizeTextarea(e.target);
          }}
          onKeyDown={onKeyDown}
          rows={1}
          className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent py-2.5 text-base text-foreground outline-none placeholder:text-zinc-500 disabled:cursor-not-allowed disabled:opacity-50 dark:placeholder:text-zinc-400"
          placeholder="Ask a research question…"
          disabled={busy}
        />
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send message"
          className="mb-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-900 text-white transition-colors disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-zinc-100 dark:text-zinc-900 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-[18px] w-[18px]"
            aria-hidden
          >
            <path d="M12 4 7.25 10.75H10.5v8.25h3v-8.25H16.75L12 4z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
