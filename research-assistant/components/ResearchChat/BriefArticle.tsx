"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { dedupeSources, type Source } from "@/lib/research-state";
import type { ResearchBrief } from "@/lib/schemas";
import { TrustBar } from "./TrustBar";

function formatBriefForCopy(brief: ResearchBrief, sources: Source[]): string {
  const lines = [
    brief.headline,
    "",
    brief.summary,
    "",
    ...brief.key_points.map((p) => `• ${p}`),
  ];
  if (sources.length > 0) {
    lines.push("", "Sources:");
    for (const s of dedupeSources(sources)) {
      lines.push(
        s.kind === "url" ? `- ${s.title}: ${s.url}` : `- ${s.filename}`
      );
    }
  }
  return lines.join("\n");
}

function sourceKey(source: Source): string {
  return source.kind === "url" ? source.url : `file:${source.filename}`;
}

const briefMarkdownComponents: Components = {
  p: ({ children }) => (
    <p className="mt-3 first:mt-0 text-base leading-relaxed text-foreground">
      {children}
    </p>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-primary underline underline-offset-2 hover:text-primary-dark"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => (
    <ul className="mt-3 list-disc space-y-1 pl-5 text-base leading-relaxed">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-3 list-decimal space-y-1 pl-5 text-base leading-relaxed">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="text-foreground">{children}</li>,
};

const inlineMarkdownComponents: Components = {
  ...briefMarkdownComponents,
  p: ({ children }) => <>{children}</>,
};

function SourcePill({ source }: { source: Source }) {
  const pillClass =
    "inline-flex items-center rounded-lg border border-outline-variant bg-background px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-surface-container-low";

  if (source.kind === "url") {
    return (
      <a href={source.url} target="_blank" rel="noreferrer" className={pillClass}>
        {source.title}
      </a>
    );
  }
  return <span className={pillClass}>{source.filename}</span>;
}

export function BriefArticle({
  brief,
  sources,
  searched,
  searchedDocs,
}: {
  brief: ResearchBrief;
  sources: Source[];
  searched: boolean;
  searchedDocs: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copyBrief() {
    await navigator.clipboard.writeText(formatBriefForCopy(brief, sources));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article className="rounded-lg border border-outline-variant p-6">
      <span className="inline-block rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        Research Brief
      </span>

      <h2 className="font-serif mt-4 text-[28px] font-semibold leading-tight tracking-tight text-foreground sm:text-[32px]">
        {brief.headline}
      </h2>

      <TrustBar
        brief={brief}
        sources={sources}
        searched={searched}
        searchedDocs={searchedDocs}
      />

      <div className="mt-2 text-base leading-relaxed">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={briefMarkdownComponents}
        >
          {brief.summary}
        </ReactMarkdown>
      </div>

      <ol className="mt-4 list-decimal space-y-2 pl-5 text-base leading-relaxed">
        {brief.key_points.map((point) => (
          <li key={point} className="text-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={inlineMarkdownComponents}
            >
              {point}
            </ReactMarkdown>
          </li>
        ))}
      </ol>

      {sources.length > 0 && (
        <div id="brief-sources" className="mt-8 scroll-mt-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Sources &amp; Citations
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {dedupeSources(sources).map((s) => (
              <SourcePill key={sourceKey(s)} source={s} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={() => void copyBrief()}
          className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-container-low"
        >
          {copied ? "Copied!" : "Copy Brief"}
        </button>
      </div>
    </article>
  );
}
