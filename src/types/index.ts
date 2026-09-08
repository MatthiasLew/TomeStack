export type BindingFormat = 'hardcover' | 'paperback';
export type FormatFilter = 'all' | 'hardcover' | 'paperback';
export type ReadingStatus = 'unread' | 'reading' | 'read' | 'wishlist';
export type StatusFilter = 'all' | 'owned' | 'missing' | 'reading' | 'read';
export type ActiveTab = 'series' | 'missing' | 'all';
export type Language = 'pl' | 'en';

export interface PriceOffer {
  store: string;
  formatType: BindingFormat;
  format: string;
  price: string;
  shipping: string;
  isBest?: boolean;
  url: string;
}

export interface BookEdition {
  id: string;
  formatType: BindingFormat;
  publisher: string;
  year: number;
  format: string;
  isbn: string;
  coverDesc?: string;
}

export interface Book {
  id: string;
  title: string;
  volume: number;
  formatType: BindingFormat;
  cover: string;
  prices: PriceOffer[];
  editions: BookEdition[];
}

export interface Series {
  seriesId: string;
  seriesName: string;
  author: string;
  books: Book[];
}

export interface AuthorSeriesRef {
  name: string;
  seriesId: string;
  bookIds: string[];
}

export interface Author {
  name: string;
  avatar: string;
  bio: string;
  series: AuthorSeriesRef[];
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar: string;
  ownedBooks: Record<string, string>; // bookId -> editionId
  readingStatus?: Record<string, ReadingStatus>; // bookId -> reading status
}