"use client";

import React, { useState, useMemo } from "react";
import {
  Language,
  FormatFilter,
  StatusFilter,
  ActiveTab,
  Book,
  Series,
  UserAccount,
  BindingFormat,
  ReadingStatus,
} from "@/types";
import {
  authorsDatabase,
  initialSeriesDatabase,
} from "@/data/mockData";
import { FolderMinus, FolderPlus, Search, Library } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { UserBanner, GuestAlertBanner } from "@/components/UserBanner";
import { StatsCards } from "@/components/StatsCards";
import { FilterToolbar } from "@/components/FilterToolbar";
import { AuthorSection } from "@/components/AuthorSection";
import { MissingRadar } from "@/components/MissingRadar";
import { BookModal } from "@/components/BookModal";
import { AuthorModal } from "@/components/AuthorModal";
import { AddBookModal } from "@/components/AddBookModal";
import { AuthModal } from "@/components/AuthModal";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import { AuthorSearchModal } from "@/components/AuthorSearchModal";
import {
  loadUserShelfFromCloud,
  saveUserBookToCloud,
  removeUserBookFromCloud,
} from "@/lib/supabase/shelfSync";

export default function Home() {
  const [lang, setLang] = useState<Language>("pl");
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>([]);

  // Load user session from localStorage on startup
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem("tomestack_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        setCurrentUser(parsed);
      } else {
        // Automatically prompt sign-in on first visit so each user has their own private shelf
        setIsAuthOpen(true);
      }
    } catch {
      setIsAuthOpen(true);
    } finally {
      setIsAuthLoaded(true);
    }
  }, []);

  // Save session when user changes
  React.useEffect(() => {
    if (!isAuthLoaded) return;
    if (currentUser) {
      localStorage.setItem("tomestack_user", JSON.stringify(currentUser));
    } else {
      localStorage.removeItem("tomestack_user");
    }
  }, [currentUser, isAuthLoaded]);

  // Load user's saved books from localStorage on startup
  React.useEffect(() => {
    try {
      const storedSeries = localStorage.getItem("tomestack_user_shelf_v4");
      if (storedSeries) {
        const parsed = JSON.parse(storedSeries);
        if (Array.isArray(parsed)) {
          setSeriesList(parsed);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save user's shelf whenever books/authors are added or removed
  React.useEffect(() => {
    try {
      localStorage.setItem("tomestack_user_shelf_v4", JSON.stringify(seriesList));
    } catch {
      // ignore
    }
  }, [seriesList]);

  // Handler to load demo library on user request
  const handleLoadDemoData = () => {
    setSeriesList(initialSeriesDatabase);
  };

  // Handler to clear library back to empty state
  const handleClearLibrary = () => {
    setSeriesList([]);
    localStorage.removeItem("tomestack_user_shelf_v4");
  };

  // Filters & Tabs
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTab, setActiveTab] = useState<ActiveTab>("series");
  const [searchQuery, setSearchQuery] = useState("");
  const [quickAuthorInput, setQuickAuthorInput] = useState("");
  const [loadingAuthorBio, setLoadingAuthorBio] = useState<string | null>(null);

  // Modals state
  const [activeBookModal, setActiveBookModal] = useState<{
    book: Book;
    series: Series;
  } | null>(null);
  const [activeAuthorName, setActiveAuthorName] = useState<string | null>(null);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isAuthorSearchOpen, setIsAuthorSearchOpen] = useState(false);
  const [authorSearchInitialQuery, setAuthorSearchInitialQuery] = useState("");
  const [showHidden, setShowHidden] = useState(false);

  // Collapsed series state for large collections
  const [collapsedSeriesIds, setCollapsedSeriesIds] = useState<Set<string>>(new Set());

  const handleToggleSeriesCollapse = (seriesId: string) => {
    setCollapsedSeriesIds((prev) => {
      const next = new Set(prev);
      if (next.has(seriesId)) {
        next.delete(seriesId);
      } else {
        next.add(seriesId);
      }
      return next;
    });
  };

  const handleCollapseAll = (seriesListToCollapse: Series[]) => {
    setCollapsedSeriesIds(new Set(seriesListToCollapse.map((s) => s.seriesId)));
  };

  const handleExpandAll = () => {
    setCollapsedSeriesIds(new Set());
  };

  // Calculation of overall statistics
  const stats = useMemo(() => {
    let total = 0;
    let owned = 0;
    let seriesCompletionSum = 0;

    seriesList.forEach((s) => {
      const sTotal = s.books.length;
      let sOwned = 0;

      s.books.forEach((b) => {
        total++;
        if (currentUser?.ownedBooks && currentUser.ownedBooks[b.id]) {
          owned++;
          sOwned++;
        }
      });

      const sPercent = sTotal > 0 ? (sOwned / sTotal) * 100 : 0;
      seriesCompletionSum += sPercent;
    });

    const avgCompletion =
      seriesList.length > 0 ? Math.round(seriesCompletionSum / seriesList.length) : 0;

    const readingBooks = Object.values(currentUser?.readingStatus || {}).filter(
      (s) => s === "reading"
    ).length;
    const readBooks = Object.values(currentUser?.readingStatus || {}).filter(
      (s) => s === "read"
    ).length;

    return {
      total,
      owned,
      missing: total - owned,
      avgCompletion,
      readingBooks,
      readBooks,
    };
  }, [seriesList, currentUser]);

  // Handlers
  const handleToggleLang = () => {
    setLang((prev) => (prev === "pl" ? "en" : "pl"));
  };

  // Effect to load cloud shelf if Supabase is connected
  const currentUserId = currentUser?.id;
  React.useEffect(() => {
    if (!currentUserId) return;
    loadUserShelfFromCloud(currentUserId).then((cloudShelf) => {
      if (cloudShelf && Object.keys(cloudShelf).length > 0) {
        setCurrentUser((prev) =>
          prev ? { ...prev, ownedBooks: { ...(prev.ownedBooks || {}), ...cloudShelf } } : null
        );
      }
    });
  }, [currentUserId]);

  const handleToggleOwned = (bookId: string, defaultEditionId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const currentOwned = { ...(currentUser.ownedBooks || {}) };
    if (currentOwned[bookId]) {
      delete currentOwned[bookId];
      removeUserBookFromCloud(currentUser.id, bookId);
    } else {
      currentOwned[bookId] = defaultEditionId;
      saveUserBookToCloud(currentUser.id, bookId, defaultEditionId);
    }

    const updatedUser = { ...currentUser, ownedBooks: currentOwned };
    setCurrentUser(updatedUser);
  };

  const handleSelectEdition = (bookId: string, editionId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const currentOwned = { ...(currentUser.ownedBooks || {}) };
    currentOwned[bookId] = editionId;
    saveUserBookToCloud(currentUser.id, bookId, editionId);

    const updatedUser = { ...currentUser, ownedBooks: currentOwned };
    setCurrentUser(updatedUser);
  };

  const handleUpdateReadingStatus = (bookId: string, status: ReadingStatus) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const currentReading = { ...(currentUser.readingStatus || {}) };
    if (status === "unread") {
      delete currentReading[bookId];
    } else {
      currentReading[bookId] = status;
    }

    const updatedUser = { ...currentUser, readingStatus: currentReading };
    setCurrentUser(updatedUser);
  };

  const handleToggleHideBook = (bookId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const currentHidden = { ...(currentUser.hiddenBooks || {}) };
    if (currentHidden[bookId]) {
      delete currentHidden[bookId];
    } else {
      currentHidden[bookId] = true;
    }

    const updatedUser = { ...currentUser, hiddenBooks: currentHidden };
    setCurrentUser(updatedUser);
  };

  const handleToggleHideSeries = (seriesId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const currentHiddenSeries = { ...(currentUser.hiddenSeries || {}) };
    if (currentHiddenSeries[seriesId]) {
      delete currentHiddenSeries[seriesId];
    } else {
      currentHiddenSeries[seriesId] = true;
    }

    const updatedUser = { ...currentUser, hiddenSeries: currentHiddenSeries };
    setCurrentUser(updatedUser);
  };

  const hiddenCount = useMemo(() => {
    const hiddenBooksCount = Object.keys(currentUser?.hiddenBooks || {}).length;
    const hiddenSeriesCount = Object.keys(currentUser?.hiddenSeries || {}).length;
    return hiddenBooksCount + hiddenSeriesCount;
  }, [currentUser]);

  const handleAddBook = (data: {
    title: string;
    author: string;
    series: string;
    formatType: BindingFormat;
    isbn?: string;
    cover?: string;
    readingStatus?: ReadingStatus;
  }) => {
    const newBookId = `book-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newEditionId = `ed-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const newBook: Book = {
      id: newBookId,
      title: data.title,
      volume: 1,
      formatType: data.formatType,
      cover: data.cover || (data.isbn ? `https://covers.openlibrary.org/b/isbn/${data.isbn}-L.jpg?default=false` : undefined),
      prices: [
        {
          store: "Księgarnia",
          formatType: data.formatType,
          format: data.formatType === "hardcover" ? "Twarda oprawa" : "Miękka oprawa",
          price: "39,90 zł",
          shipping: "Dostępne",
          isBest: true,
          url: "https://www.swiatksiazki.pl",
        },
      ],
      editions: [
        {
          id: newEditionId,
          formatType: data.formatType,
          publisher: data.series || "Wydawnictwo",
          year: new Date().getFullYear(),
          format: data.formatType === "hardcover" ? "Oprawa twarda" : "Oprawa miękka",
          isbn: data.isbn || "9780000000000",
        },
      ],
    };

    setSeriesList((prev) => {
      const targetSeriesName = data.series || `Twórczość: ${data.author}`;
      const existing = prev.find((s) => s.seriesName.toLowerCase() === targetSeriesName.toLowerCase());
      if (existing) {
        return prev.map((s) =>
          s.seriesId === existing.seriesId
            ? { ...s, books: [...s.books, { ...newBook, volume: s.books.length + 1 }] }
            : s
        );
      } else {
        const newSeriesId = `series-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        return [
          ...prev,
          {
            seriesId: newSeriesId,
            seriesName: targetSeriesName,
            author: data.author,
            books: [newBook],
          },
        ];
      }
    });

    // Auto mark as owned / reading status if user is active
    if (currentUser) {
      handleToggleOwned(newBookId, newEditionId);
      if (data.readingStatus) {
        handleUpdateReadingStatus(newBookId, data.readingStatus);
      }
    }
  };

  const handleImportAuthorBibliography = async (authorName: string) => {
    setLoadingAuthorBio(authorName);
    try {
      const res = await fetch(`/api/books/search?author=${encodeURIComponent(authorName)}&limit=30`);
      if (!res.ok) return;
      const json = await res.json();
      const booksToAdd = json.data || [];

      if (booksToAdd.length === 0) return;

      setSeriesList((prev) => {
        const authorLower = authorName.toLowerCase().trim();
        const existingSeries = prev.find(
          (s) => s.author.toLowerCase().trim() === authorLower
        );

        const targetSeriesName = existingSeries?.seriesName || `Dzieła i powieści (${authorName})`;
        const targetSeriesId =
          existingSeries?.seriesId ||
          `series-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

        const existingBooks = existingSeries?.books || [];
        const existingTitles = new Set(existingBooks.map((b) => b.title.toLowerCase().trim()));

        const newBooksFormatted: Book[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        booksToAdd.forEach((b: any) => {
          const normTitle = (b.title || "").toLowerCase().trim();
          if (!normTitle || existingTitles.has(normTitle)) return;
          existingTitles.add(normTitle);

          const newBookId = `book-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const newEditionId = `ed-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

          newBooksFormatted.push({
            id: newBookId,
            title: b.title,
            volume: existingBooks.length + newBooksFormatted.length + 1,
            formatType: b.formatType || "paperback",
            cover: b.coverUrl,
            prices: [
              {
                store: "Księgarnia",
                formatType: b.formatType || "paperback",
                format: b.formatType === "hardcover" ? "Twarda oprawa" : "Miękka oprawa",
                price: "29,90 zł",
                shipping: "Dostępne",
                isBest: true,
                url: "https://www.swiatksiazki.pl",
              },
            ],
            editions: [
              {
                id: newEditionId,
                formatType: b.formatType || "paperback",
                publisher: b.publisher || "Wydawnictwo",
                year: b.publicationYear || new Date().getFullYear(),
                format: b.formatType === "hardcover" ? "Oprawa twarda" : "Oprawa miękka",
                isbn: b.isbn || "9780000000000",
              },
            ],
          });
        });

        if (newBooksFormatted.length === 0) return prev;

        if (existingSeries) {
          return prev.map((s) =>
            s.seriesId === existingSeries.seriesId
              ? { ...s, books: [...s.books, ...newBooksFormatted] }
              : s
          );
        } else {
          return [
            ...prev,
            {
              seriesId: targetSeriesId,
              seriesName: targetSeriesName,
              author: authorName,
              books: newBooksFormatted,
            },
          ];
        }
      });
    } catch (err) {
      console.error("Error importing author bibliography:", err);
    } finally {
      setLoadingAuthorBio(null);
    }
  };

  // Filter series based on search query and hidden status
  const filteredSeries = useMemo(() => {
    let list = seriesList;

    if (!showHidden) {
      list = list.filter((s) => !currentUser?.hiddenSeries?.[s.seriesId]);
    } else {
      list = list.filter((s) => {
        const isSeriesHidden = Boolean(currentUser?.hiddenSeries?.[s.seriesId]);
        const hasHiddenBook = s.books.some((b) => currentUser?.hiddenBooks?.[b.id]);
        return isSeriesHidden || hasHiddenBook;
      });
    }

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();

    return list
      .map((s) => {
        const matchSeries = s.seriesName.toLowerCase().includes(q);
        const matchAuthor = s.author.toLowerCase().includes(q);
        const matchingBooks = s.books.filter(
          (b) =>
            b.title.toLowerCase().includes(q) ||
            b.editions.some((e) => e.isbn.includes(q))
        );

        if (matchSeries || matchAuthor) {
          return s;
        }
        if (matchingBooks.length > 0) {
          return { ...s, books: matchingBooks };
        }
        return null;
      })
      .filter(Boolean) as Series[];
  }, [seriesList, searchQuery, showHidden, currentUser]);

  // Group filtered series by Author: Autor -> Seria -> Książki
  const authorGroups = useMemo(() => {
    const map = new Map<string, Series[]>();
    for (const s of filteredSeries) {
      const author = s.author || "Inni autorzy";
      if (!map.has(author)) {
        map.set(author, []);
      }
      map.get(author)!.push(s);
    }

    return Array.from(map.entries()).map(([authorName, seriesListForAuthor]) => ({
      authorName,
      series: seriesListForAuthor,
    }));
  }, [filteredSeries]);

  return (
    <div className="min-h-screen flex flex-col antialiased selection:bg-brand-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        lang={lang}
        onToggleLang={handleToggleLang}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={() => setCurrentUser(null)}
        onOpenAddBook={() => setIsAddBookOpen(true)}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenAuthorSearch={() => setIsAuthorSearchOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* User Banner */}
      <UserBanner
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        lang={lang}
      />

      {/* Guest alert */}
      {!currentUser && (
        <GuestAlertBanner onOpenAuth={() => setIsAuthOpen(true)} lang={lang} />
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <StatsCards
          totalBooks={stats.total}
          ownedBooks={stats.owned}
          missingBooks={stats.missing}
          avgCompletion={stats.avgCompletion}
          readingBooks={stats.readingBooks}
          readBooks={stats.readBooks}
          lang={lang}
        />

        {/* Filters and Tabs */}
        <FilterToolbar
          formatFilter={formatFilter}
          onSetFormatFilter={setFormatFilter}
          statusFilter={statusFilter}
          onSetStatusFilter={setStatusFilter}
          activeTab={activeTab}
          onSetActiveTab={setActiveTab}
          lang={lang}
          showHidden={showHidden}
          onToggleShowHidden={() => setShowHidden((prev) => !prev)}
          hiddenCount={hiddenCount}
        />

        {/* Content based on Active Tab */}
        {activeTab === "series" && (
          <div className="space-y-6">
            {/* Live Search Callout if searching */}
            {searchQuery.trim() && (
              <div className="card-glass rounded-2xl p-4 sm:p-5 border border-brand-500/30 bg-gradient-to-r from-brand-950/40 via-gray-900/80 to-gray-900 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/40">
                    <Search className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">
                      {lang === "pl" ? `Szukasz "${searchQuery}" w katalogu online?` : `Looking for "${searchQuery}" in online catalog?`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {lang === "pl"
                        ? "Wczytaj pełną bibliografię i okładki prosto z Biblioteki Narodowej & Open Library"
                        : "Fetch all books and covers directly from National Library & Open Library"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setAuthorSearchInitialQuery(searchQuery.trim());
                    setIsAuthorSearchOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-brand-900/40 cursor-pointer shrink-0"
                >
                  <Library className="w-4 h-4" />
                  <span>{lang === "pl" ? "Przeszukaj bazę online" : "Search online catalog"}</span>
                </button>
              </div>
            )}

            {seriesList.length === 0 ? (
              <div className="card-glass rounded-3xl p-8 sm:p-12 text-center border border-brand-500/30 bg-gradient-to-b from-gray-900/90 via-gray-950/90 to-brand-950/20 shadow-2xl space-y-6 max-w-3xl mx-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-2xl bg-brand-500/10 border border-brand-500/30 flex items-center justify-center text-brand-400 shadow-inner">
                  <Library className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-2xl sm:text-3xl font-bold font-serif text-white">
                    {lang === "pl" ? "Twoja biblioteka jest jeszcze pusta" : "Your Library is Empty"}
                  </h3>
                  <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
                    {lang === "pl"
                      ? "Wpisz poniżej nazwisko dowolnego autora na świecie (np. George Orwell, Stanisław Lem, Stephen King), aby wczytać jego tomy z Biblioteki Narodowej i dodać do swojej półki jednym kliknięciem!"
                      : "Type any author below (e.g. George Orwell, Stanisław Lem, Stephen King) to fetch works from the National Library and add them to your shelf with 1 click!"}
                  </p>
                </div>

                {/* Direct quick-search input */}
                <div className="max-w-md mx-auto flex gap-2">
                  <input
                    type="text"
                    value={quickAuthorInput}
                    onChange={(e) => setQuickAuthorInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && quickAuthorInput.trim()) {
                        setAuthorSearchInitialQuery(quickAuthorInput.trim());
                        setIsAuthorSearchOpen(true);
                      }
                    }}
                    placeholder={lang === "pl" ? "Wpisz autora (np. George Orwell)..." : "Enter author name..."}
                    className="flex-1 px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-brand-500 transition"
                  />
                  <button
                    onClick={() => {
                      if (quickAuthorInput.trim()) {
                        handleImportAuthorBibliography(quickAuthorInput.trim());
                      }
                    }}
                    disabled={loadingAuthorBio === quickAuthorInput.trim()}
                    className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-brand-600 hover:from-amber-500 hover:to-brand-500 text-white text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-lg shadow-brand-900/40 cursor-pointer shrink-0"
                    title={lang === "pl" ? "Wczytaj całą bibliografię autora" : "Import all books"}
                  >
                    <span>⚡</span>
                    <span>{lang === "pl" ? "Dodaj całą twórczość" : "Import all"}</span>
                  </button>
                  <button
                    onClick={() => {
                      if (quickAuthorInput.trim()) {
                        setAuthorSearchInitialQuery(quickAuthorInput.trim());
                        setIsAuthorSearchOpen(true);
                      }
                    }}
                    className="px-3.5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0 border border-gray-700"
                    title={lang === "pl" ? "Przeglądaj książki pojedynczo" : "Browse books"}
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{lang === "pl" ? "Przeglądaj" : "Browse"}</span>
                  </button>
                </div>

                {/* Popular author chips */}
                <div className="pt-2">
                  <p className="text-xs text-gray-400 font-semibold mb-2.5">
                    {lang === "pl"
                      ? "⚡ Kliknij autora, aby od razu załadować wszystkie jego książki do śledzenia:"
                      : "⚡ Click an author to instantly track all their books:"}
                  </p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {[
                      "George Orwell",
                      "Stanisław Lem",
                      "Stephen King",
                      "J.R.R. Tolkien",
                      "Andrzej Sapkowski",
                      "Remigiusz Mróz",
                    ].map((author) => (
                      <button
                        key={author}
                        onClick={() => handleImportAuthorBibliography(author)}
                        disabled={loadingAuthorBio === author}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-800/90 hover:bg-brand-600 text-gray-200 hover:text-white border border-gray-700 hover:border-brand-500 transition cursor-pointer flex items-center gap-1.5 shadow"
                        title={lang === "pl" ? `Wczytaj całą bibliografię ${author}` : `Load all books by ${author}`}
                      >
                        <span>✍️</span>
                        <span>{author}</span>
                        <span className="text-[10px] text-brand-300 font-extrabold ml-1">
                          {loadingAuthorBio === author ? "..." : "+ Wszystkie tomy"}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-800/80 flex items-center justify-center gap-4 text-xs text-gray-500">
                  <span>{lang === "pl" ? "Chcesz zobaczyć przykładowe dane?" : "Want to see sample data?"}</span>
                  <button
                    onClick={handleLoadDemoData}
                    className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4 cursor-pointer"
                  >
                    {lang === "pl" ? "Załaduj kolekcję demonstracyjną" : "Load demo collection"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-300">
                      {lang === "pl" ? "Twoja biblioteka (Autor ➔ Cykl ➔ Książki)" : "Your Library (Author ➔ Series ➔ Books)"}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700">
                      {authorGroups.length} {lang === "pl" ? "autorów" : "authors"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCollapseAll(filteredSeries)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/60 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title={lang === "pl" ? "Zwiń wszystkie cykle" : "Collapse all series"}
                    >
                      <FolderMinus className="w-3.5 h-3.5 text-brand-400" />
                      <span>{lang === "pl" ? "Zwiń wszystkie" : "Collapse all"}</span>
                    </button>
                    <button
                      onClick={handleExpandAll}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/60 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                      title={lang === "pl" ? "Rozwiń wszystkie cykle" : "Expand all series"}
                    >
                      <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{lang === "pl" ? "Rozwiń wszystkie" : "Expand all"}</span>
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            lang === "pl"
                              ? "Czy na pewno chcesz wyczyścić całą swoją biblioteczkę do zera?"
                              : "Are you sure you want to clear your entire library?"
                          )
                        ) {
                          handleClearLibrary();
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800/80 hover:bg-rose-950/60 text-gray-400 hover:text-rose-300 border border-gray-700/60 hover:border-rose-800/60 transition flex items-center gap-1.5 shadow-sm cursor-pointer ml-1"
                      title={lang === "pl" ? "Wyczyść bibliotekę do zera" : "Clear library to empty"}
                    >
                      <span>🗑️</span>
                      <span>{lang === "pl" ? "Wyczyść półkę" : "Clear shelf"}</span>
                    </button>
                  </div>
                </div>

                {authorGroups.length === 0 ? (
                  <div className="card-glass rounded-2xl p-12 text-center text-gray-400 space-y-4">
                    <p className="text-base font-semibold text-gray-300">
                      {lang === "pl" ? `Brak pozycji pasujących do "${searchQuery}".` : `No items matching "${searchQuery}".`}
                    </p>
                    <p className="text-xs text-gray-500 max-w-md mx-auto">
                      {lang === "pl"
                        ? "Możesz pobrać całą bibliografię tego autora bezpośrednio z bazy online i dodać ją do swojej półki."
                        : "You can load this author's works from the online catalog and import them to your shelf."}
                    </p>
                    <button
                      onClick={() => {
                        setAuthorSearchInitialQuery(searchQuery.trim());
                        setIsAuthorSearchOpen(true);
                      }}
                      className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition inline-flex items-center gap-2 shadow-lg cursor-pointer"
                    >
                      <Library className="w-4 h-4" />
                      <span>{lang === "pl" ? `Pobierz dzieła "${searchQuery}" z API` : `Fetch "${searchQuery}" from API`}</span>
                    </button>
                  </div>
                ) : (
                  authorGroups.map((group) => (
                    <AuthorSection
                      key={group.authorName}
                      authorName={group.authorName}
                      seriesList={group.series}
                      currentUser={currentUser}
                      formatFilter={formatFilter}
                      statusFilter={statusFilter}
                      lang={lang}
                      showHidden={showHidden}
                      collapsedSeriesIds={collapsedSeriesIds}
                      onToggleSeriesCollapse={handleToggleSeriesCollapse}
                      onOpenBookModal={(book, s) =>
                        setActiveBookModal({ book, series: s })
                      }
                      onOpenAuthorModal={(author) => setActiveAuthorName(author)}
                      onOpenAuthorSearch={(author) => {
                        setAuthorSearchInitialQuery(author);
                        setIsAuthorSearchOpen(true);
                      }}
                      onLoadFullBibliography={handleImportAuthorBibliography}
                      isLoadingBio={loadingAuthorBio === group.authorName}
                      onToggleOwned={handleToggleOwned}
                      onUpdateReadingStatus={handleUpdateReadingStatus}
                      onToggleHideBook={handleToggleHideBook}
                      onToggleHideSeries={handleToggleHideSeries}
                    />
                  ))
                )}
              </>
            )}
          </div>
        )}

        {activeTab === "missing" && (
          <MissingRadar
            seriesList={seriesList}
            currentUser={currentUser}
            formatFilter={formatFilter}
            lang={lang}
            onOpenBookModal={(book, s) =>
              setActiveBookModal({ book, series: s })
            }
            onToggleOwned={handleToggleOwned}
            onToggleHideBook={handleToggleHideBook}
          />
        )}

        {activeTab === "all" && (
          <div className="space-y-6">
            {seriesList.length === 0 ? (
              <div className="card-glass rounded-2xl p-12 text-center text-gray-400 space-y-4">
                <span className="text-4xl">📚</span>
                <h3 className="text-lg font-bold text-white">
                  {lang === "pl" ? "Twoja biblioteczka jest pusta" : "Your library is empty"}
                </h3>
                <p className="text-xs text-gray-400 max-w-md mx-auto">
                  {lang === "pl"
                    ? "Wyszukaj i dodaj książki swoich ulubionych pisarzy, aby wyświetlać je na liście."
                    : "Search and add books from your favorite authors to view them here."}
                </p>
                <button
                  onClick={() => setIsAuthorSearchOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition inline-flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <Library className="w-4 h-4" />
                  <span>{lang === "pl" ? "Wyszukaj autora i dodaj książki" : "Search author and import books"}</span>
                </button>
              </div>
            ) : (
              <>
                {authorGroups.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-300">
                        {lang === "pl" ? "Wszystkie tomy (Autor ➔ Cykl ➔ Książki)" : "All Volumes (Author ➔ Series ➔ Books)"}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-800 text-gray-300 border border-gray-700">
                        {authorGroups.length} {lang === "pl" ? "autorów" : "authors"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCollapseAll(filteredSeries)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/60 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        title={lang === "pl" ? "Zwiń wszystkie cykle" : "Collapse all series"}
                      >
                        <FolderMinus className="w-3.5 h-3.5 text-brand-400" />
                        <span>{lang === "pl" ? "Zwiń wszystkie" : "Collapse all"}</span>
                      </button>
                      <button
                        onClick={handleExpandAll}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/60 transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                        title={lang === "pl" ? "Rozwiń wszystkie cykle" : "Expand all series"}
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{lang === "pl" ? "Rozwiń wszystkie" : "Expand all"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {authorGroups.map((group) => (
                  <AuthorSection
                    key={group.authorName}
                    authorName={group.authorName}
                    seriesList={group.series}
                    currentUser={currentUser}
                    formatFilter="all"
                    statusFilter="all"
                    lang={lang}
                    showHidden={showHidden}
                    collapsedSeriesIds={collapsedSeriesIds}
                    onToggleSeriesCollapse={handleToggleSeriesCollapse}
                    onOpenBookModal={(book, s) =>
                      setActiveBookModal({ book, series: s })
                    }
                    onOpenAuthorModal={(author) => setActiveAuthorName(author)}
                    onOpenAuthorSearch={(author) => {
                      setAuthorSearchInitialQuery(author);
                      setIsAuthorSearchOpen(true);
                    }}
                    onLoadFullBibliography={handleImportAuthorBibliography}
                    isLoadingBio={loadingAuthorBio === group.authorName}
                    onToggleOwned={handleToggleOwned}
                    onUpdateReadingStatus={handleUpdateReadingStatus}
                    onToggleHideBook={handleToggleHideBook}
                    onToggleHideSeries={handleToggleHideSeries}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {/* Book Details & Editions Modal */}
      {activeBookModal && (
        <BookModal
          book={activeBookModal.book}
          series={activeBookModal.series}
          currentUser={currentUser}
          lang={lang}
          onClose={() => setActiveBookModal(null)}
          onSelectEdition={handleSelectEdition}
          onToggleOwned={handleToggleOwned}
          onOpenAuthor={(author) => setActiveAuthorName(author)}
          onUpdateReadingStatus={handleUpdateReadingStatus}
          onToggleHideBook={handleToggleHideBook}
        />
      )}

      {/* Author Bibliography Modal */}
      {activeAuthorName && authorsDatabase[activeAuthorName] && (
        <AuthorModal
          author={authorsDatabase[activeAuthorName]}
          seriesList={seriesList}
          currentUser={currentUser}
          lang={lang}
          onClose={() => setActiveAuthorName(null)}
          onOpenBook={(book, s) => setActiveBookModal({ book, series: s })}
        />
      )}

      {/* Add Book Modal */}
      {isAddBookOpen && (
        <AddBookModal
          lang={lang}
          onClose={() => setIsAddBookOpen(false)}
          onAddBook={handleAddBook}
        />
      )}

      {/* Live Author Search & Import Modal */}
      {isAuthorSearchOpen && (
        <AuthorSearchModal
          lang={lang}
          initialQuery={authorSearchInitialQuery || searchQuery}
          onClose={() => {
            setIsAuthorSearchOpen(false);
            setAuthorSearchInitialQuery("");
          }}
          onAddBookToShelf={handleAddBook}
        />
      )}

      {/* User Auth Modal */}
      {isAuthOpen && (
        <AuthModal
          lang={lang}
          onClose={() => setIsAuthOpen(false)}
          onLogin={(name, email) => {
            const id = `user-${email.replace(/[^a-zA-Z0-9]/g, "_")}`;
            const user: UserAccount = {
              id,
              name,
              email,
              role: lang === "pl" ? "Kolekcjoner" : "Collector",
              avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
              ownedBooks: {},
            };
            setCurrentUser(user);
            setIsAuthOpen(false);
          }}
          isForcedModal={!currentUser}
        />
      )}

      {/* Direct Global Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          lang={lang}
          onClose={() => setIsScannerOpen(false)}
          onDetected={(scannedIsbn) => {
            setIsScannerOpen(false);
            // Open AddBookModal with pre-queried or pre-filled ISBN
            setIsAddBookOpen(true);
            setTimeout(() => {
              // Also trigger lookup endpoint to automatically inject new volume
              fetch(`/api/books/lookup?isbn=${encodeURIComponent(scannedIsbn)}`)
                .then((r) => r.json())
                .then((json) => {
                  if (json && json.data) {
                    const b = json.data;
                    handleAddBook({
                      title: b.title || `ISBN ${scannedIsbn}`,
                      author: b.author || "Nieznany autor",
                      series: lang === "pl" ? "Zeskanowane książki" : "Scanned books",
                      formatType: b.formatType || "hardcover",
                      isbn: scannedIsbn,
                    });
                    setIsAddBookOpen(false);
                  }
                })
                .catch(() => {
                  // Fallback: AddBookModal stays open for manual completion
                });
            }, 200);
          }}
        />
      )}
    </div>
  );
}