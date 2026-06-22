import { DocumentNotFoundError, reindexDocument } from "@/modules/documents";
import { NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

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
