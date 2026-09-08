import { parseSearchLimit } from "@/lib/api/validation";
import { NextRequest, NextResponse } from "next/server";
import { unifiedSearchByQuery, unifiedSearchByAuthor } from "@/lib/api/bookProviders";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || searchParams.get("query") || "";
  const author = searchParams.get("author") || "";
  const limit = parseSearchLimit(searchParams.get("limit"), 16);
  if ((q?.length || 0) > 200 || (author?.length || 0) > 200) return NextResponse.json({ error: "Query is too long (max 200 characters)" }, { status: 400 });
  if (limit === null) return NextResponse.json({ error: "limit must be an integer from 1 to 40" }, { status: 400 });

  if (!q.trim() && !author.trim()) {
    return NextResponse.json(
      { error: "Parametr 'q' (zapytanie) lub 'author' (autor) jest wymagany." },
      { status: 400 }
    );
  }

  try {
    const results = author.trim()
      ? await unifiedSearchByAuthor(author.trim(), limit)
      : await unifiedSearchByQuery(q.trim(), limit);

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
