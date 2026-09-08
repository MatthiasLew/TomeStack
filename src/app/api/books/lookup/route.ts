import { NextRequest, NextResponse } from "next/server";
import { unifiedLookupByIsbn } from "@/lib/api/bookProviders";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isbn = searchParams.get("isbn");

  if (!isbn || !isbn.trim()) {
    return NextResponse.json(
      { error: "Parametr 'isbn' jest wymagany." },
      { status: 400 }
    );
  }

  try {
    const book = await unifiedLookupByIsbn(isbn);

    if (!book) {
      return NextResponse.json(
        { error: "Nie znaleziono książki dla podanego ISBN w żadnej ze zintegrowanych baz (BN, Open Library, Google Books)." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      data: book,
      provider: book.source,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Unified Lookup API Error:", error);
    return NextResponse.json(
      { error: "Błąd podczas odpytywania multi-provider API." },
      { status: 500 }
    );
  }
}
