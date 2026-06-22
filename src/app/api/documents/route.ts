import {
  DocumentUploadError,
  listDocuments,
  uploadAndIndexDocument,
  uploadedDocumentSchema,
} from "@/modules/documents";
import { NextResponse } from "next/server";

/**
 * @swagger
 * /api/documents:
 *   post:
 *     summary: Upload a PDF and index it
 *     description: Validates the PDF, persists it to disk, and runs it through the parse → chunk → embed → index pipeline. Returns 201 even if indexing fails (the file did persist) — check `status`/`error` in the body.
 *     tags: [Documents]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: File persisted (indexing may have failed; see `status`)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 originalName: { type: string }
 *                 size: { type: integer }
 *                 status: { type: string, enum: [pending, indexed, failed] }
 *                 chunkCount: { type: integer }
 *                 error: { type: string }
 *       400:
 *         description: No file provided, invalid type, or corrupt PDF
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string }
 */
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  try {
    const document = await uploadAndIndexDocument(file);
    const body = uploadedDocumentSchema.parse({
      id: document.id,
      originalName: document.originalName,
      size: document.size,
      status: document.status,
      chunkCount: document.chunkCount,
      error: document.error,
    });
    return NextResponse.json(body, { status: 201 });
  } catch (error) {
    if (error instanceof DocumentUploadError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}

/**
 * @swagger
 * /api/documents:
 *   get:
 *     summary: List uploaded documents
 *     description: Returns every document tracked in the manifest, regardless of indexing status.
 *     tags: [Documents]
 *     responses:
 *       200:
 *         description: List of documents
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 documents:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: string, format: uuid }
 *                       originalName: { type: string }
 *                       size: { type: integer }
 *                       storedAt: { type: string }
 *                       status: { type: string, enum: [pending, indexed, failed] }
 *                       chunkCount: { type: integer }
 *                       indexedAt: { type: string }
 *                       error: { type: string }
 */
export async function GET() {
  const documents = await listDocuments();
  return NextResponse.json({ documents }, { status: 200 });
}
