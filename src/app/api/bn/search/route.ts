import { parseSearchLimit } from "@/lib/api/validation";
import { NextRequest, NextResponse } from "next/server";
import { fetchBnByQuery } from "@/lib/api/bn";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title")?.trim() || undefined;
  const author = searchParams.get("author")?.trim() || undefined;
  const limitParam = searchParams.get("limit");
  const limit = parseSearchLimit(limitParam, 5);
  if ((title?.length || 0) > 200 || (author?.length || 0) > 200) return NextResponse.json({ error: "Query is too long (max 200 characters)" }, { status: 400 });
  if (limit === null) return NextResponse.json({ error: "limit must be an integer from 1 to 40" }, { status: 400 });

  if (!title && !author) {
    return NextResponse.json(
      { error: "Wymagany jest przynajmniej parametr 'title' lub 'author'." },
      { status: 400 }
    );
  }

  const results = await fetchBnByQuery({ title, author, limit });
  return NextResponse.json({ count: results.length, data: results });
}