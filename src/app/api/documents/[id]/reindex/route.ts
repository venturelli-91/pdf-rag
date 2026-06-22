import { DocumentNotFoundError, reindexDocument } from "@/modules/documents";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * @swagger
 * /api/documents/{id}/reindex:
 *   post:
 *     summary: Reindex a document
 *     description: Rereads the stored file and reruns the parse → chunk → embed pipeline, then replaces the document's chunks in the vector store (delete + insert, since the underlying vector store has no upsert).
 *     tags: [Documents]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Reindexed document
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id: { type: string, format: uuid }
 *                 originalName: { type: string }
 *                 size: { type: integer }
 *                 storedAt: { type: string }
 *                 status: { type: string, enum: [pending, indexed, failed] }
 *                 chunkCount: { type: integer }
 *                 indexedAt: { type: string }
 *       404:
 *         description: Document not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string }
 *       502:
 *         description: Reindexing failed (parsing/embedding/vector-store error)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string }
 */
export async function POST(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  try {
    const record = await reindexDocument(id);
    return NextResponse.json(record, { status: 200 });
  } catch (error) {
    if (error instanceof DocumentNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to reindex document." },
      { status: 502 },
    );
  }
}
