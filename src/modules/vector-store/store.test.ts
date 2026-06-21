import * as lancedb from "@lancedb/lancedb";
import { VectorStoreError } from "./errors";
import {
  indexChunks,
  reindexDocument,
  removeDocument,
  searchChunks,
} from "./store";

jest.mock("@lancedb/lancedb", () => ({ connect: jest.fn() }));

const DOCUMENT_ID = "11111111-1111-1111-1111-111111111111";

function buildTable() {
  return {
    add: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    search: jest.fn(),
  };
}

function buildDb(table = buildTable()) {
  return {
    tableNames: jest.fn().mockResolvedValue([]),
    openTable: jest.fn().mockResolvedValue(table),
    createTable: jest.fn().mockResolvedValue(table),
  };
}

describe("indexChunks", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does nothing when there are no chunks", async () => {
    await indexChunks(DOCUMENT_ID, "doc.pdf", []);

    expect(lancedb.connect).not.toHaveBeenCalled();
  });

  it("creates the table with documentId/documentName metadata when it does not exist yet", async () => {
    const db = buildDb();
    (lancedb.connect as jest.Mock).mockResolvedValue(db);

    await indexChunks(DOCUMENT_ID, "doc.pdf", [
      { text: "hello", pageNumber: 1, chunkIndex: 0, vector: [0.1, 0.2] },
    ]);

    expect(db.createTable).toHaveBeenCalledWith("chunks", [
      {
        vector: [0.1, 0.2],
        text: "hello",
        documentId: DOCUMENT_ID,
        documentName: "doc.pdf",
        pageNumber: 1,
        chunkIndex: 0,
      },
    ]);
  });

  it("appends to the existing table when it is already present", async () => {
    const table = buildTable();
    const db = buildDb(table);
    db.tableNames.mockResolvedValue(["chunks"]);
    (lancedb.connect as jest.Mock).mockResolvedValue(db);

    await indexChunks(DOCUMENT_ID, "doc.pdf", [
      { text: "hello", pageNumber: 1, chunkIndex: 0, vector: [0.1] },
    ]);

    expect(db.openTable).toHaveBeenCalledWith("chunks");
    expect(table.add).toHaveBeenCalledWith([
      {
        vector: [0.1],
        text: "hello",
        documentId: DOCUMENT_ID,
        documentName: "doc.pdf",
        pageNumber: 1,
        chunkIndex: 0,
      },
    ]);
  });

  it("wraps unexpected failures in a VectorStoreError", async () => {
    (lancedb.connect as jest.Mock).mockRejectedValue(new Error("boom"));

    await expect(
      indexChunks(DOCUMENT_ID, "doc.pdf", [
        { text: "hello", pageNumber: 1, chunkIndex: 0, vector: [0.1] },
      ]),
    ).rejects.toMatchObject({ code: "INDEX_FAILED" });
  });
});

describe("searchChunks", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns an empty array when the table does not exist", async () => {
    const db = buildDb();
    (lancedb.connect as jest.Mock).mockResolvedValue(db);

    const results = await searchChunks([0.1, 0.2]);

    expect(results).toEqual([]);
  });

  it("maps matching rows to SearchResult and limits/filters by documentId", async () => {
    const table = buildTable();
    const toArray = jest.fn().mockResolvedValue([
      {
        text: "hello",
        documentId: DOCUMENT_ID,
        documentName: "doc.pdf",
        pageNumber: 1,
        chunkIndex: 0,
        _distance: 0.05,
      },
    ]);
    const whereQuery = { toArray };
    const limitQuery = {
      where: jest.fn().mockReturnValue(whereQuery),
      toArray,
    };
    table.search.mockReturnValue({
      limit: jest.fn().mockReturnValue(limitQuery),
    });
    const db = buildDb(table);
    db.tableNames.mockResolvedValue(["chunks"]);
    (lancedb.connect as jest.Mock).mockResolvedValue(db);

    const results = await searchChunks([0.1, 0.2], {
      limit: 3,
      documentId: DOCUMENT_ID,
    });

    expect(table.search).toHaveBeenCalledWith([0.1, 0.2]);
    expect(limitQuery.where).toHaveBeenCalledWith(
      `documentId = '${DOCUMENT_ID}'`,
    );
    expect(results).toEqual([
      {
        text: "hello",
        documentId: DOCUMENT_ID,
        documentName: "doc.pdf",
        pageNumber: 1,
        chunkIndex: 0,
        distance: 0.05,
      },
    ]);
  });

  it("rejects an unsafe documentId filter", async () => {
    await expect(
      searchChunks([0.1], { documentId: "'; DROP TABLE chunks; --" }),
    ).rejects.toMatchObject({ code: "INVALID_DOCUMENT_ID" });
  });

  it("wraps unexpected failures in a VectorStoreError", async () => {
    (lancedb.connect as jest.Mock).mockRejectedValue(new Error("boom"));

    await expect(searchChunks([0.1])).rejects.toBeInstanceOf(VectorStoreError);
  });
});

describe("removeDocument", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("does nothing when the table does not exist", async () => {
    const db = buildDb();
    (lancedb.connect as jest.Mock).mockResolvedValue(db);

    await removeDocument(DOCUMENT_ID);

    expect(db.openTable).not.toHaveBeenCalled();
  });

  it("deletes every row matching the documentId", async () => {
    const table = buildTable();
    const db = buildDb(table);
    db.tableNames.mockResolvedValue(["chunks"]);
    (lancedb.connect as jest.Mock).mockResolvedValue(db);

    await removeDocument(DOCUMENT_ID);

    expect(table.delete).toHaveBeenCalledWith(`documentId = '${DOCUMENT_ID}'`);
  });

  it("wraps unexpected failures in a VectorStoreError", async () => {
    (lancedb.connect as jest.Mock).mockRejectedValue(new Error("boom"));

    await expect(removeDocument(DOCUMENT_ID)).rejects.toMatchObject({
      code: "DELETE_FAILED",
    });
  });
});

describe("reindexDocument", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("removes existing rows for the document before indexing the new chunks", async () => {
    const table = buildTable();
    const db = buildDb(table);
    db.tableNames.mockResolvedValue(["chunks"]);
    (lancedb.connect as jest.Mock).mockResolvedValue(db);

    await reindexDocument(DOCUMENT_ID, "doc.pdf", [
      { text: "updated", pageNumber: 1, chunkIndex: 0, vector: [0.9] },
    ]);

    expect(table.delete).toHaveBeenCalledWith(`documentId = '${DOCUMENT_ID}'`);
    expect(table.add).toHaveBeenCalledWith([
      {
        vector: [0.9],
        text: "updated",
        documentId: DOCUMENT_ID,
        documentName: "doc.pdf",
        pageNumber: 1,
        chunkIndex: 0,
      },
    ]);
  });
});
