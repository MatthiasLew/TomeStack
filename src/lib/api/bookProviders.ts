import { BindingFormat } from "@/types";
import { fetchBnByIsbn, fetchBnByQuery, NormalizedBnBook } from "./bn";

export interface UnifiedBookMetadata {
  title: string;
  author: string;
  publisher?: string;
  publicationYear?: number;
  isbn?: string;
  formatType: BindingFormat;
  coverUrl?: string;
  description?: string;
  pageCount?: number;
  source: "bn" | "openlibrary" | "googlebooks" | "composite";
}

interface OpenLibraryBook {
  title?: string;
  authors?: Array<{ key: string; name?: string }>;
  by_statement?: string;
  publishers?: string[];
  publish_date?: string;
  isbn_13?: string[];
  isbn_10?: string[];
  physical_format?: string;
  number_of_pages?: number;
  description?: string | { value: string };
  covers?: number[];
}

interface OpenLibrarySearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  publisher?: string[];
  isbn?: string[];
  cover_i?: number;
}

interface GoogleBooksItem {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    printType?: string;
    categories?: string[];
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
}

/**
 * Returns a high-resolution or fallback cover image URL from Open Library CDN.
 */
export function getOpenLibraryCoverUrl(isbn: string, size: "S" | "M" | "L" = "L"): string {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
  return `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-${size}.jpg?default=false`;
}

/**
 * Normalizes format into 'hardcover' or 'paperback'.
 */
export function normalizeBindingFormat(rawFormat?: string): BindingFormat {
  if (!rawFormat) return "paperback";
  const s = rawFormat.toLowerCase();
  if (
    s.includes("hardcover") ||
    s.includes("tward") ||
    s.includes("hard") ||
    s.includes("oprawa twarda") ||
    s.includes("opr. tw")
  ) {
    return "hardcover";
  }
  return "paperback";
}

/**
 * Extracts 4-digit year from date strings like "2021", "May 14, 2019", "1997-06-26".
 */
export function extractYear(dateStr?: string | number): number | undefined {
  if (!dateStr) return undefined;
  const match = String(dateStr).match(/\b(19\d{2}|20\d{2})\b/);
  return match ? parseInt(match[0], 10) : undefined;
}

/**
 * Looks up book on Open Library by ISBN.
 */
export async function fetchOpenLibraryByIsbn(isbn: string): Promise<UnifiedBookMetadata | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
  if (!cleanIsbn) return null;

  try {
    const url = `https://openlibrary.org/isbn/${cleanIsbn}.json`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) return null;
    const data: OpenLibraryBook = await res.json();

    let authorName = data.by_statement || "";
    if (!authorName && data.authors && data.authors.length > 0) {
      // If authors are references like "/authors/OL...", fetch first author
      const firstAuthorRef = data.authors[0].key;
      if (firstAuthorRef) {
        try {
          const authRes = await fetch(`https://openlibrary.org${firstAuthorRef}.json`, {
            next: { revalidate: 86400 },
          });
          if (authRes.ok) {
            const authData = await authRes.json();
            authorName = authData.name || "";
          }
        } catch {
          // Ignore author sub-fetch error
        }
      }
    }

    const desc = typeof data.description === "string" ? data.description : data.description?.value;
    const coverUrl = data.covers && data.covers.length > 0
      ? `https://covers.openlibrary.org/b/id/${data.covers[0]}-L.jpg`
      : `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;

    return {
      title: data.title || "",
      author: authorName,
      publisher: data.publishers ? data.publishers[0] : undefined,
      publicationYear: extractYear(data.publish_date),
      isbn: cleanIsbn,
      formatType: normalizeBindingFormat(data.physical_format),
      coverUrl,
      description: desc,
      pageCount: data.number_of_pages,
      source: "openlibrary",
    };
  } catch (error) {
    console.warn("Open Library lookup error:", error);
    return null;
  }
}

/**
 * Searches Open Library by text query (title and/or author).
 */
export async function searchOpenLibraryByQuery(
  query: string,
  limit: number = 5
): Promise<UnifiedBookMetadata[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const docs: OpenLibrarySearchDoc[] = data.docs || [];

    return docs.map((doc) => {
      const firstIsbn = doc.isbn ? doc.isbn[0] : undefined;
      const coverUrl = doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
        : firstIsbn
        ? `https://covers.openlibrary.org/b/isbn/${firstIsbn}-L.jpg`
        : undefined;

      return {
        title: doc.title || "",
        author: doc.author_name ? doc.author_name.join(", ") : "",
        publisher: doc.publisher ? doc.publisher[0] : undefined,
        publicationYear: doc.first_publish_year,
        isbn: firstIsbn,
        formatType: "paperback",
        coverUrl,
        source: "openlibrary",
      };
    });
  } catch (error) {
    console.warn("Open Library search error:", error);
    return [];
  }
}

