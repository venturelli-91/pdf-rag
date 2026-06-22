import { rm } from "node:fs/promises";
import {
  indexChunks,
  reindexDocument as reindexInVectorStore,
  removeDocument,
} from "../vector-store";
import { DocumentNotFoundError } from "./errors";
import {
  deleteDocument,
  listDocuments,
  reindexDocument,
  uploadAndIndexDocument,
} from "./lifecycle";
import {
  addDocumentRecord,
  getDocumentRecord,
  listDocumentRecords,
  removeDocumentRecord,
  updateDocumentRecord,
} from "./manifest";
import { buildIndexableChunks } from "./pipeline";
import { persistUpload } from "./upload";

jest.mock("node:fs/promises", () => ({
  ...jest.requireActual("node:fs/promises"),
  readFile: jest.fn(),
  rm: jest.fn(),
}));
jest.mock("./upload", () => ({ persistUpload: jest.fn() }));
jest.mock("./manifest", () => ({
  addDocumentRecord: jest.fn(),
  listDocumentRecords: jest.fn(),
  getDocumentRecord: jest.fn(),
  updateDocumentRecord: jest.fn(),
  removeDocumentRecord: jest.fn(),
}));
jest.mock("./pipeline", () => ({ buildIndexableChunks: jest.fn() }));
jest.mock("../vector-store", () => ({
  indexChunks: jest.fn(),
  removeDocument: jest.fn(),
  reindexDocument: jest.fn(),
}));

const { readFile } = jest.requireMock("node:fs/promises") as {
  readFile: jest.Mock;
};

const persisted = {
  id: "doc-1",
  originalName: "report.pdf",
  size: 1024,
  storedAt: "/tmp/doc-1.pdf",
};

const record = {
  id: "doc-1",
  originalName: "report.pdf",
  size: 1024,
  storedAt: "/tmp/doc-1.pdf",
  status: "pending" as const,
};

describe("uploadAndIndexDocument", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("persists the file, adds a pending record, and marks it indexed on success", async () => {
    (persistUpload as jest.Mock).mockResolvedValue(persisted);
    (addDocumentRecord as jest.Mock).mockResolvedValue(undefined);
    readFile.mockResolvedValue(Buffer.from("%PDF-1.4"));
    (buildIndexableChunks as jest.Mock).mockResolvedValue([
      { text: "a", pageNumber: 1, chunkIndex: 0, vector: [0.1] },
    ]);
    (indexChunks as jest.Mock).mockResolvedValue(undefined);
    (updateDocumentRecord as jest.Mock).mockImplementation((id, patch) =>
      Promise.resolve({ ...record, ...patch }),
    );

    const file = new File(["%PDF-1.4"], "report.pdf");
    const result = await uploadAndIndexDocument(file);

    expect(persistUpload).toHaveBeenCalledWith(file);
    expect(addDocumentRecord).toHaveBeenCalledWith({
      ...persisted,
      status: "pending",
    });
    expect(indexChunks).toHaveBeenCalledWith("doc-1", "report.pdf", [
      { text: "a", pageNumber: 1, chunkIndex: 0, vector: [0.1] },
    ]);
    expect(updateDocumentRecord).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({ status: "indexed", chunkCount: 1 }),
    );
    expect(result.status).toBe("indexed");
  });

  it("marks the record failed without throwing when indexing fails", async () => {
    (persistUpload as jest.Mock).mockResolvedValue(persisted);
    (addDocumentRecord as jest.Mock).mockResolvedValue(undefined);
    readFile.mockResolvedValue(Buffer.from("%PDF-1.4"));
    (buildIndexableChunks as jest.Mock).mockRejectedValue(
      new Error("embedding service down"),
    );
    (updateDocumentRecord as jest.Mock).mockImplementation((id, patch) =>
      Promise.resolve({ ...record, ...patch }),
    );

    const file = new File(["%PDF-1.4"], "report.pdf");
    const result = await uploadAndIndexDocument(file);

    expect(updateDocumentRecord).toHaveBeenCalledWith("doc-1", {
      status: "failed",
      error: "embedding service down",
    });
    expect(result.status).toBe("failed");
  });
});

