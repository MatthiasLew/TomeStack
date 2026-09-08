import type { Book, BookEdition, Series, BindingFormat, ReadingStatus } from '@/types';
import { canonicalizeBookTitle, cleanDisplayTitle } from '../api/bookProviders';

export interface AddBookData {
  title: string;
  author: string;
  series: string;
  formatType: BindingFormat;
  isbn?: string;
  cover?: string;
  publisher?: string;
  publicationYear?: number;
  readingStatus?: ReadingStatus;
}

// Resolve IDs before updating React state; bulk additions must never depend on
// side effects inside a state updater (which React may defer or run twice).
export function addBookToCatalog(list: Series[], data: AddBookData, id: () => string = () => crypto.randomUUID()) {
  const author = data.author.trim();
  const seriesName = data.series.trim() || `Twórczość: ${author}`;
  const title = cleanDisplayTitle(data.title);
  const series = list.find(s => s.author.trim().toLowerCase() === author.toLowerCase()
    && s.seriesName.trim().toLowerCase() === seriesName.toLowerCase());
  const book = series?.books.find(b => canonicalizeBookTitle(b.title) === canonicalizeBookTitle(title));
  const isbn = (data.isbn || '').replace(/[\s-]/g, '').toUpperCase();
  const existingEdition = book?.editions.find(e => isbn ? e.isbn.replace(/[\s-]/g, '').toUpperCase() === isbn
    : !e.isbn && e.formatType === data.formatType && e.publisher === (data.publisher || '')
      && e.year === (data.publicationYear || 0));
  const edition: BookEdition = existingEdition || {
    id: `ed-${id()}`, formatType: data.formatType, publisher: data.publisher || '',
    year: data.publicationYear || 0, format: data.formatType === 'hardcover' ? 'Oprawa twarda' : 'Oprawa miękka', isbn,
  };
  const updated: Book = book ? {
    ...book, cover: book.cover || data.cover,
    editions: existingEdition ? book.editions : [...book.editions, edition],
  } : {
    id: `book-${id()}`, title, volume: Math.max(0, ...(series?.books.map(b => b.volume) || [])) + 1,
    formatType: data.formatType, cover: data.cover, prices: [], editions: [edition],
  };
  const books = series ? (book ? series.books.map(b => b.id === book.id ? updated : b) : [...series.books, updated]) : [updated];
  return {
    seriesList: series ? list.map(s => s.seriesId === series.seriesId ? { ...s, books } : s)
      : [...list, { seriesId: `series-${id()}`, seriesName, author, books }],
    bookId: updated.id, editionId: edition.id,
  };
}

export function matchesBookFormat(book: Book, format: 'all' | BindingFormat, ownedEditionId?: string) {
  if (format === 'all') return true;
  const ownedEdition = book.editions.find(e => e.id === ownedEditionId);
  return ownedEdition ? ownedEdition.formatType === format
    : book.editions.length ? book.editions.some(e => e.formatType === format) : book.formatType === format;
}
