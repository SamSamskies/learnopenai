import { describe, expect, it } from "vitest";
import { extractSources } from "./extract-sources";

describe("extractSources", () => {
  it("extracts url sources from text-part url_citation annotations", () => {
    expect(
      extractSources([
        {
          type: "text",
          providerMetadata: {
            openai: {
              itemId: "msg_1",
              annotations: [
                {
                  type: "url_citation",
                  title: "Example",
                  url: "https://example.com",
                  start_index: 0,
                  end_index: 0,
                },
              ],
            },
          },
        },
      ])
    ).toEqual([
      {
        kind: "url",
        title: "Example",
        url: "https://example.com",
      },
    ]);
  });

  it("extracts file sources from text-part file_citation annotations", () => {
    expect(
      extractSources([
        {
          type: "text",
          providerMetadata: {
            openai: {
              itemId: "msg_1",
              annotations: [
                {
                  type: "file_citation",
                  filename: "spec.pdf",
                  file_id: "file_1",
                  index: 0,
                },
              ],
            },
          },
        },
      ])
    ).toEqual([{ kind: "file", filename: "spec.pdf" }]);
  });

  it("ignores AI SDK source content parts", () => {
    expect(
      extractSources([
        {
          type: "source",
          sourceType: "url",
          url: "https://nostr.com/",
          title: "Nostr Protocol",
        },
      ])
    ).toEqual([]);
  });
});
