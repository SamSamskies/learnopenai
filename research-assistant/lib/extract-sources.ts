import type { OpenaiResponsesTextProviderMetadata } from "@ai-sdk/openai";
import type { Source } from "@/lib/research-state";

type ContentPart = {
  type: string;
  providerMetadata?: unknown;
};

/** Citations come from url_citation / file_citation annotations on text parts only. */
export function extractSources(content: ContentPart[]): Source[] {
  const sources: Source[] = [];

  for (const part of content) {
    if (part.type !== "text") continue;

    const metadata = part.providerMetadata as
      | OpenaiResponsesTextProviderMetadata
      | undefined;

    for (const annotation of metadata?.openai?.annotations ?? []) {
      if (annotation.type === "url_citation") {
        sources.push({
          kind: "url",
          title: annotation.title ?? annotation.url,
          url: annotation.url,
        });
      }
      if (annotation.type === "file_citation") {
        sources.push({
          kind: "file",
          filename: annotation.filename,
        });
      }
    }
  }

  return sources;
}
