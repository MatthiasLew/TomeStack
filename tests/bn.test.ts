import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanAuthor, cleanTitle, detectFormat } from "../src/lib/api/bn";

test("cleanAuthor converts MARC format to readable author name", () => {
  assert.equal(cleanAuthor("Sapkowski, Andrzej (1948- )"), "Andrzej Sapkowski");
  assert.equal(cleanAuthor("Orwell, George (1903-1950)"), "George Orwell");
  assert.equal(cleanAuthor("Lem, Stanisław (1921-2006)"), "Stanisław Lem");
  assert.equal(cleanAuthor("Stephen King"), "Stephen King");
  assert.equal(cleanAuthor(""), "");
});

test("cleanTitle extracts Polish title from MARC (pol.) convention", () => {
  const marc1 = "Nineteen eighty-four (pol.) Rok 1984 / Nineteen eighty four";
  assert.equal(cleanTitle(marc1), "Rok 1984");

  const marc2 = "Animal farm (pol.) Folwark zwierzęcy / Animal farm,";
  assert.equal(cleanTitle(marc2), "Folwark zwierzęcy");

  const simple = "Solaris / Stanisław Lem";
  assert.equal(cleanTitle(simple), "Solaris");
});

test("cleanTitle aggressively strips generic genre subtitles", () => {
  assert.equal(
    cleanTitle("Córka proboszcza : powieść / Clergyman's daughter"),
    "Córka proboszcza"
  );
  assert.equal(
    cleanTitle("Folwark zwierzęcy : bajka polityczna / Animal Farm"),
    "Folwark zwierzęcy"
  );
  assert.equal(
    cleanTitle("W hołdzie Katalonii : reportaż"),
    "W hołdzie Katalonii"
  );
});

test("detectFormat correctly identifies hardcover vs paperback", () => {
  assert.equal(detectFormat({ id: 1, title: "Wydanie oprawa twarda" }), "hardcover");
  assert.equal(detectFormat({ id: 2, title: "Opr. tw." }), "hardcover");
  assert.equal(detectFormat({ id: 3, title: "Zwykła książka kieszonkowa" }), "paperback");
});
