import type { ParsedDocument } from "@/modules/pdf-parser";
import { chunkDocument } from "./chunker";
import { ChunkingError } from "./errors";

function buildDocument(pages: string[]): ParsedDocument {
  return {
    pages: pages.map((text, index) => ({ pageNumber: index + 1, text })),
  };
}

describe("chunkDocument", () => {
  afterEach(() => {
    Reflect.deleteProperty(process.env, "CHUNKING_CHUNK_SIZE");
    Reflect.deleteProperty(process.env, "CHUNKING_CHUNK_OVERLAP");
  });

  it("uses CHUNKING_CHUNK_SIZE/CHUNKING_CHUNK_OVERLAP as defaults when no options are given", () => {
    const document = buildDocument(["a".repeat(100)]);

    process.env.CHUNKING_CHUNK_SIZE = "20";
    process.env.CHUNKING_CHUNK_OVERLAP = "0";
    const fromEnv = chunkDocument(document);

    const fromOptions = chunkDocument(document, {
      chunkSize: 20,
      chunkOverlap: 0,
    });

    expect(fromEnv).toEqual(fromOptions);
  });

  it("honors a configurable chunk size", () => {
    const document = buildDocument(["a".repeat(100)]);

    const small = chunkDocument(document, { chunkSize: 20, chunkOverlap: 0 });
    const large = chunkDocument(document, { chunkSize: 50, chunkOverlap: 0 });

    expect(small.length).toBeGreaterThan(large.length);
  });

  it("repeats the configured overlap of characters between consecutive chunks", () => {
    const document = buildDocument([
      "a".repeat(10) + "b".repeat(10) + "c".repeat(10),
    ]);

    const chunks = chunkDocument(document, { chunkSize: 15, chunkOverlap: 5 });

    expect(chunks[0].text.slice(-5)).toBe(chunks[1].text.slice(0, 5));
  });

  it("preserves the source page number on every chunk", () => {
    const document = buildDocument(["page one text", "page two text"]);

    const chunks = chunkDocument(document, { chunkSize: 5, chunkOverlap: 0 });

    expect(chunks.every((chunk) => chunk.pageNumber >= 1)).toBe(true);
    expect(chunks.some((chunk) => chunk.pageNumber === 1)).toBe(true);
    expect(chunks.some((chunk) => chunk.pageNumber === 2)).toBe(true);
  });

  it("preserves chunk order across pages via an increasing chunkIndex", () => {
    const document = buildDocument([
      "first page content",
      "second page content",
    ]);

    const chunks = chunkDocument(document, { chunkSize: 8, chunkOverlap: 0 });

    chunks.forEach((chunk, index) => {
      expect(chunk.chunkIndex).toBe(index);
    });
  });

  it("rejects an overlap that is not smaller than the chunk size", () => {
    const document = buildDocument(["some text"]);

    expect(() =>
      chunkDocument(document, { chunkSize: 10, chunkOverlap: 10 }),
    ).toThrow(ChunkingError);
  });
});
