import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanAuthor, cleanTitle, fetchBnByIsbn } from '../src/lib/api/bn';
import { cleanDisplayTitle, unifiedSearchByAuthor, unifiedSearchByQuery } from '../src/lib/api/bookProviders';
import { isValidIsbn, parseSearchLimit } from '../src/lib/api/validation';
import { calculateSeriesBasket, parsePriceNumber } from '../src/lib/pricing/priceEngine';

test('title cleanup preserves meaningful subtitles and slash-containing titles', () => {
  for (const clean of [cleanTitle, cleanDisplayTitle]) {
    assert.equal(clean('Diuna: Ród Atrydów'), 'Diuna: Ród Atrydów');
    assert.equal(clean('11/22/63'), clean === cleanDisplayTitle ? "Dallas '63" : '11/22/63');
    assert.equal(clean('Saga: tom 2'), 'Saga: tom 2');
  }
  assert.equal(cleanAuthor('Tolkien, John Ronald Reuel (1892-1973)'), 'John Ronald Reuel Tolkien');
});
test('BN lookup preserves publisher and extracts year from a range', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ bibs: [{ id: 1, title: 'Test', publisher: 'Świat Książki', publicationYear: '2020-2021' }] })));
  const book = await fetchBnByIsbn('9788328716162');
  assert.equal(book?.publisher, 'Świat Książki'); assert.equal(book?.publicationYear, 2020);
});
test('author search keeps Polish titles without diacritics and English titles', async t => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => new Response(JSON.stringify(String(input).includes('data.bn') ? { bibs: [
    { id: 1, title: 'Solaris', author: 'Nieznany Autor' }, { id: 2, title: 'Eden', author: 'Nieznany Autor' }, { id: 3, title: 'A new story', author: 'Nieznany Autor' },
  ] } : {})));
  const books = await unifiedSearchByAuthor('Nieznany Autor', 20);
  assert.deepEqual(books.map(b => b.title), ['Solaris', 'Eden', 'A new story']);
});
test('generic search keeps identically titled works by different authors', async t => {
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => new Response(JSON.stringify(String(input).includes('data.bn') ? { bibs: [
    { id: 1, title: 'Dom', author: 'Autor Pierwszy' }, { id: 2, title: 'Dom', author: 'Autor Drugi' },
  ] } : {})));
  assert.equal((await unifiedSearchByQuery('Dom')).length, 2);
});
test('ISBN validates checksum and book prefix; limit rejects malformed or unbounded requests', () => {
  assert.ok(isValidIsbn('978-83-287-1616-2')); assert.ok(isValidIsbn('0-8044-2957-x'));
  for (const value of ['123', '1234567890123', '9788328716163', 'foo9788328716162']) assert.equal(isValidIsbn(value), false);
  for (const value of ['-1', '0', '41', 'NaN', '2foo', '1.5']) assert.equal(parseSearchLimit(value, 8), null);
  assert.equal(parseSearchLimit(null, 8), 8); assert.equal(parseSearchLimit('40', 8), 40);
});
const offer = (price: string, formatType: 'hardcover' | 'paperback' = 'hardcover') => ({ store: 'Empik', price, formatType, format: '', shipping: '0 zł', url: '' });
const book = { id: 'b1', title: 'Test', volume: 1, formatType: 'hardcover' as const, prices: [offer('20 zł'), offer('30 zł', 'paperback')] };
test('basket counts one book per store, parses shipping, and respects unavailable bindings', () => {
  const basket = calculateSeriesBasket([book]);
  assert.equal(basket.bestSingleStore?.availableBooksCount, 1);
  assert.equal(basket.bestSingleStore?.grandTotal, 20);
  const absent = calculateSeriesBasket([{ ...book, prices: [offer('30 zł', 'paperback')] }], 'hardcover');
  assert.equal(absent.breakdown[0].offers.length, 0);
  assert.equal(absent.pricedBooksCount, 0);
  assert.equal(absent.bestSingleStore, undefined);
  const invalid = calculateSeriesBasket([{ ...book, prices: [offer('brak'), offer('30 zł')] }]);
  assert.equal(invalid.cheapestCombinedPrice, 30);
});
test('prices support thousands separators and reject negative amounts', () => {
  assert.equal(parsePriceNumber('1.234,56 zł'), 1234.56);
  assert.equal(parsePriceNumber('1,234.56 PLN'), 1234.56);
  assert.equal(parsePriceNumber('-30 zł'), 0);
});
test('curated fallback does not present hardcoded ISBNs or covers as verified editions', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{}'));
  const books = await unifiedSearchByAuthor('George Orwell');
  assert.ok(books.length > 0);
  for (const book of books) {
    assert.equal(book.source, 'curated');
    assert.equal(book.isbn, undefined);
    assert.equal(book.coverUrl, undefined);
    assert.equal(book.publisher, undefined);
  }
});
test('shelfSync handles local and unconfigured environments gracefully', async () => {
  const { loadUserShelfFromCloud, saveUserBookToCloud, saveUserReadingStatusToCloud, flushSyncQueue } = await import('../src/lib/supabase/shelfSync');
  assert.equal(await loadUserShelfFromCloud('local-test'), null);
  assert.equal(await saveUserBookToCloud('local-test', 'book-1', 'ed-1'), false);
  assert.equal(await saveUserReadingStatusToCloud('local-test', 'book-1', 'reading'), false);
  assert.equal(await flushSyncQueue('local-test'), 0);
});
test('cleanAuthor strips translators, contributors and publishers from BN author records', () => {
  assert.equal(
    cleanAuthor('Orwell, George (1903-1950) Mirkowicz, Tomasz (1953-2003)'),
    'George Orwell'
  );
  assert.equal(
    cleanAuthor('Orwell, George (1903-1950) Zborski, Bartłomiej Oficyna Wydawnicza Graf'),
    'George Orwell'
  );
  assert.equal(
    cleanAuthor('Orwell, George (1903-1950) Sandauer, Artur (1913-1989) Mirkowicz, Tomasz (1953-2003) Państwowy Instytut Wydawniczy'),
    'George Orwell'
  );
});
test('sanitizeAuthor and series deduplication merge duplicate author sliders into one', async () => {
  const { sanitizeAuthor } = await import('../src/lib/library/catalog');
  assert.equal(sanitizeAuthor('George Mirkowicz, Tomasz Orwell'), 'George Orwell');
  assert.equal(sanitizeAuthor('George Zborski, Bartłomiej Oficyna Wydawnicza Graf Orwell'), 'George Orwell');
});

