import { attachCitations } from "@/modules/citations";
import { GenerationError, generateAnswer } from "@/modules/generation";
import { RetrievalError, retrieveRelevantChunks } from "@/modules/retrieval";
import { NextResponse } from "next/server";
import { z } from "zod";

const querySchema = z.object({
  query: z.string().trim().min(1),
});

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
