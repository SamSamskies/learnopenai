import { describe, expect, it } from "vitest";
import { prepareCitedText } from "@/lib/citations";
import { buildCitationIndexMap, type Source } from "@/lib/research-state";

describe("buildCitationIndexMap", () => {
  it("maps duplicate annotations to the same deduplicated index", () => {
    const sources: Source[] = [
      { kind: "url", title: "A", url: "https://a.com/1" },
      { kind: "url", title: "B", url: "https://b.com/" },
      { kind: "url", title: "A again", url: "https://a.com/1" },
      { kind: "url", title: "C", url: "https://c.com/" },
    ];

    expect(buildCitationIndexMap(sources)).toEqual(
      new Map([
        [1, 1],
        [2, 2],
        [3, 1],
        [4, 3],
      ])
    );
  });
});

describe("prepareCitedText", () => {
  const sources: Source[] = [
    { kind: "url", title: "ICML", url: "https://icml.cc/2026" },
    { kind: "url", title: "NeurIPS", url: "https://confroll.com/neurips" },
    { kind: "url", title: "ICML again", url: "https://icml.cc/2026" },
  ];

  it("remaps raw annotation indices to deduplicated source indices", () => {
    expect(prepareCitedText("Claim with refs [1][2][3].", sources)).toBe(
      "Claim with refs [\\[1\\]](#source-1)[\\[2\\]](#source-2)."
    );
  });

  it("converts parenthesized domains to citation markers", () => {
    expect(
      prepareCitedText(
        "ICML runs in Seoul (icml.cc). NeurIPS is in Sydney (confroll.com).",
        sources
      )
    ).toBe(
      "ICML runs in Seoul [\\[1\\]](#source-1). NeurIPS is in Sydney [\\[2\\]](#source-2)."
    );
  });

  it("strips parenthesized markdown domain links and keeps numeric markers", () => {
    const sources: Source[] = [
      { kind: "url", title: "Nostr How", url: "https://nostr.how/" },
      { kind: "url", title: "Nostr UK", url: "https://nostr.co.uk/" },
    ];
    expect(
      prepareCitedText(
        "Simple protocol. ([nostr.how](https://nostr.how/) [1])",
        sources
      )
    ).toBe("Simple protocol. [\\[1\\]](#source-1)");
    expect(
      prepareCitedText(
        "Not centralized. ([nostr.co.uk] [2])",
        sources
      )
    ).toBe("Not centralized. [\\[2\\]](#source-2)");
  });

  it("strips standalone markdown domain links", () => {
    const sources: Source[] = [
      { kind: "url", title: "Wiki", url: "https://en.wikipedia.org/wiki/Nostr" },
    ];
    expect(
      prepareCitedText(
        "Tradeoffs exist. [en.wikipedia.org](https://en.wikipedia.org/wiki/Nostr) [1]",
        sources
      )
    ).toBe("Tradeoffs exist. [\\[1\\]](#source-1)");
  });

  it("maps each distinct url to its own citation number", () => {
    const sources: Source[] = [
      {
        kind: "url",
        title: "What is Nostr",
        url: "https://nostr.how/en/what-is-nostr?utm_source=openai",
      },
      {
        kind: "url",
        title: "NIP-01",
        url: "https://nostr.co.uk/nips/nip-01/?utm_source=openai",
      },
      {
        kind: "url",
        title: "The protocol",
        url: "https://nostr.how/en/the-protocol?utm_source=openai",
      },
      {
        kind: "url",
        title: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Nostr?utm_source=openai",
      },
    ];

    expect(
      prepareCitedText(
        'Summary. ([nostr.how](https://nostr.how/en/what-is-nostr?utm_source=openai))',
        sources
      )
    ).toBe("Summary. [\\[1\\]](#source-1)");

    expect(
      prepareCitedText(
        'Extensibility. ([nostr.how](https://nostr.how/en/the-protocol?utm_source=openai))',
        sources
      )
    ).toBe("Extensibility. [\\[3\\]](#source-3)");

    expect(
      prepareCitedText(
        'Tradeoffs. ([en.wikipedia.org](https://en.wikipedia.org/wiki/Nostr?utm_source=openai))',
        sources
      )
    ).toBe("Tradeoffs. [\\[4\\]](#source-4)");
  });

  it("keeps url-resolved markers on deduped indices when raw annotations duplicate", () => {
    const sources: Source[] = [
      { kind: "url", title: "A", url: "https://nostr.how/a" },
      { kind: "url", title: "B", url: "https://nostr.how/b" },
      { kind: "url", title: "C", url: "https://nostr.com/relays" },
      { kind: "url", title: "D", url: "https://nostr.com/info" },
      {
        kind: "url",
        title: "E",
        url: "https://nostr.co.uk/learn/how-nostr-works/",
      },
      {
        kind: "url",
        title: "E dup",
        url: "https://nostr.co.uk/learn/how-nostr-works/",
      },
    ];

    expect(
      prepareCitedText(
        "Tradeoffs. ([nostr.co.uk](https://nostr.co.uk/learn/how-nostr-works/?utm_source=openai))",
        sources
      )
    ).toBe("Tradeoffs. [\\[5\\]](#source-5)");
  });

  it("removes markers when there are no sources", () => {
    expect(prepareCitedText("Fact [1][2].", [])).toBe("Fact.");
  });
});
