"use client";

import React, { useState } from "react";
import { Language, BindingFormat, ReadingStatus } from "@/types";
import { BookCover } from "./BookCover";
import { Search, X, Loader2, Check, Plus, BookOpen, Library } from "lucide-react";

interface AuthorBookResult {
  title: string;
  author: string;
  publisher?: string;
  publicationYear?: number;
  isbn?: string;
  formatType: BindingFormat;
  coverUrl?: string;
  source: string;
}

interface AuthorSearchModalProps {
  lang: Language;
  initialQuery?: string;
  onClose: () => void;
  onAddBookToShelf: (book: {
    title: string;
    author: string;
    series: string;
    formatType: BindingFormat;
    isbn?: string;
    cover?: string;
    readingStatus?: ReadingStatus;
  }) => void;
}

const POPULAR_AUTHORS = [
  "George Orwell",
  "Andrzej Sapkowski",
  "Stanisław Lem",
  "Stephen King",
  "J.R.R. Tolkien",
  "Frank Herbert",
  "Brandon Sanderson",
  "Remigiusz Mróz",
  "J.K. Rowling",
];

export const AuthorSearchModal: React.FC<AuthorSearchModalProps> = ({
  lang,
  initialQuery = "",
  onClose,
  onAddBookToShelf,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [books, setBooks] = useState<AuthorBookResult[]>([]);
  const [searchedAuthor, setSearchedAuthor] = useState("");
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialQuery && initialQuery.trim()) {
      setQuery(initialQuery.trim());
      handleSearch(initialQuery.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleSearch = async (authorToSearch: string) => {
    const authorName = authorToSearch.trim();
    if (!authorName) return;

    setLoading(true);
    setError(null);
    setSearchedAuthor(authorName);

    try {
      const res = await fetch(`/api/books/search?author=${encodeURIComponent(authorName)}&limit=24`);
      if (!res.ok) {
        throw new Error(lang === "pl" ? "Błąd pobierania danych autora." : "Error fetching author data.");
      }
      const json = await res.json();
      setBooks(json.data || []);
      if ((json.data || []).length === 0) {
        setError(
          lang === "pl"
            ? `Nie znaleziono książek dla autora "${authorName}" w katalogu BN i Open Library.`
            : `No books found for author "${authorName}".`
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : (lang === "pl" ? "Nie udało się połączyć z API." : "API connection failed.")
      );
    } finally {
      setLoading(false);
    }
  };

  const detectSeriesName = (bookTitle: string, authorName: string): string => {
    const titleLower = bookTitle.toLowerCase();
    if (titleLower.includes("wiedźmin") || titleLower.includes("witcher")) {
      return "Saga o Wiedźminie";
    }
    if (titleLower.includes("harry potter")) {
      return "Harry Potter";
    }
    if (titleLower.includes("władca pierścieni") || titleLower.includes("lord of the rings") || titleLower.includes("hobbit")) {
      return "Śródziemie / Władca Pierścieni";
    }
    if (titleLower.includes("diuna") || titleLower.includes("dune")) {
      return "Kroniki Diuny";
    }
    if (titleLower.includes("chyłka") || titleLower.includes("forst")) {
      return "Seria z Joanną Chyłką / Forst";
    }
    if (bookTitle.includes(":") && bookTitle.split(":")[0].length < 30) {
      return bookTitle.split(":")[0].trim();
    }
    return `Dzieła i powieści (${authorName})`;
  };

  const handleAdd = (b: AuthorBookResult, status: ReadingStatus = "unread") => {
    const author = b.author || searchedAuthor;
    const seriesName = detectSeriesName(b.title, author);
    const key = `${b.title}-${b.isbn || "no-isbn"}`;
    onAddBookToShelf({
      title: b.title,
      author,
      series: seriesName,
      formatType: b.formatType,
      isbn: b.isbn,
      cover: b.coverUrl,
      readingStatus: status,
    });
    setAddedIds((prev) => new Set(prev).add(key));
  };

  const handleAddAll = () => {
    const nextSet = new Set(addedIds);
    books.forEach((b) => {
      const author = b.author || searchedAuthor;
      const seriesName = detectSeriesName(b.title, author);
      const key = `${b.title}-${b.isbn || "no-isbn"}`;
      nextSet.add(key);
      onAddBookToShelf({
        title: b.title,
        author,
        series: seriesName,
        formatType: b.formatType,
        isbn: b.isbn,
        cover: b.coverUrl,
        readingStatus: "unread",
      });
    });
    setAddedIds(nextSet);
    setTimeout(() => {
      onClose();
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800 flex items-start justify-between bg-gray-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-500/15 text-brand-400 border border-brand-500/30">
              <Library className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold font-serif text-white">
                {lang === "pl" ? "Wyszukaj i dodaj książki autora" : "Search & Import Author Books"}
              </h2>
              <p className="text-xs text-gray-400">
                {lang === "pl"
                  ? "API wczyta całą bibliografię autora z prawdziwymi okładkami z BN i Open Library"
                  : "API loads full author bibliography with real covers without barcodes"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search Bar & Suggestions */}
        <div className="p-5 sm:p-6 border-b border-gray-800/80 bg-gray-900/60 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch(query);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={
                  lang === "pl"
                    ? "Wpisz nazwisko autora (np. Andrzej Sapkowski, Remigiusz Mróz, Tolkien)..."
                    : "Enter author name (e.g. Stephen King, Brandon Sanderson)..."
                }
                className="w-full bg-gray-950 border border-gray-700 rounded-xl p-3 pl-10 text-sm text-white focus:outline-none focus:border-brand-500 transition shadow-inner"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-5 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-brand-900/30 shrink-0 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>{lang === "pl" ? "Pobierz książki" : "Fetch Books"}</span>
            </button>
          </form>

          {/* Quick Suggestions Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mr-1">
              {lang === "pl" ? "Szybki wybór:" : "Quick picks:"}
            </span>
            {POPULAR_AUTHORS.map((author) => (
              <button
                key={author}
                type="button"
                onClick={() => {
                  setQuery(author);
                  handleSearch(author);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/60 transition"
              >
                {author}
              </button>
            ))}
          </div>
        </div>

        {/* Results Container */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {loading && (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-brand-400 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-gray-300">
                {lang === "pl"
                  ? `Przeszukuję Bibliotekę Narodową, Open Library i Google Books dla "${searchedAuthor}"...`
                  : `Searching National Library & Google Books for "${searchedAuthor}"...`}
              </p>
            </div>
          )}

          {!loading && books.length > 0 && (
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {lang === "pl" ? `Znalezione tomy (${books.length}):` : `Found volumes (${books.length}):`}
                  </span>
                  <span className="text-xs text-brand-400 font-semibold hidden md:inline">
                    {lang === "pl" ? "Dodaj pojedynczo lub wszystkie naraz" : "Add individually or all at once"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddAll}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-500 hover:to-amber-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>{lang === "pl" ? `Dodaj wszystkie tomy (${books.length}) do biblioteki` : `Add all (${books.length}) to library`}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {books.map((b, idx) => {
                  const key = `${b.title}-${b.isbn || idx}`;
                  const isAdded = addedIds.has(key);

                  return (
                    <div
                      key={key}
                      className={`p-3 rounded-xl border flex gap-3 transition ${
                        isAdded
                          ? "bg-emerald-950/30 border-emerald-500/40"
                          : "bg-gray-950/50 border-gray-800 hover:border-gray-700"
                      }`}
                    >
                      <div className="w-16 h-24 shrink-0 overflow-hidden rounded-lg shadow-md border border-gray-800 bg-gray-900">
                        <BookCover
                          src={b.coverUrl}
                          isbn={b.isbn}
                          title={b.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <div>
                          <h4 className="text-xs font-bold text-white line-clamp-2" title={b.title}>
                            {b.title}
                          </h4>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">
                            {b.publisher ? `${b.publisher}` : b.author} {b.publicationYear ? `(${b.publicationYear})` : ""}
                          </p>
                          {b.isbn && (
                            <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                              ISBN: {b.isbn}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 pt-2">
                          {isAdded ? (
                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" />
                              <span>{lang === "pl" ? "Dodano!" : "Added!"}</span>
                            </span>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAdd(b, "unread")}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-brand-600 hover:bg-brand-500 text-white transition flex items-center gap-1 shadow cursor-pointer"
                                title={lang === "pl" ? "Dodaj do posiadanych" : "Add as owned"}
                              >
                                <Plus className="w-3 h-3" />
                                <span>{lang === "pl" ? "Posiadam" : "Own"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAdd(b, "reading")}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 transition flex items-center gap-1 cursor-pointer"
                                title={lang === "pl" ? "Dodaj i oznacz jako czytane" : "Add and mark as reading"}
                              >
                                <span>📖</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleAdd(b, "wishlist")}
                                className="px-2 py-1 rounded-lg text-[11px] font-bold bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white border border-purple-500/40 transition flex items-center gap-1 cursor-pointer"
                                title={lang === "pl" ? "Dodaj do listy życzeń" : "Add to wishlist"}
                              >
                                <span>⭐</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {!loading && books.length === 0 && !error && (
            <div className="py-16 text-center space-y-2 text-gray-500">
              <BookOpen className="w-12 h-12 text-gray-600 mx-auto stroke-1" />
              <p className="text-sm">
                {lang === "pl"
                  ? "Wpisz autora powyżej lub kliknij szybki wybór, aby pobrać książki i okładki z bazy."
                  : "Search for an author above to fetch bibliographies and covers."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