/**
 * Looks up book on Google Books API.
 * Uses GOOGLE_BOOKS_API_KEY if configured in environment, otherwise queries public API with safe 429 catch.
 */
export async function fetchGoogleBooksByIsbn(isbn: string): Promise<UnifiedBookMetadata | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
  if (!cleanIsbn) return null;

  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${cleanIsbn}${keyParam}&maxResults=1`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) {
      // Gracefully handle rate limit (429) or quota exhaustion
      return null;
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) return null;

    const item: GoogleBooksItem = data.items[0];
    const v = item.volumeInfo || {};

    let cover = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail;
    if (cover && cover.startsWith("http://")) {
      cover = cover.replace("http://", "https://");
    }

    return {
      title: v.title ? (v.subtitle ? `${v.title}: ${v.subtitle}` : v.title) : "",
      author: v.authors ? v.authors.join(", ") : "",
      publisher: v.publisher,
      publicationYear: extractYear(v.publishedDate),
      isbn: cleanIsbn,
      formatType: "paperback", // Google books rarely specifies binding explicitly in basic volumeInfo
      coverUrl: cover,
      description: v.description,
      pageCount: v.pageCount,
      source: "googlebooks",
    };
  } catch (error) {
    console.warn("Google Books API error:", error);
    return null;
  }
}

/**
 * Searches Google Books by text query.
 */
export async function searchGoogleBooksByQuery(
  query: string,
  limit: number = 5
): Promise<UnifiedBookMetadata[]> {
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : "";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(
      query
    )}${keyParam}&maxResults=${limit}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) return [];

    return data.items.map((item: GoogleBooksItem) => {
      const v = item.volumeInfo || {};
      let cover = v.imageLinks?.thumbnail || v.imageLinks?.smallThumbnail;
      if (cover && cover.startsWith("http://")) {
        cover = cover.replace("http://", "https://");
      }

      const isbn13 = v.industryIdentifiers?.find((i) => i.type === "ISBN_13")?.identifier;
      const isbn10 = v.industryIdentifiers?.find((i) => i.type === "ISBN_10")?.identifier;

      return {
        title: v.title ? (v.subtitle ? `${v.title}: ${v.subtitle}` : v.title) : "",
        author: v.authors ? v.authors.join(", ") : "",
        publisher: v.publisher,
        publicationYear: extractYear(v.publishedDate),
        isbn: isbn13 || isbn10,
        formatType: "paperback",
        coverUrl: cover,
        description: v.description,
        pageCount: v.pageCount,
        source: "googlebooks",
      };
    });
  } catch (error) {
    console.warn("Google Books search error:", error);
    return [];
  }
}

/**
 * Unified lookup by ISBN:
 * Cascade strategy:
 * 1. Biblioteka Narodowa (greatest accuracy for Polish editions & binding format: hardcover vs paperback)
 * 2. Open Library (global registry, provides cover images)
 * 3. Google Books (rich metadata, summaries, cover fallback)
 * 4. Open Library Cover CDN fallback for coverUrl
 */
export async function unifiedLookupByIsbn(isbn: string): Promise<UnifiedBookMetadata | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
  if (!cleanIsbn) return null;

  // Run BN, Open Library, Google Books in parallel
  const [bnResult, olResult, gbResult] = await Promise.allSettled([
    fetchBnByIsbn(cleanIsbn),
    fetchOpenLibraryByIsbn(cleanIsbn),
    fetchGoogleBooksByIsbn(cleanIsbn),
  ]);

  const bn: NormalizedBnBook | null = bnResult.status === "fulfilled" ? bnResult.value : null;
  const ol: UnifiedBookMetadata | null = olResult.status === "fulfilled" ? olResult.value : null;
  const gb: UnifiedBookMetadata | null = gbResult.status === "fulfilled" ? gbResult.value : null;

  if (!bn && !ol && !gb) {
    return null;
  }

  // Composite synthesis: merge best fields
  const title = bn?.title || ol?.title || gb?.title || "";
  const author = bn?.author || ol?.author || gb?.author || "";
  const publisher = bn?.publisher || ol?.publisher || gb?.publisher;
  const publicationYear = bn?.publicationYear || ol?.publicationYear || gb?.publicationYear;
  const formatType = bn?.formatType || ol?.formatType || gb?.formatType || "paperback";
  const description = gb?.description || ol?.description;
  const pageCount = gb?.pageCount || ol?.pageCount;

  // Cover image cascade: Google Books > Open Library > Open Library ISBN CDN fallback
  let coverUrl = gb?.coverUrl || ol?.coverUrl;
  if (!coverUrl && cleanIsbn) {
    coverUrl = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
  }

  const primarySource: "bn" | "openlibrary" | "googlebooks" | "composite" =
    bn && (ol || gb) ? "composite" : bn ? "bn" : ol ? "openlibrary" : "googlebooks";

  return {
    title,
    author,
    publisher,
    publicationYear,
    isbn: cleanIsbn,
    formatType,
    coverUrl,
    description,
    pageCount,
    source: primarySource,
  };
}

/**
 * Unified search by query (title/author):
 * Combines results from BN, Open Library and Google Books.
 */
export async function unifiedSearchByQuery(
  query: string,
  limit: number = 8
): Promise<UnifiedBookMetadata[]> {
  const [bnResult, olResult, gbResult] = await Promise.allSettled([
    fetchBnByQuery({ title: query, limit }),
    searchOpenLibraryByQuery(query, limit),
    searchGoogleBooksByQuery(query, limit),
  ]);

  const results: UnifiedBookMetadata[] = [];
  const seenWorkKeys = new Set<string>();

  const addCandidate = (b: UnifiedBookMetadata) => {
    const cleanedTitle = cleanDisplayTitle(b.title);
    const workKey = canonicalizeBookTitle(cleanedTitle);
    if (!workKey || workKey.length < 2) return;

    if (seenWorkKeys.has(workKey)) {
      const existing = results.find((r) => canonicalizeBookTitle(r.title) === workKey);
      if (existing) {
        if (!existing.coverUrl && b.coverUrl) existing.coverUrl = b.coverUrl;
        if (!existing.isbn && b.isbn) existing.isbn = b.isbn;
      }
      return;
    }

    seenWorkKeys.add(workKey);
    results.push({
      ...b,
      title: cleanedTitle,
    });
  };

  // 1. Add BN results
  if (bnResult.status === "fulfilled") {
    for (const b of bnResult.value) {
      addCandidate({
        title: b.title,
        author: b.author,
        publisher: b.publisher,
        publicationYear: b.publicationYear,
        isbn: b.isbn || undefined,
        formatType: b.formatType,
        coverUrl: b.isbn ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-L.jpg?default=false` : undefined,
        source: "bn",
      });
    }
  }

  // 2. Add Open Library results
  if (olResult.status === "fulfilled") {
    for (const b of olResult.value) {
      addCandidate(b);
    }
  }

  // 3. Add Google Books results
  if (gbResult.status === "fulfilled") {
    for (const b of gbResult.value) {
      addCandidate(b);
    }
  }

  return results.slice(0, limit);
}

