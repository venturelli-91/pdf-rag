import { GenerationError } from "../../../modules/generation";
import { RetrievalError } from "../../../modules/retrieval";

jest.mock("../../../modules/retrieval", () => ({
  retrieveRelevantChunks: jest.fn(),
  RetrievalError: jest.requireActual("../../../modules/retrieval")
    .RetrievalError,
}));
jest.mock("../../../modules/generation", () => ({
  generateAnswer: jest.fn(),
  GenerationError: jest.requireActual("../../../modules/generation")
    .GenerationError,
}));

import { generateAnswer } from "../../../modules/generation";
import { retrieveRelevantChunks } from "../../../modules/retrieval";
import { POST } from "./route";

const chunk = {
  text: "Photosynthesis converts light energy into chemical energy.",
  documentId: "doc-1",
  documentName: "biology.pdf",
  pageNumber: 3,
  chunkIndex: 0,
  score: 0.12,
};

function buildRequest(body: unknown): Request {
  return new Request("http://localhost/api/query", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/query", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when the question is missing", async () => {
    const response = await POST(buildRequest({}));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/question/i);
    expect(retrieveRelevantChunks).not.toHaveBeenCalled();
  });

  it("returns 400 when the question is blank", async () => {
    const response = await POST(buildRequest({ query: "   " }));

    expect(response.status).toBe(400);
  });

  it("returns the grounded answer with citations derived from the retrieved chunks", async () => {
    (retrieveRelevantChunks as jest.Mock).mockResolvedValue([chunk]);
    (generateAnswer as jest.Mock).mockResolvedValue({
      answer: "Photosynthesis happens in chloroplasts.",
      grounded: true,
    });

    const response = await POST(
      buildRequest({ query: "What is photosynthesis?" }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      answer: "Photosynthesis happens in chloroplasts.",
      grounded: true,
      citations: [
        {
          documentName: "biology.pdf",
          pageNumber: 3,
          passages: [chunk.text],
        },
      ],
    });
    expect(retrieveRelevantChunks).toHaveBeenCalledWith(
      "What is photosynthesis?",
    );
    expect(generateAnswer).toHaveBeenCalledWith("What is photosynthesis?", [
      chunk,
    ]);
  });

  it("returns no citations for an ungrounded answer", async () => {
    (retrieveRelevantChunks as jest.Mock).mockResolvedValue([]);
    (generateAnswer as jest.Mock).mockResolvedValue({
      answer: "I don't have enough information.",
      grounded: false,
    });

    const response = await POST(buildRequest({ query: "unanswerable?" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.citations).toEqual([]);
  });

  it("returns 502 when retrieval fails", async () => {
    (retrieveRelevantChunks as jest.Mock).mockRejectedValue(
      new RetrievalError("vector store down", "SEARCH_FAILED"),
    );

    const response = await POST(buildRequest({ query: "query" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("vector store down");
  });

  it("returns 502 when generation fails", async () => {
    (retrieveRelevantChunks as jest.Mock).mockResolvedValue([chunk]);
    (generateAnswer as jest.Mock).mockRejectedValue(
      new GenerationError("ollama down", "REQUEST_FAILED"),
    );

    const response = await POST(buildRequest({ query: "query" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("ollama down");
  });
});
