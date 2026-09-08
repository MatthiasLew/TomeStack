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
  const seenIsbns = new Set<string>();
  const seenTitles = new Set<string>();

  // 1. Add BN results
  if (bnResult.status === "fulfilled") {
    for (const b of bnResult.value) {
      if (b.isbn) seenIsbns.add(b.isbn);
      seenTitles.add(b.title.toLowerCase());
      results.push({
        title: b.title,
        author: b.author,
        publisher: b.publisher,
        publicationYear: b.publicationYear,
        isbn: b.isbn || undefined,
        formatType: b.formatType,
        coverUrl: b.isbn ? `https://covers.openlibrary.org/b/isbn/${b.isbn}-L.jpg` : undefined,
        source: "bn",
      });
    }
  }

  // 2. Add Open Library results
  if (olResult.status === "fulfilled") {
    for (const b of olResult.value) {
      const normTitle = b.title.toLowerCase();
      if (b.isbn && seenIsbns.has(b.isbn)) continue;
      if (seenTitles.has(normTitle)) continue;
      if (b.isbn) seenIsbns.add(b.isbn);
      seenTitles.add(normTitle);
      results.push(b);
    }
  }

  // 3. Add Google Books results
  if (gbResult.status === "fulfilled") {
    for (const b of gbResult.value) {
      const normTitle = b.title.toLowerCase();
      if (b.isbn && seenIsbns.has(b.isbn)) continue;
      if (seenTitles.has(normTitle)) continue;
      if (b.isbn) seenIsbns.add(b.isbn);
      seenTitles.add(normTitle);
      results.push(b);
    }
  }

  return results.slice(0, limit);
}

/**
 * Searches Open Library specifically by author name.
 */
export async function searchOpenLibraryByAuthor(
  author: string,
  limit: number = 10
): Promise<UnifiedBookMetadata[]> {
  try {
    const url = `https://openlibrary.org/search.json?author=${encodeURIComponent(author)}&limit=${limit}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
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
  } catch (error) {
    console.warn("Open Library author search error:", error);
    return [];
  }
}

/**
 * Searches across BN, Open Library and Google Books by author name to fetch complete bibliography with covers.
 */
export async function unifiedSearchByAuthor(
  author: string,
  limit: number = 24
): Promise<UnifiedBookMetadata[]> {
  const [bnResult, olResult, gbResult] = await Promise.allSettled([
    fetchBnByQuery({ author, limit }),
    searchOpenLibraryByAuthor(author, limit),
    searchGoogleBooksByQuery(`inauthor:${author}`, limit),
  ]);

  const results: UnifiedBookMetadata[] = [];
  const seenTitles = new Set<string>();

  // Helper to normalize title for deduplication
  const normalize = (t: string) =>
    t.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]/gi, "").trim();

  // 1. Process BN books
  if (bnResult.status === "fulfilled") {
    for (const b of bnResult.value) {
      const key = normalize(b.title);
      if (!key || seenTitles.has(key)) continue;
      seenTitles.add(key);
      results.push({
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

  // 2. Process Google Books (often provides highest quality covers)
  if (gbResult.status === "fulfilled") {
    for (const b of gbResult.value) {
      const key = normalize(b.title);
      if (!key) continue;
      if (seenTitles.has(key)) {
        // If we already have the title but no cover, update the cover
        const existing = results.find((r) => normalize(r.title) === key);
        if (existing && !existing.coverUrl && b.coverUrl) {
          existing.coverUrl = b.coverUrl;
        }
        continue;
      }
      seenTitles.add(key);
      results.push(b);
    }
  }

  // 3. Process Open Library
  if (olResult.status === "fulfilled") {
    for (const b of olResult.value) {
      const key = normalize(b.title);
      if (!key) continue;
      if (seenTitles.has(key)) {
        const existing = results.find((r) => normalize(r.title) === key);
        if (existing && !existing.coverUrl && b.coverUrl) {
          existing.coverUrl = b.coverUrl;
        }
        continue;
      }
      seenTitles.add(key);
      results.push(b);
    }
  }

  return results.slice(0, limit);
}
