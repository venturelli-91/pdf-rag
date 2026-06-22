import { attachCitations, buildCitations } from "./citations";

const chunks = [
  {
    text: "Photosynthesis converts light energy into chemical energy.",
    documentId: "doc-1",
    documentName: "biology.pdf",
    pageNumber: 3,
    chunkIndex: 0,
    score: 0.12,
  },
  {
    text: "Chlorophyll absorbs light in the visible spectrum.",
    documentId: "doc-1",
    documentName: "biology.pdf",
    pageNumber: 3,
    chunkIndex: 1,
    score: 0.18,
  },
  {
    text: "The Krebs cycle occurs in the mitochondria.",
    documentId: "doc-1",
    documentName: "biology.pdf",
    pageNumber: 7,
    chunkIndex: 2,
    score: 0.21,
  },
  {
    text: "Cellular respiration releases stored energy.",
    documentId: "doc-2",
    documentName: "chemistry.pdf",
    pageNumber: 1,
    chunkIndex: 0,
    score: 0.25,
  },
];

describe("buildCitations", () => {
  it("returns an empty list when there are no chunks", () => {
    expect(buildCitations([])).toEqual([]);
  });

  it("builds one citation per document name and page number", () => {
    const citations = buildCitations(chunks);

    expect(citations).toEqual([
      {
        documentName: "biology.pdf",
        pageNumber: 3,
        passages: [
          "Photosynthesis converts light energy into chemical energy.",
          "Chlorophyll absorbs light in the visible spectrum.",
        ],
      },
      {
        documentName: "biology.pdf",
        pageNumber: 7,
        passages: ["The Krebs cycle occurs in the mitochondria."],
      },
      {
        documentName: "chemistry.pdf",
        pageNumber: 1,
        passages: ["Cellular respiration releases stored energy."],
      },
    ]);
  });

  it("dedupes identical passage text within the same document and page", () => {
    const duplicate = [chunks[0], { ...chunks[0], chunkIndex: 5, score: 0.5 }];

    const citations = buildCitations(duplicate);

    expect(citations).toHaveLength(1);
    expect(citations[0].passages).toEqual([chunks[0].text]);
  });
});

describe("attachCitations", () => {
  it("attaches citations derived from the chunks used to generate the answer", () => {
    const result = attachCitations(
      { answer: "Photosynthesis happens in chloroplasts.", grounded: true },
      chunks.slice(0, 2),
    );

    expect(result.answer).toBe("Photosynthesis happens in chloroplasts.");
    expect(result.grounded).toBe(true);
    expect(result.citations).toEqual([
      {
        documentName: "biology.pdf",
        pageNumber: 3,
        passages: [chunks[0].text, chunks[1].text],
      },
    ]);
  });

  it("returns no citations for an ungrounded answer", () => {
    const result = attachCitations(
      { answer: "I don't have enough information.", grounded: false },
      [],
    );

    expect(result.citations).toEqual([]);
  });
});
