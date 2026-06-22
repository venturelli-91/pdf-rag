import { attachCitations } from "@/modules/citations";
import { GenerationError, generateAnswer } from "@/modules/generation";
import { RetrievalError, retrieveRelevantChunks } from "@/modules/retrieval";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  query: z.string().trim().min(1),
});

/**
 * @swagger
 * /api/query:
 *   post:
 *     summary: Ask a grounded question about the indexed documents
 *     description: Retrieves the most relevant chunks, generates an answer grounded only in that context, and attaches page-level citations derived from the chunks actually used.
 *     tags: [Query]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query: { type: string }
 *     responses:
 *       200:
 *         description: Answer with citations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 answer: { type: string }
 *                 grounded: { type: boolean }
 *                 citations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       documentName: { type: string }
 *                       pageNumber: { type: integer }
 *                       passages:
 *                         type: array
 *                         items: { type: string }
 *       400:
 *         description: Missing or blank question
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string }
 *       502:
 *         description: Retrieval or generation failed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: string }
 */
export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = querySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "A question is required." },
      { status: 400 },
    );
  }

  const { query } = parsed.data;

  try {
    const chunks = await retrieveRelevantChunks(query);
    const answer = await generateAnswer(query, chunks);
    const result = attachCitations(answer, chunks);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof RetrievalError || error instanceof GenerationError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    throw error;
  }
}