describe("listDocuments", () => {
  it("delegates to the manifest", async () => {
    (listDocumentRecords as jest.Mock).mockResolvedValue([record]);

    expect(await listDocuments()).toEqual([record]);
  });
});

describe("deleteDocument", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("throws DocumentNotFoundError when the document does not exist", async () => {
    (getDocumentRecord as jest.Mock).mockResolvedValue(undefined);

    await expect(deleteDocument("missing")).rejects.toBeInstanceOf(
      DocumentNotFoundError,
    );
    expect(removeDocument).not.toHaveBeenCalled();
  });

  it("removes the vector-store chunks, the file, and the manifest record", async () => {
    (getDocumentRecord as jest.Mock).mockResolvedValue(record);
    (removeDocument as jest.Mock).mockResolvedValue(undefined);
    (rm as jest.Mock).mockResolvedValue(undefined);
    (removeDocumentRecord as jest.Mock).mockResolvedValue(undefined);

    await deleteDocument("doc-1");

    expect(removeDocument).toHaveBeenCalledWith("doc-1");
    expect(rm).toHaveBeenCalledWith("/tmp/doc-1.pdf", { force: true });
    expect(removeDocumentRecord).toHaveBeenCalledWith("doc-1");
  });
});

describe("reindexDocument", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("throws DocumentNotFoundError when the document does not exist", async () => {
    (getDocumentRecord as jest.Mock).mockResolvedValue(undefined);

    await expect(reindexDocument("missing")).rejects.toBeInstanceOf(
      DocumentNotFoundError,
    );
  });

  it("rereads the file, rebuilds chunks, and reindexes via the vector store", async () => {
    (getDocumentRecord as jest.Mock).mockResolvedValue(record);
    readFile.mockResolvedValue(Buffer.from("%PDF-1.4"));
    (buildIndexableChunks as jest.Mock).mockResolvedValue([
      { text: "a", pageNumber: 1, chunkIndex: 0, vector: [0.1] },
      { text: "b", pageNumber: 1, chunkIndex: 1, vector: [0.2] },
    ]);
    (reindexInVectorStore as jest.Mock).mockResolvedValue(undefined);
    (updateDocumentRecord as jest.Mock).mockImplementation((id, patch) =>
      Promise.resolve({ ...record, ...patch }),
    );

    const result = await reindexDocument("doc-1");

    expect(readFile).toHaveBeenCalledWith("/tmp/doc-1.pdf");
    expect(reindexInVectorStore).toHaveBeenCalledWith("doc-1", "report.pdf", [
      { text: "a", pageNumber: 1, chunkIndex: 0, vector: [0.1] },
      { text: "b", pageNumber: 1, chunkIndex: 1, vector: [0.2] },
    ]);
    expect(updateDocumentRecord).toHaveBeenCalledWith(
      "doc-1",
      expect.objectContaining({ status: "indexed", chunkCount: 2 }),
    );
    expect(result.status).toBe("indexed");
  });

  it("marks the record failed and rethrows when reindexing fails", async () => {
    (getDocumentRecord as jest.Mock).mockResolvedValue(record);
    readFile.mockResolvedValue(Buffer.from("%PDF-1.4"));
    (buildIndexableChunks as jest.Mock).mockRejectedValue(
      new Error("ollama down"),
    );
    (updateDocumentRecord as jest.Mock).mockResolvedValue({
      ...record,
      status: "failed",
      error: "ollama down",
    });

    await expect(reindexDocument("doc-1")).rejects.toThrow("ollama down");

    expect(updateDocumentRecord).toHaveBeenCalledWith("doc-1", {
      status: "failed",
      error: "ollama down",
    });
  });
});
