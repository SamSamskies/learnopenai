import {
  buildCitationIndexMap,
  dedupeSources,
  type Source,
} from "@/lib/research-state";

const CITATION_CLUSTER_RE = /(?:\s*\[\d+\])+/g;
const INLINE_DOMAIN_IN_PARENS_RE =
  /\s*\((?:https?:\/\/)?(?:www\.)?[\w.-]+\.[a-z]{2,}(?:\/[^\s)]*)?\)/gi;
const MARKDOWN_LINK_RE = /\s*\[([^\]]+)\]\(([^)]+)\)/g;

function urlCitationKeys(url: string): string[] {
  try {
    const parsed = new URL(url);
    const full = parsed.href.replace(/\/$/, "");
    parsed.search = "";
    const withoutQuery = parsed.href.replace(/\/$/, "");
    return full === withoutQuery ? [full] : [full, withoutQuery];
  } catch {
    return [url];
  }
}

function buildUrlIndex(sources: Source[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const [i, source] of dedupeSources(sources).entries()) {
    if (source.kind === "url") {
      for (const key of urlCitationKeys(source.url)) {
        index.set(key, i + 1);
      }
    }
  }
  return index;
}

function buildDomainFallbackIndex(sources: Source[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const [i, source] of dedupeSources(sources).entries()) {
    if (source.kind === "url") {
      try {
        const domain = new URL(source.url).hostname
          .replace(/^www\./, "")
          .toLowerCase();
        if (!index.has(domain)) index.set(domain, i + 1);
      } catch {
        // skip invalid URLs
      }
    }
  }
  return index;
}

function domainFromLabel(label: string): string {
  return label
    .replace(/^https?:\/\//, "")
    .split("/")[0]
    .replace(/^www\./, "")
    .toLowerCase();
}

function lookupUrlIndex(
  urlIndex: Map<string, number>,
  url: string
): number | undefined {
  for (const key of urlCitationKeys(url)) {
    const n = urlIndex.get(key);
    if (n) return n;
  }
  return undefined;
}

function markerForCitationTarget(
  urlIndex: Map<string, number>,
  domainFallback: Map<string, number>,
  {
    url,
    label,
  }: {
    url?: string;
    label?: string;
  }
): string {
  if (url) {
    const n = lookupUrlIndex(urlIndex, url);
    if (n) return ` [${n}]`;
  }
  if (label) {
    const n = domainFallback.get(domainFromLabel(label));
    if (n) return ` [${n}]`;
  }
  return "";
}

function stripInlineSourceRefs(text: string, sources: Source[]): string {
  const urlIndex = buildUrlIndex(sources);
  const domainFallback = buildDomainFallbackIndex(sources);

  let result = text;

  // ([label](url) [n]?) — resolve by url, keep explicit numeric marker
  result = result.replace(
    /\s*\(\s*\[([^\]]+)\]\(([^)]+)\)\s*(\[\d+\])?\s*\)/g,
    (_m, label: string, url: string, marker?: string) => {
      if (marker) return ` ${marker}`;
      return markerForCitationTarget(urlIndex, domainFallback, { url, label });
    }
  );

  // ([domain] [n]?) — bracketed domain without url
  result = result.replace(
    /\s*\(\s*\[((?:www\.)?[\w.-]+\.[a-z]{2,})\]\s*(\[\d+\])?\s*\)/gi,
    (_m, domain: string, marker?: string) =>
      marker
        ? ` ${marker}`
        : markerForCitationTarget(urlIndex, domainFallback, { label: domain })
  );

  // standalone [label](url)
  result = result.replace(MARKDOWN_LINK_RE, (_m, label: string, url: string) =>
    markerForCitationTarget(urlIndex, domainFallback, { url, label })
  );

  // bare [domain.tld] without markdown url
  result = result.replace(
    /\s*\[(?!\\?\d+\])((?:www\.)?[\w.-]+\.[a-z]{2,})\](?!\()/gi,
    (_m, domain: string) =>
      markerForCitationTarget(urlIndex, domainFallback, { label: domain })
  );

  // (domain.tld) bare
  result = result.replace(INLINE_DOMAIN_IN_PARENS_RE, (match) => {
    const inner = match.trim().slice(1, -1);
    return markerForCitationTarget(urlIndex, domainFallback, { label: inner });
  });

  return result;
}

function remapCitationNumbers(
  text: string,
  indexMap: Map<number, number>
): string {
  return text.replace(CITATION_CLUSTER_RE, (cluster) => {
    const remapped = [
      ...cluster.matchAll(/\[(\d+)\]/g),
    ]
      .map((match) => indexMap.get(Number(match[1])))
      .filter((n): n is number => n !== undefined);
    const unique = [...new Set(remapped)];
    if (unique.length === 0) return "";
    const markers = unique.map((n) => `[${n}]`).join("");
    return /^\s/.test(cluster) ? ` ${markers}` : markers;
  });
}

function normalizeMarkerClusters(text: string): string {
  return text.replace(CITATION_CLUSTER_RE, (cluster) => {
    const numbers = [
      ...cluster.matchAll(/\[(\d+)\]/g),
    ].map((match) => Number(match[1]));
    const unique = [...new Set(numbers)];
    if (unique.length === 0) return "";
    const markers = unique.map((n) => `[${n}]`).join("");
    return /^\s/.test(cluster) ? ` ${markers}` : markers;
  });
}

function withCitationLinks(text: string): string {
  return text.replace(
    /\[(\d+)\]/g,
    (_match, n: string) => `[\\[${n}\\]](#source-${n})`
  );
}

export function prepareCitedText(text: string, sources: Source[]): string {
  const sourceCount = dedupeSources(sources).length;
  if (sourceCount === 0) {
    return text
      .replace(CITATION_CLUSTER_RE, "")
      .replace(MARKDOWN_LINK_RE, "")
      .replace(INLINE_DOMAIN_IN_PARENS_RE, "");
  }

  const indexMap = buildCitationIndexMap(sources);
  return withCitationLinks(
    normalizeMarkerClusters(
      stripInlineSourceRefs(remapCitationNumbers(text, indexMap), sources)
    )
  );
}
