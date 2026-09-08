import { NextRequest, NextResponse } from "next/server";
import { unifiedSearchByQuery } from "@/lib/api/bookProviders";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || searchParams.get("query") || "";
  const limit = parseInt(searchParams.get("limit") || "8", 10);

  if (!q.trim()) {
    return NextResponse.json(
      { error: "Parametr 'q' (zapytanie) jest wymagany." },
      { status: 400 }
    );
  }

  try {
    const results = await unifiedSearchByQuery(q, limit);

    return NextResponse.json({
      data: results,
      count: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Unified Search API Error:", error);
    return NextResponse.json(
      { error: "Błąd podczas wyszukiwania książek w multi-provider API." },
      { status: 500 }
    );
  }
}
