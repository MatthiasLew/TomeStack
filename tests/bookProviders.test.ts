import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getOpenLibraryCoverUrl,
  normalizeBindingFormat,
  extractYear,
  unifiedSearchByAuthor,
} from "../src/lib/api/bookProviders";

test("getOpenLibraryCoverUrl generates valid cover URLs", () => {
  const url = getOpenLibraryCoverUrl("978-83-287-1616-2", "L");
  assert.equal(url, "https://covers.openlibrary.org/b/isbn/9788328716162-L.jpg?default=false");
});

test("normalizeBindingFormat handles various binding descriptions", () => {
  assert.equal(normalizeBindingFormat("hardcover"), "hardcover");
  assert.equal(normalizeBindingFormat("oprawa twarda"), "hardcover");
  assert.equal(normalizeBindingFormat("mi�kka ze skrzyde�kami"), "paperback");
  assert.equal(normalizeBindingFormat(undefined), "paperback");
});

test("extractYear extracts 4-digit years accurately", () => {
  assert.equal(extractYear("2021"), 2021);
  assert.equal(extractYear("May 14, 2019"), 2019);
  assert.equal(extractYear("1949-06-08"), 1949);
  assert.equal(extractYear(undefined), undefined);
});

test("unifiedSearchByAuthor returns curated canon for George Orwell instantly", async () => {
  const books = await unifiedSearchByAuthor("George Orwell", 10);
  assert.ok(books.length >= 4);

  const titles = books.map((b) => b.title.toLowerCase());
  assert.ok(titles.some((t) => t.includes("rok 1984")));
  assert.ok(titles.some((t) => t.includes("folwark")));
});
