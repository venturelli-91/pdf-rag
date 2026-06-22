import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

jest.mock("../../../modules/vector-store", () => ({
  indexChunks: jest.fn(),
}));
// pdf-parser's real implementation has a pre-existing incompatibility with
// pdf-lib-generated buffers in this test environment (see the known-failing
// src/modules/pdf-parser/parser.test.ts case) unrelated to this route; mock
// it so upload tests stay deterministic.
jest.mock("../../../modules/pdf-parser", () => ({
  parsePdf: jest.fn().mockResolvedValue({ pages: [] }),
}));

async function buildValidPdfFile(name = "valid.pdf"): Promise<File> {
  const document = await PDFDocument.create();
  document.addPage([200, 200]);
  const bytes = await document.save();
  return new File([bytes], name, { type: "application/pdf" });
}

describe("/api/documents", () => {
  let storageDir: string;
  let manifestDir: string;
  let POST: typeof import("./route").POST;
  let GET: typeof import("./route").GET;
  let indexChunks: jest.Mock;

  beforeEach(async () => {
    storageDir = await mkdtemp(path.join(tmpdir(), "pdf-rag-route-test-"));
    manifestDir = await mkdtemp(path.join(tmpdir(), "pdf-rag-manifest-test-"));
    process.env.DOCUMENTS_STORAGE_DIR = storageDir;
    process.env.DOCUMENTS_MANIFEST_PATH = path.join(
      manifestDir,
      "documents.json",
    );
    jest.resetModules();
    ({ POST, GET } = await import("./route"));
    ({ indexChunks } = (await import(
      "../../../modules/vector-store"
    )) as unknown as { indexChunks: jest.Mock });
    indexChunks.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    process.env.DOCUMENTS_STORAGE_DIR = undefined;
    process.env.DOCUMENTS_MANIFEST_PATH = undefined;
    jest.clearAllMocks();
    await rm(storageDir, { recursive: true, force: true });
    await rm(manifestDir, { recursive: true, force: true });
  });

  function buildRequest(formData: FormData): Request {
    return new Request("http://localhost/api/documents", {
      method: "POST",
      body: formData,
    });
  }

  describe("POST", () => {
    it("returns 201 with indexed document metadata for a valid PDF", async () => {
      const formData = new FormData();
      formData.set("file", await buildValidPdfFile("report.pdf"));

      const response = await POST(buildRequest(formData));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body).toMatchObject({
        originalName: "report.pdf",
        status: "indexed",
        chunkCount: 0,
      });
      expect(typeof body.id).toBe("string");
    });

    it("returns 400 when no file is provided", async () => {
      const response = await POST(buildRequest(new FormData()));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toMatch(/no file/i);
    });

    it("returns 400 with a clear message for an invalid file type", async () => {
      const formData = new FormData();
      formData.set(
        "file",
        new File(["hello"], "notes.txt", { type: "text/plain" }),
      );

      const response = await POST(buildRequest(formData));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("Only PDF files are accepted.");
    });

    it("returns 400 for a corrupt PDF", async () => {
      const formData = new FormData();
      formData.set(
        "file",
        new File(["%PDF-1.4\nnot really a pdf body\n"], "corrupt.pdf", {
          type: "application/pdf",
        }),
      );

      const response = await POST(buildRequest(formData));
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toBe("File is corrupt or not a readable PDF.");
    });

    it("returns 201 with a failed status when indexing fails, since the file still persisted", async () => {
      indexChunks.mockRejectedValue(new Error("lancedb down"));

      const formData = new FormData();
      formData.set("file", await buildValidPdfFile("report.pdf"));

      const response = await POST(buildRequest(formData));
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.status).toBe("failed");
      expect(body.error).toBe("lancedb down");
    });
  });

  describe("GET", () => {
    it("lists previously uploaded documents", async () => {
      const formData = new FormData();
      formData.set("file", await buildValidPdfFile("report.pdf"));
      await POST(buildRequest(formData));

      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.documents).toHaveLength(1);
      expect(body.documents[0]).toMatchObject({
        originalName: "report.pdf",
        status: "indexed",
      });
    });

    it("returns an empty list when nothing has been uploaded", async () => {
      const response = await GET();
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.documents).toEqual([]);
    });
  });
});
