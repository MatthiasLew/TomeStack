import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addBookToCatalog, matchesBookFormat } from '../src/lib/library/catalog';
import type { Series } from '../src/types';

const entry = { title: 'Solaris', author: 'Stanisław Lem', series: 'Powieści', formatType: 'hardcover' as const, isbn: '9788308069875', publisher: 'Wydawnictwo Literackie', publicationYear: 2020 };
test('repeat import selects the existing edition and does not manufacture prices', () => {
  const first = addBookToCatalog([], entry);
  const again = addBookToCatalog(first.seriesList, entry);
  assert.equal(first.bookId, again.bookId);
  assert.equal(first.editionId, again.editionId);
  assert.equal(again.seriesList[0].books[0].editions.length, 1);
  assert.deepEqual(again.seriesList[0].books[0].prices, []);
  assert.equal(again.seriesList[0].books[0].editions[0].publisher, entry.publisher);
});
test('same series label does not mix authors; same author does not merge unrelated series', () => {
  let list: Series[] = [];
  for (const data of [entry, { ...entry, author: 'Inny autor' }, { ...entry, series: 'Inny cykl' }]) list = addBookToCatalog(list, data).seriesList;
  assert.equal(list.length, 3);
});
test('adding an edition is immutable and preserves distinct ISBNs and volumes', () => {
  const first = addBookToCatalog([], entry);
  first.seriesList[0].books[0].volume = 7;
  const snapshot = JSON.stringify(first.seriesList);
  const next = addBookToCatalog(first.seriesList, { ...entry, isbn: '9788308070260', formatType: 'paperback' });
  assert.equal(JSON.stringify(first.seriesList), snapshot);
  assert.equal(next.seriesList[0].books[0].editions.length, 2);
  assert.equal(next.seriesList[0].books[0].volume, 7);
  assert.equal(matchesBookFormat(next.seriesList[0].books[0], 'paperback'), true);
  assert.equal(matchesBookFormat(next.seriesList[0].books[0], 'paperback', first.editionId), false);
});
test('missing metadata remains unknown instead of a fabricated ISBN/year/publisher', () => {
  const result = addBookToCatalog([], { ...entry, isbn: undefined, publisher: undefined, publicationYear: undefined });
  const edition = result.seriesList[0].books[0].editions[0];
  assert.equal(edition.isbn, ''); assert.equal(edition.year, 0); assert.equal(edition.publisher, '');
});
