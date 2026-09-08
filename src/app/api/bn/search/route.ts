import { NextRequest, NextResponse } from "next/server";
import { fetchBnByQuery } from "@/lib/api/bn";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || undefined;
  const author = searchParams.get("author") || undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : 5;

  if (!title && !author) {
    return NextResponse.json(
      { error: "Wymagany jest przynajmniej parametr 'title' lub 'author'." },
      { status: 400 }
    );
  }

  const results = await fetchBnByQuery({ title, author, limit });
  return NextResponse.json({ count: results.length, data: results });
}