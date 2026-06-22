import { chunkDocument } from "../chunking";
import { generateEmbeddings } from "../embeddings";
import { parsePdf } from "../pdf-parser";
import { buildIndexableChunks } from "./pipeline";

jest.mock("../pdf-parser", () => ({ parsePdf: jest.fn() }));
jest.mock("../chunking", () => ({ chunkDocument: jest.fn() }));
jest.mock("../embeddings", () => ({ generateEmbeddings: jest.fn() }));

describe("buildIndexableChunks", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("parses, chunks, embeds, and zips vectors onto each chunk", async () => {
    const parsed = { pages: [{ pageNumber: 1, text: "hello world" }] };
    const chunks = [
      { text: "hello", pageNumber: 1, chunkIndex: 0 },
      { text: "world", pageNumber: 1, chunkIndex: 1 },
    ];
    (parsePdf as jest.Mock).mockResolvedValue(parsed);
    (chunkDocument as jest.Mock).mockReturnValue(chunks);
    (generateEmbeddings as jest.Mock).mockResolvedValue([
      [0.1, 0.2],
      [0.3, 0.4],
    ]);

    const buffer = Buffer.from("%PDF-1.4");
    const result = await buildIndexableChunks(buffer);

    expect(parsePdf).toHaveBeenCalledWith(buffer);
    expect(chunkDocument).toHaveBeenCalledWith(parsed);
    expect(generateEmbeddings).toHaveBeenCalledWith(["hello", "world"]);
    expect(result).toEqual([
      { text: "hello", pageNumber: 1, chunkIndex: 0, vector: [0.1, 0.2] },
      { text: "world", pageNumber: 1, chunkIndex: 1, vector: [0.3, 0.4] },
    ]);
  });

  it("returns an empty array without calling embeddings when there are no chunks", async () => {
    (parsePdf as jest.Mock).mockResolvedValue({ pages: [] });
    (chunkDocument as jest.Mock).mockReturnValue([]);

    const result = await buildIndexableChunks(Buffer.from("%PDF-1.4"));

    expect(result).toEqual([]);
    expect(generateEmbeddings).not.toHaveBeenCalled();
  });
});
