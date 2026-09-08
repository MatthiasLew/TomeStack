import { isValidIsbn } from "@/lib/api/validation";
import { NextRequest, NextResponse } from "next/server";
import { fetchBnByIsbn } from "@/lib/api/bn";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const isbn = searchParams.get("isbn");

  if (!isbn || !isValidIsbn(isbn)) {
    return NextResponse.json(
      { error: "Wymagany jest poprawny ISBN-10 lub ISBN-13." },
      { status: 400 }
    );
  }

  const result = await fetchBnByIsbn(isbn);
  if (!result) {
    return NextResponse.json(
      { message: "Nie znaleziono pozycji w rejestrze Biblioteki Narodowej dla podanego ISBN." },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: result });
}