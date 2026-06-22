import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

jest.mock("../../../../../modules/vector-store", () => ({
  reindexDocument: jest.fn(),
}));
jest.mock("../../../../../modules/pdf-parser", () => ({
  parsePdf: jest.fn().mockResolvedValue({ pages: [] }),
}));

describe("POST /api/documents/[id]/reindex", () => {
  let storageDir: string;
  let manifestDir: string;
  let POST: typeof import("./route").POST;
  let reindexDocument: jest.Mock;

  function buildParams(id: string) {
    return { params: Promise.resolve({ id }) };
  }

  beforeEach(async () => {
    storageDir = await mkdtemp(path.join(tmpdir(), "pdf-rag-route-test-"));
    manifestDir = await mkdtemp(path.join(tmpdir(), "pdf-rag-manifest-test-"));
    process.env.DOCUMENTS_STORAGE_DIR = storageDir;
    process.env.DOCUMENTS_MANIFEST_PATH = path.join(
      manifestDir,
      "documents.json",
    );
    jest.resetModules();
    ({ POST } = await import("./route"));
    ({ reindexDocument } = (await import(
      "../../../../../modules/vector-store"
    )) as unknown as { reindexDocument: jest.Mock });
    reindexDocument.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    process.env.DOCUMENTS_STORAGE_DIR = undefined;
    process.env.DOCUMENTS_MANIFEST_PATH = undefined;
    jest.clearAllMocks();
    await rm(storageDir, { recursive: true, force: true });
    await rm(manifestDir, { recursive: true, force: true });
  });

  async function seedManifest(
    id: string,
    storedAt: string,
    status = "indexed",
  ) {
    await writeFile(
      process.env.DOCUMENTS_MANIFEST_PATH as string,
      JSON.stringify([
        { id, originalName: "report.pdf", size: 10, storedAt, status },
      ]),
    );
  }

  it("returns 404 when the document does not exist", async () => {
    const response = await POST(
      new Request("http://localhost"),
      buildParams("missing"),
    );

    expect(response.status).toBe(404);
  });

  it("rebuilds and reindexes the document, returning 200 with the updated record", async () => {
    const storedAt = path.join(storageDir, "doc-1.pdf");
    await writeFile(storedAt, "%PDF-1.4");
    await seedManifest("doc-1", storedAt, "failed");

    const response = await POST(
      new Request("http://localhost"),
      buildParams("doc-1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      id: "doc-1",
      status: "indexed",
      chunkCount: 0,
    });
    expect(reindexDocument).toHaveBeenCalledWith("doc-1", "report.pdf", []);
  });

  it("returns 502 when reindexing fails", async () => {
    const storedAt = path.join(storageDir, "doc-1.pdf");
    await writeFile(storedAt, "%PDF-1.4");
    await seedManifest("doc-1", storedAt);
    reindexDocument.mockRejectedValue(new Error("lancedb down"));

    const response = await POST(
      new Request("http://localhost"),
      buildParams("doc-1"),
    );

    expect(response.status).toBe(502);
  });
});