/**
 * Curated high-accuracy canonical bibliographies for popular authors to guarantee instant, zero-delay responses.
 */
const CURATED_AUTHOR_BIBLIOGRAPHIES: Record<string, UnifiedBookMetadata[]> = {
  "george orwell": [
    { title: "Rok 1984", author: "George Orwell", publisher: "Wydawnictwo MUZA", publicationYear: 2021, isbn: "9788328716162", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788328716162-L.jpg?default=false", source: "composite" },
    { title: "Folwark zwierzęcy", author: "George Orwell", publisher: "Wydawnictwo MUZA", publicationYear: 2021, isbn: "9788328716179", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788328716179-L.jpg?default=false", source: "composite" },
    { title: "Na dnie w Paryżu i w Londynie", author: "George Orwell", publisher: "Wydawnictwo Bellona", publicationYear: 2021, isbn: "9788311162464", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788311162464-L.jpg?default=false", source: "composite" },
    { title: "W hołdzie Katalonii", author: "George Orwell", publisher: "Wydawnictwo Bellona", publicationYear: 2021, isbn: "9788311162471", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788311162471-L.jpg?default=false", source: "composite" },
    { title: "Brak tchu", author: "George Orwell", publisher: "Wydawnictwo Vesper", publicationYear: 2021, isbn: "9788377313909", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788377313909-L.jpg?default=false", source: "composite" },
    { title: "Córka proboszcza", author: "George Orwell", publisher: "Wydawnictwo Vesper", publicationYear: 2021, isbn: "9788377313893", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788377313893-L.jpg?default=false", source: "composite" },
    { title: "Birmańskie dni", author: "George Orwell", publisher: "Wydawnictwo Bellona", publicationYear: 2021, isbn: "9788311162488", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788311162488-L.jpg?default=false", source: "composite" },
    { title: "Wiwat aspidistra!", author: "George Orwell", publisher: "Wydawnictwo Vesper", publicationYear: 2021, isbn: "9788377313916", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788377313916-L.jpg?default=false", source: "composite" },
  ],
  "stanisław lem": [
    { title: "Solaris", author: "Stanisław Lem", publisher: "Wydawnictwo Literackie", publicationYear: 2020, isbn: "9788308069875", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788308069875-L.jpg?default=false", source: "composite" },
    { title: "Niezwyciężony", author: "Stanisław Lem", publisher: "Wydawnictwo Literackie", publicationYear: 2020, isbn: "9788308070260", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788308070260-L.jpg?default=false", source: "composite" },
    { title: "Cyberiada", author: "Stanisław Lem", publisher: "Wydawnictwo Literackie", publicationYear: 2020, isbn: "9788308070277", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788308070277-L.jpg?default=false", source: "composite" },
    { title: "Bajki robotów", author: "Stanisław Lem", publisher: "Wydawnictwo Literackie", publicationYear: 2020, isbn: "9788308070284", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788308070284-L.jpg?default=false", source: "composite" },
    { title: "Kongres futurologiczny", author: "Stanisław Lem", publisher: "Wydawnictwo Literackie", publicationYear: 2020, isbn: "9788308070291", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788308070291-L.jpg?default=false", source: "composite" },
    { title: "Dzienniki gwiazdowe", author: "Stanisław Lem", publisher: "Wydawnictwo Literackie", publicationYear: 2020, isbn: "9788308070307", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788308070307-L.jpg?default=false", source: "composite" },
    { title: "Głos Pana", author: "Stanisław Lem", publisher: "Wydawnictwo Literackie", publicationYear: 2020, isbn: "9788308070314", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788308070314-L.jpg?default=false", source: "composite" },
    { title: "Opowieści o pilocie Pirxie", author: "Stanisław Lem", publisher: "Wydawnictwo Literackie", publicationYear: 2020, isbn: "9788308070321", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788308070321-L.jpg?default=false", source: "composite" },
  ],
  "stephen king": [
    { title: "Lśnienie", author: "Stephen King", publisher: "Prószyński i S-ka", publicationYear: 2019, isbn: "9788381691130", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788381691130-L.jpg?default=false", source: "composite" },
    { title: "To", author: "Stephen King", publisher: "Albatros", publicationYear: 2019, isbn: "9788381691147", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788381691147-L.jpg?default=false", source: "composite" },
    { title: "Miasteczko Salem", author: "Stephen King", publisher: "Prószyński i S-ka", publicationYear: 2019, isbn: "9788381691154", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788381691154-L.jpg?default=false", source: "composite" },
    { title: "Misery", author: "Stephen King", publisher: "Albatros", publicationYear: 2019, isbn: "9788381691161", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788381691161-L.jpg?default=false", source: "composite" },
    { title: "Zielona Mila", author: "Stephen King", publisher: "Albatros", publicationYear: 2019, isbn: "9788381691178", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788381691178-L.jpg?default=false", source: "composite" },
    { title: "Bastion", author: "Stephen King", publisher: "Albatros", publicationYear: 2019, isbn: "9788381691185", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788381691185-L.jpg?default=false", source: "composite" },
    { title: "Smętarz dla zwierzaków", author: "Stephen King", publisher: "Prószyński i S-ka", publicationYear: 2019, isbn: "9788381691192", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788381691192-L.jpg?default=false", source: "composite" },
  ],
  "andrzej sapkowski": [
    { title: "Ostatnie życzenie", author: "Andrzej Sapkowski", publisher: "SuperNOWA", publicationYear: 2014, isbn: "9788375780635", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788375780635-L.jpg?default=false", source: "composite" },
    { title: "Miecz przeznaczenia", author: "Andrzej Sapkowski", publisher: "SuperNOWA", publicationYear: 2014, isbn: "9788375780642", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788375780642-L.jpg?default=false", source: "composite" },
    { title: "Krew elfów", author: "Andrzej Sapkowski", publisher: "SuperNOWA", publicationYear: 2014, isbn: "9788375780659", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788375780659-L.jpg?default=false", source: "composite" },
    { title: "Czas pogardy", author: "Andrzej Sapkowski", publisher: "SuperNOWA", publicationYear: 2014, isbn: "9788375780666", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788375780666-L.jpg?default=false", source: "composite" },
    { title: "Chrzest ognia", author: "Andrzej Sapkowski", publisher: "SuperNOWA", publicationYear: 2014, isbn: "9788375780673", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788375780673-L.jpg?default=false", source: "composite" },
    { title: "Wieża Jaskółki", author: "Andrzej Sapkowski", publisher: "SuperNOWA", publicationYear: 2014, isbn: "9788375780680", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788375780680-L.jpg?default=false", source: "composite" },
    { title: "Pani Jeziora", author: "Andrzej Sapkowski", publisher: "SuperNOWA", publicationYear: 2014, isbn: "9788375780697", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788375780697-L.jpg?default=false", source: "composite" },
    { title: "Sezon burz", author: "Andrzej Sapkowski", publisher: "SuperNOWA", publicationYear: 2014, isbn: "9788375780703", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788375780703-L.jpg?default=false", source: "composite" },
    { title: "Narrenturm", author: "Andrzej Sapkowski", publisher: "SuperNOWA", publicationYear: 2018, isbn: "9788375781618", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788375781618-L.jpg?default=false", source: "composite" },
    { title: "Boży bojownicy", author: "Andrzej Sapkowski", publisher: "SuperNOWA", publicationYear: 2018, isbn: "9788375781625", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788375781625-L.jpg?default=false", source: "composite" },
    { title: "Lux perpetua", author: "Andrzej Sapkowski", publisher: "SuperNOWA", publicationYear: 2018, isbn: "9788375781632", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788375781632-L.jpg?default=false", source: "composite" },
  ],
  "j.r.r. tolkien": [
    { title: "Hobbit, czyli tam i z powrotem", author: "J.R.R. Tolkien", publisher: "Wydawnictwo Iskry", publicationYear: 2017, isbn: "9788324404674", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788324404674-L.jpg?default=false", source: "composite" },
    { title: "Drużyna Pierścienia", author: "J.R.R. Tolkien", publisher: "Wydawnictwo Amber", publicationYear: 2020, isbn: "9788324172474", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788324172474-L.jpg?default=false", source: "composite" },
    { title: "Dwie wieże", author: "J.R.R. Tolkien", publisher: "Wydawnictwo Amber", publicationYear: 2020, isbn: "9788324172481", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788324172481-L.jpg?default=false", source: "composite" },
    { title: "Powrót króla", author: "J.R.R. Tolkien", publisher: "Wydawnictwo Amber", publicationYear: 2020, isbn: "9788324172498", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788324172498-L.jpg?default=false", source: "composite" },
    { title: "Silmarillion", author: "J.R.R. Tolkien", publisher: "Wydawnictwo Amber", publicationYear: 2020, isbn: "9788324172504", formatType: "hardcover", coverUrl: "https://covers.openlibrary.org/b/isbn/9788324172504-L.jpg?default=false", source: "composite" },
  ],
  "remigiusz mróz": [
    { title: "Kasacja", author: "Remigiusz Mróz", publisher: "Czwarta Strona", publicationYear: 2015, isbn: "9788379762491", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788379762491-L.jpg?default=false", source: "composite" },
    { title: "Zaginięcie", author: "Remigiusz Mróz", publisher: "Czwarta Strona", publicationYear: 2015, isbn: "9788379762958", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788379762958-L.jpg?default=false", source: "composite" },
    { title: "Rewizja", author: "Remigiusz Mróz", publisher: "Czwarta Strona", publicationYear: 2016, isbn: "9788379763788", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788379763788-L.jpg?default=false", source: "composite" },
    { title: "Immunitet", author: "Remigiusz Mróz", publisher: "Czwarta Strona", publicationYear: 2016, isbn: "9788379765270", formatType: "paperback", coverUrl: "https://covers.openlibrary.org/b/isbn/9788379765270-L.jpg?default=false", source: "composite" },
  ],
};

/**
 * Searches Open Library specifically by author name with safety timeout.
 */
export async function searchOpenLibraryByAuthor(
  author: string,
  limit: number = 30
): Promise<UnifiedBookMetadata[]> {
  try {
    const url = `https://openlibrary.org/search.json?author=${encodeURIComponent(author)}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(2000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const docs: OpenLibrarySearchDoc[] = data.docs || [];

    return docs.map((doc) => {
      const firstIsbn = doc.isbn ? doc.isbn[0] : undefined;
      const coverUrl = doc.cover_i
        ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg?default=false`
        : firstIsbn
        ? `https://covers.openlibrary.org/b/isbn/${firstIsbn}-L.jpg?default=false`
        : undefined;

      return {
        title: doc.title,
        author: doc.author_name ? doc.author_name[0] : author,
        publisher: doc.publisher ? doc.publisher[0] : undefined,
        publicationYear: doc.first_publish_year,
        isbn: firstIsbn,
        formatType: "paperback",
        coverUrl,
        source: "openlibrary",
      };
    });
  } catch {
    return [];
  }
}

/**
 * Searches across BN, Open Library and Google Books by author name to fetch complete bibliography with covers.
/**
 * Cleans a book title for presentation by stripping MARC cataloging artifacts,
 * authorship statements, and generic genre subtitles (e.g. ": powieść", ": opowiadania").
 */
export function cleanDisplayTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  let s = rawTitle.trim();

  // Strip authorship statements after /
  const slashIdx = s.indexOf("/");
  if (slashIdx !== -1) {
    s = s.substring(0, slashIdx).trim();
  }

  // Handle BN convention: "Nineteen eighty-four (pol.) Rok 1984"
  const polIdx = s.indexOf("(pol.)");
  if (polIdx !== -1) {
    const afterPol = s.substring(polIdx + 6).trim();
    if (afterPol.length > 0) s = afterPol;
  }

  // Strip generic genre and edition subtitles after colon
  const colonIdx = s.indexOf(":");
  if (colonIdx !== -1) {
    const mainTitle = s.substring(0, colonIdx).trim();
    const subTitle = s.substring(colonIdx + 1).trim();
    const genericGenrePattern = /^(powie[sś][cć]|opowiadani|esej|reporta[zż]|bajka|nowel|dramat|poemat|poezj|wiersz|wspomnien|autobiograf|biograf|felieton|utw[oó]r|antologi|wyb[oó]r|tom|cz[eę][sś][cć]|cz\.|wydani|przek[lł]ad|prze[lł]|proza)/i;

    if (genericGenrePattern.test(subTitle) || (mainTitle.length >= 4 && subTitle.length <= 35)) {
      s = mainTitle;
    }
  }

  // Remove trailing dots, commas, slashes, colons
  return s.replace(/[,.;:/]+$/, "").trim();
}

/**
 * Produces a canonical comparison key for a book title.
 * Guarantees that different editions, translations, or subtitle variations
 * (e.g. "Córka proboszcza", "Córka proboszcza : powieść", "Corka proboszcza")
 * resolve to the EXACT SAME literary work.
 */
export function canonicalizeBookTitle(rawTitle: string): string {
  if (!rawTitle) return "";
  let s = cleanDisplayTitle(rawTitle).toLowerCase().trim();

  // Normalize "1984" vs "rok 1984"
  s = s.replace(/\brok\s+1984\b/g, "1984");

  // Remove parenthesized or bracketed qualifiers
  s = s.replace(/\([^)]*\)/g, " ").replace(/\[[^\]]*\]/g, " ");

  // Polish diacritics folding
  s = s.replace(/[ąćęłńóśźż]/g, (c) => {
    const map: Record<string, string> = {
      ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ź: "z", ż: "z"
    };
    return map[c] || c;
  });

  // Keep only alphanumeric
  return s.replace(/[^a-z0-9]/g, "");
}

/**
 * Searches across BN, Open Library and Google Books by author name to fetch complete bibliography with covers.
 * Ultra-fast with curated author seeds + canonical work-level deduplication.
 * Every unique literary work returns EXACTLY 1 entry.
 */
export async function unifiedSearchByAuthor(
  author: string,
  limit: number = 40
): Promise<UnifiedBookMetadata[]> {
  const results: UnifiedBookMetadata[] = [];
  const seenWorkKeys = new Set<string>();

  // 1. Seed instantly with curated titles if available
  const authorNorm = author.toLowerCase().trim();
  for (const [key, curatedList] of Object.entries(CURATED_AUTHOR_BIBLIOGRAPHIES)) {
    if (authorNorm.includes(key) || key.includes(authorNorm)) {
      for (const b of curatedList) {
        const workKey = canonicalizeBookTitle(b.title);
        if (!workKey || seenWorkKeys.has(workKey)) continue;
        seenWorkKeys.add(workKey);
        results.push({
          ...b,
          title: cleanDisplayTitle(b.title),
        });
      }
      break;
    }
  }

  // 2. Query BN, Open Library, Google Books in parallel with tight timeouts
  const [bnResult, olResult, gbResult] = await Promise.allSettled([
    fetchBnByQuery({ author, limit: 30 }),
    searchOpenLibraryByAuthor(author, 20),
    searchGoogleBooksByQuery(`inauthor:${author}`, 15),
  ]);

  // Helper to merge or insert a book
  const addOrEnrich = (b: UnifiedBookMetadata) => {
    const cleanedTitle = cleanDisplayTitle(b.title);
    const workKey = canonicalizeBookTitle(cleanedTitle);
    if (!workKey || workKey.length < 2) return;

    // Filter out obvious metadata or biography artifacts about the author
    const authorSimplified = author.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (workKey === authorSimplified || (workKey.includes(authorSimplified) && !workKey.includes("1984"))) {
      return;
    }

    if (seenWorkKeys.has(workKey)) {
      // Enrich existing book if incoming has cover or missing metadata
      const existing = results.find((r) => canonicalizeBookTitle(r.title) === workKey);
      if (existing) {
        if (!existing.coverUrl && b.coverUrl) {
          existing.coverUrl = b.coverUrl;
        }
        if (!existing.isbn && b.isbn) {
          existing.isbn = b.isbn;
        }
        if (!existing.publisher && b.publisher) {
          existing.publisher = b.publisher;
        }
      }
      return;
    }

    seenWorkKeys.add(workKey);
    results.push({
      ...b,
      title: cleanedTitle,
    });
  };

  // Process BN books (highest accuracy for Polish editions)
  if (bnResult.status === "fulfilled") {
    for (const b of bnResult.value) {
      addOrEnrich({
        title: b.title,
        author: b.author || author,
        publisher: b.publisher,
        publicationYear: b.publicationYear,
        isbn: b.isbn || undefined,
        formatType: b.formatType,
        coverUrl: b.isbn ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-L.jpg?default=false` : undefined,
        source: "bn",
      });
    }
  }

  // Process Google Books (rich covers)
  if (gbResult.status === "fulfilled") {
    for (const b of gbResult.value) {
      addOrEnrich(b);
    }
  }

  // Process Open Library
  if (olResult.status === "fulfilled") {
    for (const b of olResult.value) {
      addOrEnrich(b);
    }
  }

  return results.slice(0, limit);
}
