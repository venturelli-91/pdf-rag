import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

jest.mock("../../../../modules/vector-store", () => ({
  removeDocument: jest.fn(),
}));

describe("DELETE /api/documents/[id]", () => {
  let storageDir: string;
  let manifestDir: string;
  let DELETE: typeof import("./route").DELETE;
  let removeDocument: jest.Mock;

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
    ({ DELETE } = await import("./route"));
    ({ removeDocument } = (await import(
      "../../../../modules/vector-store"
    )) as unknown as { removeDocument: jest.Mock });
    removeDocument.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    process.env.DOCUMENTS_STORAGE_DIR = undefined;
    process.env.DOCUMENTS_MANIFEST_PATH = undefined;
    jest.clearAllMocks();
    await rm(storageDir, { recursive: true, force: true });
    await rm(manifestDir, { recursive: true, force: true });
  });

  async function seedManifest(id: string, storedAt: string) {
    await writeFile(
      process.env.DOCUMENTS_MANIFEST_PATH as string,
      JSON.stringify([
        {
          id,
          originalName: "report.pdf",
          size: 10,
          storedAt,
          status: "indexed",
        },
      ]),
    );
  }

  it("returns 404 when the document does not exist", async () => {
    const response = await DELETE(
      new Request("http://localhost"),
      buildParams("missing"),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toMatch(/not found/i);
  });

  it("removes the document's chunks, file, and manifest record, returning 204", async () => {
    const storedAt = path.join(storageDir, "doc-1.pdf");
    await writeFile(storedAt, "%PDF-1.4");
    await seedManifest("doc-1", storedAt);

    const response = await DELETE(
      new Request("http://localhost"),
      buildParams("doc-1"),
    );

    expect(response.status).toBe(204);
    expect(removeDocument).toHaveBeenCalledWith("doc-1");
  });
});
