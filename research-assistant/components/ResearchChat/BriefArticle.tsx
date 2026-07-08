"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { dedupeSources, type Source } from "@/lib/research-state";
import { prepareCitedText, stripCitations } from "@/lib/citations";
import type { ResearchBrief } from "@/lib/schemas";
import { TrustBar } from "./TrustBar";

function formatBriefForCopy(brief: ResearchBrief, sources: Source[]): string {
  const lines = [
    brief.headline,
    "",
    stripCitations(brief.summary, sources),
    "",
    ...brief.key_points.map((p) => `• ${p}`),
  ];
  if (sources.length > 0) {
    lines.push("", "Sources:");
    for (const [i, s] of dedupeSources(sources).entries()) {
      const n = i + 1;
      lines.push(
        s.kind === "url"
          ? `[${n}] ${s.title}: ${s.url}`
          : `[${n}] ${s.filename}`
      );
    }
  }
  return lines.join("\n");
}

function sourceKey(source: Source): string {
  return source.kind === "url" ? source.url : `file:${source.filename}`;
}

function sourceDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
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

function citationComponents(sourceCount: number): Components {
  return {
    ...inlineMarkdownComponents,
    a: ({ href, children }) => {
      const m = href?.match(/^#source-(\d+)$/);
      if (m) {
        const n = Number(m[1]);
        if (n < 1 || n > sourceCount) {
          return (
            <span className="text-on-surface-variant" title="Source not available">
              {children}
            </span>
          );
        }
        return (
          <sup className="relative top-[-0.35em] ml-0.5 inline-block">
            <a
              href={href}
              className="inline-flex min-w-[1.15rem] items-center justify-center rounded bg-primary/10 px-0.5 text-[0.65rem] font-semibold leading-none text-primary no-underline hover:bg-primary/20"
              aria-label={`Source ${n}`}
            >
              {children}
            </a>
          </sup>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary-dark"
        >
          {children}
        </a>
      );
    },
  };
}

function NumberedSource({ source, n }: { source: Source; n: number }) {
  const rowClass =
    "flex scroll-mt-20 gap-3 rounded-lg py-2 target:bg-surface-container-low";
  const badgeClass =
    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-[10px] font-semibold text-on-surface-variant";

  if (source.kind === "url") {
    const domain = sourceDomain(source.url);
    return (
      <a
        id={`source-${n}`}
        href={source.url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Open source ${n}: ${source.title}`}
        className={`${rowClass} group transition-colors hover:bg-surface-container-low`}
      >
        <span className={badgeClass} aria-hidden>
          {n}
        </span>
        <div className="flex min-w-0 items-start gap-2">
          <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
            alt=""
            width={16}
            height={16}
            className="mt-0.5 shrink-0 rounded-sm"
          />
          <div className="min-w-0">
            <span className="text-sm font-medium text-primary group-hover:underline">
              {source.title}
            </span>
            <p className="truncate text-xs text-on-surface-variant">{domain}</p>
          </div>
        </div>
      </a>
    );
  }

  return (
    <div id={`source-${n}`} className={rowClass}>
      <span className={badgeClass} aria-hidden>
        {n}
      </span>
      <div className="min-w-0">
        <span className="font-mono text-sm text-foreground">{source.filename}</span>
        <p className="text-xs text-on-surface-variant">Uploaded document</p>
      </div>
    </div>
  );
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
  const numberedSources = dedupeSources(sources);

  async function copyBrief() {
    await navigator.clipboard.writeText(formatBriefForCopy(brief, sources));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <article className="rounded-lg border border-outline-variant p-6">
      <h2 className="font-serif text-[28px] font-semibold leading-tight tracking-tight text-foreground sm:text-[32px]">
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
          {stripCitations(brief.summary, sources)}
        </ReactMarkdown>
      </div>

      <ul className="mt-4 list-disc space-y-2 pl-5 text-base leading-relaxed">
        {brief.key_points.map((point) => (
          <li key={point} className="text-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={citationComponents(numberedSources.length)}
            >
              {prepareCitedText(point, sources)}
            </ReactMarkdown>
          </li>
        ))}
      </ul>

      {sources.length > 0 && (
        <div id="brief-sources" className="mt-8 scroll-mt-20">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
            Sources &amp; Citations
          </h3>
          <div className="mt-3 flex flex-col divide-y divide-outline-variant/60">
            {numberedSources.map((s, i) => (
              <NumberedSource key={sourceKey(s)} source={s} n={i + 1} />
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
