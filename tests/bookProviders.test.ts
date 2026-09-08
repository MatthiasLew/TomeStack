import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getOpenLibraryCoverUrl,
  normalizeBindingFormat,
  extractYear,
  unifiedSearchByAuthor,
  canonicalizeBookTitle,
  cleanDisplayTitle,
} from "../src/lib/api/bookProviders";

test("getOpenLibraryCoverUrl generates valid cover URLs", () => {
  const url = getOpenLibraryCoverUrl("978-83-287-1616-2", "L");
  assert.equal(url, "https://covers.openlibrary.org/b/isbn/9788328716162-L.jpg?default=false");
});

test("cleanDisplayTitle strips subtitles and cataloging artifacts", () => {
  assert.equal(cleanDisplayTitle("Córka proboszcza : powieść"), "Córka proboszcza");
  assert.equal(cleanDisplayTitle("Folwark zwierzęcy : bajka polityczna"), "Folwark zwierzęcy");
  assert.equal(cleanDisplayTitle("Rok 1984 / George Orwell"), "Rok 1984");
});

test("canonicalizeBookTitle equates distinct editions of the same work", () => {
  const c1 = canonicalizeBookTitle("Córka proboszcza");
  const c2 = canonicalizeBookTitle("Córka proboszcza : powieść");
  const c3 = canonicalizeBookTitle("Corka proboszcza");
  const c4 = canonicalizeBookTitle("Córka proboszcza : powieść / Clergyman's daughter");

  assert.equal(c1, c2);
  assert.equal(c2, c3);
  assert.equal(c3, c4);

  const orwell1 = canonicalizeBookTitle("Rok 1984");
  const orwell2 = canonicalizeBookTitle("1984");
  const orwell3 = canonicalizeBookTitle("Nineteen eighty-four (pol.) Rok 1984");

  assert.equal(orwell1, orwell2);
  assert.equal(orwell2, orwell3);
});

test("normalizeBindingFormat handles various binding descriptions", () => {
  assert.equal(normalizeBindingFormat("hardcover"), "hardcover");
  assert.equal(normalizeBindingFormat("oprawa twarda"), "hardcover");
  assert.equal(normalizeBindingFormat("miękka ze skrzydełkami"), "paperback");
  assert.equal(normalizeBindingFormat(undefined), "paperback");
});

test("extractYear extracts 4-digit years accurately", () => {
  assert.equal(extractYear("2021"), 2021);
  assert.equal(extractYear("May 14, 2019"), 2019);
  assert.equal(extractYear("1949-06-08"), 1949);
  assert.equal(extractYear(undefined), undefined);
});

test("unifiedSearchByAuthor returns unique books without duplicates", async () => {
  const books = await unifiedSearchByAuthor("George Orwell", 20);
  assert.ok(books.length >= 4);

  // Check no duplicates by canonical title
  const canonicalKeys = books.map((b) => canonicalizeBookTitle(b.title));
  const uniqueKeys = new Set(canonicalKeys);
  assert.equal(
    canonicalKeys.length,
    uniqueKeys.size,
    "Author search bibliography must have zero duplicate book cards"
  );
});
