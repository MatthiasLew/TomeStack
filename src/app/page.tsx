"use client";

import React, { useState, useMemo } from "react";
import {
  Language,
  FormatFilter,
  StatusFilter,
  ActiveTab,
  Book,
  Series,
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
import { EmptyLibraryHero } from "@/components/EmptyLibraryHero";
import {
  canonicalizeBookTitle,
  cleanDisplayTitle,
  UnifiedBookMetadata,
} from "@/lib/api/bookProviders";
import {
  loadUserShelfFromCloud,
  saveUserBookToCloud,
  removeUserBookFromCloud,
} from "@/lib/supabase/shelfSync";

import { useAccount, shelfKey } from "@/hooks/useAccount";
import { addBookToCatalog, AddBookData } from "@/lib/library/catalog";
import { supabase } from "@/lib/supabase/client";

// Preserve book and edition IDs referenced by saved user state.
function consolidateSeriesList(list: Series[]): Series[] {
  return list.map(series => ({ ...series, books: series.books.map(book => ({ ...book, title: cleanDisplayTitle(book.title) })) }));
}

export default function Home() {
  const account = useAccount();
  if (!account.loaded) return <main className="p-8" role="status">Ładowanie… / Loading…</main>;
  return <LibraryHome key={account.currentUser?.id || 'guest'} {...account} />;
}

function LibraryHome({ currentUser, setCurrentUser, logout, error }: ReturnType<typeof useAccount>) {
  const [lang, setLang] = useState<Language>("pl");
  const [seriesList, setSeriesState] = useState<Series[]>([]);
  const seriesRef = React.useRef<Series[]>([]);
  const [shelfLoaded, setShelfLoaded] = useState(false);
  const [storageError, setStorageError] = useState('');
  const mutationVersion = React.useRef(0);
  const mounted = React.useRef(true);
  React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const setSeriesList = (update: React.SetStateAction<Series[]>) => {
    const next = typeof update === 'function' ? update(seriesRef.current) : update;
    seriesRef.current = next;
    setSeriesState(next);
  };
  const storageKey = shelfKey(currentUser?.id);
  React.useEffect(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (!Array.isArray(parsed) || !parsed.every(s => typeof s.seriesId === 'string' && typeof s.author === 'string' && typeof s.seriesName === 'string' && Array.isArray(s.books) && s.books.every((b: Book) => typeof b.title === 'string' && Array.isArray(b.editions) && Array.isArray(b.prices)))) throw new Error('Invalid shelf');
      const list = consolidateSeriesList(parsed);
      seriesRef.current = list;
      setSeriesState(list);
      setShelfLoaded(true);
    } catch { setStorageError('Nie można odczytać półki. Zachowano oryginalny zapis. / Could not read shelf; original data preserved.'); }
  }, [storageKey]);
  React.useEffect(() => {
    if (!shelfLoaded) return;
    try { localStorage.setItem(storageKey, JSON.stringify(seriesList)); }
    catch { setStorageError('Nie udało się zapisać półki. / Could not save shelf.'); }
  }, [seriesList, shelfLoaded, storageKey]);
  React.useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const reportSync = (ok: boolean) => {
    if (!ok && supabase && mounted.current) setStorageError('Zmiana jest lokalna: zapis w chmurze nie powiódł się. / Change is local: cloud save failed.');
  };

  // Handler to load demo library on user request
  const handleLoadDemoData = () => {
    setSeriesList(consolidateSeriesList(initialSeriesDatabase));
  };

  // Handler to clear library back to empty state
  const handleClearLibrary = () => {
    setSeriesList([]);
    mutationVersion.current++;
    if (currentUser) {
      Object.keys(currentUser.ownedBooks).forEach(id => { void removeUserBookFromCloud(currentUser.id, id).then(reportSync); });
      setCurrentUser(prev => prev ? { ...prev, ownedBooks: {}, readingStatus: {}, hiddenBooks: {}, hiddenSeries: {} } : null);
    }
  };

  // Filters & Tabs
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTab, setActiveTab] = useState<ActiveTab>("series");
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingAuthorBio, setLoadingAuthorBio] = useState<string | null>(null);

  // Modals state
  const [activeBookModal, setActiveBookModal] = useState<{
    book: Book;
    series: Series;
  } | null>(null);
  const [activeAuthorName, setActiveAuthorName] = useState<string | null>(null);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [scannedIsbn, setScannedIsbn] = useState("");
  const [isAuthOpen, setIsAuthOpen] = useState(!currentUser);
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
    let cancelled = false;
    const version = mutationVersion.current;
    loadUserShelfFromCloud(currentUserId).then(cloudShelf => {
      if (!cancelled && cloudShelf !== null && version === mutationVersion.current) {
        setCurrentUser(prev => prev?.id === currentUserId ? { ...prev, ownedBooks: cloudShelf } : prev);
      }
    });
    return () => { cancelled = true; };
  }, [currentUserId, setCurrentUser]);

  const handleToggleOwned = (bookId: string, defaultEditionId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    const currentOwned = { ...(currentUser.ownedBooks || {}) };
    if (currentOwned[bookId]) {
      delete currentOwned[bookId];
      void removeUserBookFromCloud(currentUser.id, bookId).then(reportSync);
    } else {
      currentOwned[bookId] = defaultEditionId;
      void saveUserBookToCloud(currentUser.id, bookId, defaultEditionId).then(reportSync);
    }

    mutationVersion.current++;
    setCurrentUser(prev => prev ? { ...prev, ownedBooks: currentOwned } : prev);
  };

  const handleSelectEdition = (bookId: string, editionId: string) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    mutationVersion.current++;
    void saveUserBookToCloud(currentUser.id, bookId, editionId).then(reportSync);
    setCurrentUser(prev => prev ? { ...prev, ownedBooks: { ...prev.ownedBooks, [bookId]: editionId } } : prev);
  };

  // Reading status handlers
  const handleUpdateReadingStatus = (bookId: string, status: ReadingStatus) => {
    if (!currentUser) {
      setIsAuthOpen(true);
      return;
    }

    setCurrentUser(prev => {
      if (!prev) return prev;
      const statuses = { ...prev.readingStatus };
      if (status === 'unread') delete statuses[bookId]; else statuses[bookId] = status;
      return { ...prev, readingStatus: statuses };
    });
  };

  // Hidden books / series handlers
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

  const handleAddBook = (data: AddBookData) => {
    if (!shelfLoaded || !data.title.trim() || !data.author.trim()) return;
    const result = addBookToCatalog(seriesRef.current, data);
    setSeriesList(result.seriesList);
    if (currentUser) {
      mutationVersion.current++;
      setCurrentUser(prev => {
        if (!prev) return prev;
        const readingStatus = { ...prev.readingStatus };
        if (data.readingStatus && data.readingStatus !== 'unread') readingStatus[result.bookId] = data.readingStatus;
        const ownedBooks = { ...prev.ownedBooks };
        if (data.readingStatus !== 'wishlist') ownedBooks[result.bookId] = result.editionId;
        return { ...prev, ownedBooks, readingStatus };
      });
      if (data.readingStatus !== 'wishlist') void saveUserBookToCloud(currentUser.id, result.bookId, result.editionId).then(reportSync);
    }
  };

  const handleImportAuthorBibliography = async (authorName: string) => {
    if (!shelfLoaded) return;
    setLoadingAuthorBio(authorName);
    try {
      const res = await fetch(`/api/books/search?author=${encodeURIComponent(authorName)}&limit=30`);
      if (!res.ok) throw new Error("Nie udało się pobrać książek. / Could not fetch books.");
      const json = await res.json();
      if (!mounted.current) return;
      const booksToAdd = json.data || [];

      if (booksToAdd.length === 0) return;

      let next = seriesRef.current;
      for (const book of booksToAdd as UnifiedBookMetadata[]) {
        const author = book.author || authorName;
        const existing = next.find(s => s.author.toLowerCase().trim() === author.toLowerCase().trim()
          && s.books.some(b => canonicalizeBookTitle(b.title) === canonicalizeBookTitle(book.title)));
        next = addBookToCatalog(next, {
          title: book.title, author, series: existing?.seriesName || `Twórczość: ${author}`,
          formatType: book.formatType, isbn: book.isbn, cover: book.coverUrl,
          publisher: book.publisher, publicationYear: book.publicationYear,
        }).seriesList;
      }
      setSeriesList(next);
    } catch (err) {
      if (mounted.current) setStorageError(err instanceof Error ? err.message : "Import failed");
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
        onLogout={() => { void logout(); }}
        onOpenAddBook={() => { setScannedIsbn(""); setIsAddBookOpen(true); }}
        onOpenScanner={() => setIsScannerOpen(true)}
        onOpenAuthorSearch={() => setIsAuthorSearchOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {(storageError || error) && <p role="alert" className="p-4 text-amber-300">{storageError || error}</p>}
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
              <EmptyLibraryHero
                lang={lang}
                onImportAuthor={handleImportAuthorBibliography}
                onOpenAuthorSearch={(author) => {
                  if (author) setAuthorSearchInitialQuery(author);
                  setIsAuthorSearchOpen(true);
                }}
                onLoadDemoData={handleLoadDemoData}
                loadingAuthor={loadingAuthorBio}
              />
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
            seriesList={filteredSeries}
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
      {activeAuthorName && (
        <AuthorModal
          author={{ ...authorsDatabase[activeAuthorName], name: activeAuthorName,
            bio: authorsDatabase[activeAuthorName]?.bio || '',
            series: seriesList.filter(s => s.author === activeAuthorName).map(s => ({ name: s.seriesName, seriesId: s.seriesId, bookIds: s.books.map(b => b.id) })) }}
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
          initialIsbn={scannedIsbn}
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
          onLogin={user => { setCurrentUser(user); setIsAuthOpen(false); }}
          isForcedModal={!currentUser}
        />
      )}

      {/* Direct Global Barcode Scanner Modal */}
      {isScannerOpen && (
        <BarcodeScannerModal
          lang={lang}
          onClose={() => setIsScannerOpen(false)}
          onDetected={(isbn) => {
            setIsScannerOpen(false);
            setScannedIsbn(isbn);
            setIsAddBookOpen(true);
          }}
        />
      )}
    </div>
  );
}