import { generateEmbedding } from "../embeddings";
import { searchChunks } from "../vector-store";
import { RetrievalError } from "./errors";
import { retrieveRelevantChunks } from "./retriever";

jest.mock("../embeddings", () => ({ generateEmbedding: jest.fn() }));
jest.mock("../vector-store", () => ({ searchChunks: jest.fn() }));

describe("retrieveRelevantChunks", () => {
  afterEach(() => {
    jest.clearAllMocks();
    Reflect.deleteProperty(process.env, "RETRIEVAL_TOP_K");
    Reflect.deleteProperty(process.env, "RETRIEVAL_SCORE_THRESHOLD");
  });

  it("returns an empty array for a blank query without calling embeddings or the vector store", async () => {
    const results = await retrieveRelevantChunks("   ");

    expect(results).toEqual([]);
    expect(generateEmbedding).not.toHaveBeenCalled();
    expect(searchChunks).not.toHaveBeenCalled();
  });

  it("embeds the query and searches the vector store with the default top-k", async () => {
    (generateEmbedding as jest.Mock).mockResolvedValue([0.1, 0.2]);
    (searchChunks as jest.Mock).mockResolvedValue([]);

    await retrieveRelevantChunks("what is in the doc?");

    expect(generateEmbedding).toHaveBeenCalledWith("what is in the doc?");
    expect(searchChunks).toHaveBeenCalledWith([0.1, 0.2], {
      limit: 5,
      documentId: undefined,
    });
  });

  it("uses RETRIEVAL_TOP_K as the default top-k when set", async () => {
    process.env.RETRIEVAL_TOP_K = "8";
    (generateEmbedding as jest.Mock).mockResolvedValue([0.1]);
    (searchChunks as jest.Mock).mockResolvedValue([]);

    await retrieveRelevantChunks("query");

    expect(searchChunks).toHaveBeenCalledWith([0.1], {
      limit: 8,
      documentId: undefined,
    });
  });

  it("respects an explicit top-k over the default", async () => {
    (generateEmbedding as jest.Mock).mockResolvedValue([0.1]);
    (searchChunks as jest.Mock).mockResolvedValue([]);

    await retrieveRelevantChunks("query", { topK: 10 });

    expect(searchChunks).toHaveBeenCalledWith([0.1], {
      limit: 10,
      documentId: undefined,
    });
  });

  it("scopes results to a document when documentId is provided", async () => {
    (generateEmbedding as jest.Mock).mockResolvedValue([0.1]);
    (searchChunks as jest.Mock).mockResolvedValue([]);

    await retrieveRelevantChunks("query", { documentId: "doc-1" });

    expect(searchChunks).toHaveBeenCalledWith([0.1], {
      limit: 5,
      documentId: "doc-1",
    });
  });

  it("maps results to chunk text, document name, page number and similarity score", async () => {
    (generateEmbedding as jest.Mock).mockResolvedValue([0.1]);
    (searchChunks as jest.Mock).mockResolvedValue([
      {
        text: "hello",
        documentId: "doc-1",
        documentName: "doc.pdf",
        pageNumber: 2,
        chunkIndex: 0,
        distance: 0.12,
      },
    ]);

    const results = await retrieveRelevantChunks("hello?");

    expect(results).toEqual([
      {
        text: "hello",
        documentId: "doc-1",
        documentName: "doc.pdf",
        pageNumber: 2,
        chunkIndex: 0,
        score: 0.12,
      },
    ]);
  });

  it("returns an empty array explicitly when nothing matches", async () => {
    (generateEmbedding as jest.Mock).mockResolvedValue([0.1]);
    (searchChunks as jest.Mock).mockResolvedValue([]);

    const results = await retrieveRelevantChunks("nothing relevant");

    expect(results).toEqual([]);
  });

  it("filters out chunks whose distance exceeds the score threshold", async () => {
    (generateEmbedding as jest.Mock).mockResolvedValue([0.1]);
    (searchChunks as jest.Mock).mockResolvedValue([
      {
        text: "close",
        documentId: "d",
        documentName: "doc.pdf",
        pageNumber: 1,
        chunkIndex: 0,
        distance: 0.1,
      },
      {
        text: "far",
        documentId: "d",
        documentName: "doc.pdf",
        pageNumber: 1,
        chunkIndex: 1,
        distance: 0.9,
      },
    ]);

    const results = await retrieveRelevantChunks("query", {
      scoreThreshold: 0.5,
    });

    expect(results.map((result) => result.text)).toEqual(["close"]);
  });

  it("uses RETRIEVAL_SCORE_THRESHOLD as the default scoreThreshold when set", async () => {
    process.env.RETRIEVAL_SCORE_THRESHOLD = "0.5";
    (generateEmbedding as jest.Mock).mockResolvedValue([0.1]);
    (searchChunks as jest.Mock).mockResolvedValue([
      {
        text: "close",
        documentId: "d",
        documentName: "doc.pdf",
        pageNumber: 1,
        chunkIndex: 0,
        distance: 0.1,
      },
      {
        text: "far",
        documentId: "d",
        documentName: "doc.pdf",
        pageNumber: 1,
        chunkIndex: 1,
        distance: 0.9,
      },
    ]);

    const results = await retrieveRelevantChunks("query");

    expect(results.map((result) => result.text)).toEqual(["close"]);
  });

  it("wraps embedding failures in a RetrievalError", async () => {
    (generateEmbedding as jest.Mock).mockRejectedValue(
      new Error("ollama down"),
    );

    await expect(retrieveRelevantChunks("query")).rejects.toMatchObject({
      code: "EMBEDDING_FAILED",
    });
  });

  it("wraps vector store failures in a RetrievalError", async () => {
    (generateEmbedding as jest.Mock).mockResolvedValue([0.1]);
    (searchChunks as jest.Mock).mockRejectedValue(new Error("lancedb down"));

    await expect(retrieveRelevantChunks("query")).rejects.toBeInstanceOf(
      RetrievalError,
    );
  });
});
