import { BindingFormat } from "@/types";

export interface NormalizedBnBook {
  id: number | string;
  title: string;
  author: string;
  publisher: string;
  publicationYear: number;
  isbn: string;
  formatType: BindingFormat;
  rawDetails?: string;
}

interface RawBnBib {
  id: number;
  title?: string;
  author?: string;
  publisher?: string;
  publicationYear?: string | number;
  isbnIssn?: string;
  subject?: string;
  formOfWork?: string;
}

const BN_API_BASE = process.env.DATA_BN_API_URL || "https://data.bn.org.pl/api";

/**
 * Normalizes an author string from MARC format:
 * "Sapkowski, Andrzej (1948- )" -> "Andrzej Sapkowski"
 */
export function cleanAuthor(rawAuthor?: string): string {
  if (!rawAuthor) return "";
  const cleaned = rawAuthor.replace(/\(\d{4}-?\s*\d*\)/g, "").trim();
  const commaIdx = cleaned.indexOf(",");
  if (commaIdx !== -1) {
    const lastName = cleaned.substring(0, commaIdx).trim();
    const firstName = cleaned.substring(commaIdx + 1).replace(/\.$/, "").trim();
    return `${firstName} ${lastName}`.trim();
  }
  return cleaned.replace(/\.$/, "").trim();
}

/**
 * Normalizes and extracts Polish title from BN catalog record, stripping MARC artifacts and generic genre subtitles.
 */
export function cleanTitle(rawTitle?: string): string {
  if (!rawTitle) return "";
  let base = rawTitle.trim();

  // 1. Remove authorship / responsibility statements after slash (e.g. "... / Clergyman's daughter")
  const slashIdx = base.search(/\s+\/\s+/);
  if (slashIdx !== -1) {
    base = base.substring(0, slashIdx).trim();
  }

  // 2. BN format: "Original title (pol.) Polish title" -> prefer Polish title
  const polIdx = base.indexOf("(pol.)");
  if (polIdx !== -1) {
    const afterPol = base.substring(polIdx + 6).trim();
    if (afterPol.length > 0) {
      base = afterPol;
    }
  }

  // 3. Strip generic genre and edition subtitles after colon (e.g. ": powieść", ": bajka polityczna")
  const colonIdx = base.indexOf(":");
  if (colonIdx !== -1) {
    const mainTitle = base.substring(0, colonIdx).trim();
    const subTitle = base.substring(colonIdx + 1).trim();

    if (/^(powie[sś][cć]|bajka polityczna|reporta[zż])\s*[.,;:]?$/i.test(subTitle)) {
      base = mainTitle;
    }
  }

  return base.replace(/[,.;:/]+$/, "").trim();
}

/**
 * Detects whether the edition is hardcover or paperback from metadata strings.
 */
export function detectFormat(record: RawBnBib): BindingFormat {
  const textBlob = `${record.title || ""} ${record.subject || ""} ${record.isbnIssn || ""}`.toLowerCase();
  if (textBlob.includes("tward") || textBlob.includes("opr. tw") || textBlob.includes("hardcover")) {
    return "hardcover";
  }
  return "paperback";
}

/**
 * Queries Polish National Library API by ISBN (10 or 13 digits).
 */
export async function fetchBnByIsbn(isbn: string): Promise<NormalizedBnBook | null> {
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
  if (!cleanIsbn) return null;

  try {
    const url = `${BN_API_BASE}/bibs.json?isbnIssn=${cleanIsbn}&limit=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (!data.bibs || data.bibs.length === 0) return null;

    const raw: RawBnBib = data.bibs[0];
    const yearNum = typeof raw.publicationYear === "number"
      ? raw.publicationYear
      : Number(String(raw.publicationYear || "").match(/\b[12]\d{3}\b/)?.[0]) || 0;

    return {
      id: raw.id,
      title: cleanTitle(raw.title),
      author: cleanAuthor(raw.author),
      publisher: (raw.publisher || "Nieznane").replace(/[;,\s]+$/, "").trim(),
      publicationYear: yearNum,
      isbn: cleanIsbn,
      formatType: detectFormat(raw),
      rawDetails: raw.title,
    };
  } catch (error) {
    console.error("BN API Lookup Error:", error);
    return null;
  }
}

/**
 * Queries Polish National Library API by title and optional author.
 */
export async function fetchBnByQuery(params: {
  title?: string;
  author?: string;
  limit?: number;
}): Promise<NormalizedBnBook[]> {
  try {
    const query = new URLSearchParams();
    if (params.title) query.set("title", params.title.trim());
    if (params.author) query.set("author", params.author.trim());
    query.set("limit", String(params.limit || 5));

    const url = `${BN_API_BASE}/bibs.json?${query.toString()}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) return [];
    const data = await res.json();
    if (!data.bibs || !Array.isArray(data.bibs)) return [];

    return data.bibs.map((raw: RawBnBib) => {
      const yearNum = typeof raw.publicationYear === "number"
        ? raw.publicationYear
        : Number(String(raw.publicationYear || "").match(/\b[12]\d{3}\b/)?.[0]) || 0;

      const extractedIsbn = (raw.isbnIssn || "").split(/\s+/)[0] || "";

      return {
        id: raw.id,
        title: cleanTitle(raw.title),
        author: cleanAuthor(raw.author),
        publisher: (raw.publisher || "Nieznane").replace(/[,.]/g, "").trim(),
        publicationYear: yearNum,
        isbn: extractedIsbn.replace(/[^0-9X]/gi, ""),
        formatType: detectFormat(raw),
        rawDetails: raw.title,
      };
    });
  } catch (error) {
    console.error("BN API Search Error:", error);
    return [];
  }
}