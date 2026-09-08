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
} from "@/types";
import {
  authorsDatabase,
  initialSeriesDatabase,
} from "@/data/mockData";
import { Navbar } from "@/components/Navbar";
import { UserBanner, GuestAlertBanner } from "@/components/UserBanner";
import { StatsCards } from "@/components/StatsCards";
import { FilterToolbar } from "@/components/FilterToolbar";
import { SeriesCard } from "@/components/SeriesCard";
import { MissingRadar } from "@/components/MissingRadar";
import { BookModal } from "@/components/BookModal";
import { AuthorModal } from "@/components/AuthorModal";
import { AddBookModal } from "@/components/AddBookModal";
import { AuthModal } from "@/components/AuthModal";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import {
  loadUserShelfFromCloud,
  saveUserBookToCloud,
  removeUserBookFromCloud,
} from "@/lib/supabase/shelfSync";

export default function Home() {
  const [lang, setLang] = useState<Language>("pl");
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [seriesList, setSeriesList] = useState<Series[]>(initialSeriesDatabase);

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

  // Filters & Tabs
  const [formatFilter, setFormatFilter] = useState<FormatFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTab, setActiveTab] = useState<ActiveTab>("series");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [activeBookModal, setActiveBookModal] = useState<{
    book: Book;
    series: Series;
  } | null>(null);
  const [activeAuthorName, setActiveAuthorName] = useState<string | null>(null);
  const [isAddBookOpen, setIsAddBookOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

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

    return {
      total,
      owned,
      missing: total - owned,
      avgCompletion,
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

  const handleAddBook = (data: {
    title: string;
    author: string;
    series: string;
    formatType: BindingFormat;
    isbn?: string;
  }) => {
    const newBookId = `book-${Date.now()}`;
    const newEditionId = `ed-${Date.now()}`;

    const newBook: Book = {
      id: newBookId,
      title: data.title,
      volume: 1,
      formatType: data.formatType,
      cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=300&q=80",
      prices: [
        {
          store: "Świat Książki",
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
          publisher: "Wydawnictwo",
          year: new Date().getFullYear(),
          format: data.formatType === "hardcover" ? "Oprawa twarda" : "Oprawa miękka",
          isbn: data.isbn || "9780000000000",
        },
      ],
    };

    setSeriesList((prev) => {
      const existing = prev.find((s) => s.seriesName.toLowerCase() === data.series.toLowerCase());
      if (existing) {
        return prev.map((s) =>
          s.seriesId === existing.seriesId
            ? { ...s, books: [...s.books, { ...newBook, volume: s.books.length + 1 }] }
            : s
        );
      } else {
        const newSeriesId = `series-${Date.now()}`;
        return [
          ...prev,
          {
            seriesId: newSeriesId,
            seriesName: data.series,
            author: data.author,
            books: [newBook],
          },
        ];
      }
    });

    // Auto mark as owned by current user
    if (currentUser) {
      handleToggleOwned(newBookId, newEditionId);
    }
  };

  // Filter series based on search query
  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return seriesList;
    const q = searchQuery.toLowerCase();

    return seriesList
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
  }, [seriesList, searchQuery]);

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
        />

        {/* Content based on Active Tab */}
        {activeTab === "series" && (
          <div className="space-y-6">
            {filteredSeries.length === 0 ? (
              <div className="card-glass rounded-2xl p-12 text-center text-gray-400">
                <p>{lang === "pl" ? "Brak cykli pasujących do kryteriów." : "No series matching filters."}</p>
              </div>
            ) : (
              filteredSeries.map((series) => (
                <SeriesCard
                  key={series.seriesId}
                  series={series}
                  currentUser={currentUser}
                  formatFilter={formatFilter}
                  statusFilter={statusFilter}
                  lang={lang}
                  onOpenBookModal={(book, s) =>
                    setActiveBookModal({ book, series: s })
                  }
                  onOpenAuthorModal={(author) => setActiveAuthorName(author)}
                  onToggleOwned={handleToggleOwned}
                />
              ))
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
          />
        )}

        {activeTab === "all" && (
          <div className="space-y-6">
            {filteredSeries.map((series) => (
              <SeriesCard
                key={series.seriesId}
                series={series}
                currentUser={currentUser}
                formatFilter="all"
                statusFilter="all"
                lang={lang}
                onOpenBookModal={(book, s) =>
                  setActiveBookModal({ book, series: s })
                }
                onOpenAuthorModal={(author) => setActiveAuthorName(author)}
                onToggleOwned={handleToggleOwned}
              />
            ))}
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