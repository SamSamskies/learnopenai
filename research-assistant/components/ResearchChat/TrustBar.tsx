import type { ResearchBrief } from "@/lib/schemas";
import type { Source } from "@/lib/research-state";
import { dedupeSources } from "@/lib/research-state";

const toneClass = {
  positive: "border-good/30 bg-good/5 text-good",
  caution: "border-warn/30 bg-warn/5 text-warn",
  warning: "border-accent/30 bg-accent-soft text-accent",
} as const;

function generateConfidenceCopy(level: ResearchBrief["confidence"]): {
  label: string;
  tone: keyof typeof toneClass;
} {
  switch (level) {
    case "high":
      return {
        label: "Well-supported by retrieved sources",
        tone: "positive",
      };
    case "medium":
      return {
        label: "Partially supported — verify key claims",
        tone: "caution",
      };
    case "low":
      return {
        label: "Limited source coverage — treat as a draft",
        tone: "warning",
      };
  }
}

export function TrustBar({
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
  const { label, tone } = generateConfidenceCopy(brief.confidence);
  const count = dedupeSources(sources).length;

  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-2"
      aria-label="Trust and provenance"
    >
      <span
        className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${toneClass[tone]}`}
      >
        {label}
      </span>

      {searched && (
        <span className="rounded-lg border border-outline-variant px-2.5 py-1 text-xs text-on-surface-variant">
          Web search
        </span>
      )}
      {searchedDocs && (
        <span className="rounded-lg border border-outline-variant px-2.5 py-1 text-xs text-on-surface-variant">
          Your documents
        </span>
      )}
      {!searched && !searchedDocs && (
        <span className="rounded-lg border border-outline-variant px-2.5 py-1 text-xs text-on-surface-variant">
          Model knowledge only
        </span>
      )}

      {count > 0 ? (
        <a
          href="#brief-sources"
          className="rounded-lg border border-outline-variant px-2.5 py-1 text-xs text-primary hover:bg-surface-container-low"
        >
          {count} {count === 1 ? "source" : "sources"}
        </a>
      ) : (
        <span className="text-xs text-on-surface-variant">
          No sources cited
        </span>
      )}
    </div>
  );
}