import { generateEmbedding, generateEmbeddings } from "./embedder";
import { EmbeddingError } from "./errors";

function mockFetchOnce(response: Partial<Response> & { ok: boolean }) {
  global.fetch = jest
    .fn()
    .mockResolvedValue(response) as unknown as typeof fetch;
}

describe("generateEmbeddings", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(process.env, "OLLAMA_BASE_URL");
    Reflect.deleteProperty(process.env, "OLLAMA_EMBEDDING_MODEL");
  });

  it("returns an empty array without calling fetch for empty input", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;

    const result = await generateEmbeddings([]);

    expect(result).toEqual([]);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends texts to the local Ollama embeddings endpoint using the default model", async () => {
    mockFetchOnce({
      ok: true,
      json: async () => ({
        embeddings: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
      }),
    });

    const result = await generateEmbeddings(["hello", "world"]);

    expect(result).toEqual([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/embed",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          model: "nomic-embed-text",
          input: ["hello", "world"],
        }),
      }),
    );
  });

  it("uses a custom model when provided via options", async () => {
    mockFetchOnce({ ok: true, json: async () => ({ embeddings: [[0.5]] }) });

    await generateEmbeddings(["hello"], { model: "custom-model" });

    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(requestInit.body)).toMatchObject({
      model: "custom-model",
    });
  });

  it("throws an EmbeddingError when the request fails", async () => {
    mockFetchOnce({ ok: false, status: 500, json: async () => ({}) });

    await expect(generateEmbeddings(["hello"])).rejects.toBeInstanceOf(
      EmbeddingError,
    );
    await expect(generateEmbeddings(["hello"])).rejects.toMatchObject({
      code: "REQUEST_FAILED",
    });
  });

  it("throws an EmbeddingError when the response has no embeddings", async () => {
    mockFetchOnce({ ok: true, json: async () => ({}) });

    await expect(generateEmbeddings(["hello"])).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });
});

describe("generateEmbedding", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("embeds a single text using the same code path as generateEmbeddings", async () => {
    mockFetchOnce({
      ok: true,
      json: async () => ({ embeddings: [[1, 2, 3]] }),
    });

    const result = await generateEmbedding("a single query");

    expect(result).toEqual([1, 2, 3]);
  });
});
