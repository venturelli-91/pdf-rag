import { GenerationError } from "./errors";
import { generateAnswer } from "./generator";

function mockFetchOnce(response: Partial<Response> & { ok: boolean }) {
  global.fetch = jest
    .fn()
    .mockResolvedValue(response) as unknown as typeof fetch;
}

const chunks = [
  {
    text: "Photosynthesis converts light energy into chemical energy.",
    documentId: "doc-1",
    documentName: "biology.pdf",
    pageNumber: 3,
    chunkIndex: 0,
    score: 0.12,
  },
];

describe("generateAnswer", () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(process.env, "OLLAMA_BASE_URL");
    Reflect.deleteProperty(process.env, "OLLAMA_GENERATION_MODEL");
  });

  it("returns an honest uncertainty answer without calling the LLM when there are no chunks", async () => {
    global.fetch = jest.fn() as unknown as typeof fetch;

    const result = await generateAnswer("What is photosynthesis?", []);

    expect(result.grounded).toBe(false);
    expect(result.answer).toMatch(/don't have enough information/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends the grounded prompt to the local Ollama generate endpoint using the default model", async () => {
    mockFetchOnce({
      ok: true,
      json: async () => ({ response: "Photosynthesis is a process..." }),
    });

    const result = await generateAnswer("What is photosynthesis?", chunks);

    expect(result).toEqual({
      answer: "Photosynthesis is a process...",
      grounded: true,
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:11434/api/generate",
      expect.objectContaining({ method: "POST" }),
    );
    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(requestInit.body);
    expect(body.model).toBe("llama3.2");
    expect(body.stream).toBe(false);
    expect(body.system).toMatch(/only.*context/i);
    expect(body.prompt).toContain("What is photosynthesis?");
    expect(body.prompt).toContain(
      "Photosynthesis converts light energy into chemical energy.",
    );
  });

  it("uses a custom model when provided via options", async () => {
    mockFetchOnce({ ok: true, json: async () => ({ response: "answer" }) });

    await generateAnswer("query", chunks, { model: "custom-model" });

    const [, requestInit] = (global.fetch as jest.Mock).mock.calls[0];
    expect(JSON.parse(requestInit.body)).toMatchObject({
      model: "custom-model",
    });
  });

  it("throws a GenerationError when the request fails", async () => {
    mockFetchOnce({ ok: false, status: 500, json: async () => ({}) });

    await expect(generateAnswer("query", chunks)).rejects.toMatchObject({
      code: "REQUEST_FAILED",
    });
  });

  it("throws a GenerationError when the response has no answer text", async () => {
    mockFetchOnce({ ok: true, json: async () => ({}) });

    await expect(generateAnswer("query", chunks)).rejects.toBeInstanceOf(
      GenerationError,
    );
    await expect(generateAnswer("query", chunks)).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
    });
  });

  it("trims whitespace from the generated answer", async () => {
    mockFetchOnce({
      ok: true,
      json: async () => ({ response: "  answer with padding  \n" }),
    });

    const result = await generateAnswer("query", chunks);

    expect(result.answer).toBe("answer with padding");
  });
});
