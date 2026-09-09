"use client";

import React, { useState } from "react";
import { Series, Book, FormatFilter, StatusFilter, Language, UserAccount, ReadingStatus } from "@/types";
import { translations } from "@/data/mockData";
import { Check, Plus, ChevronDown, ChevronUp, Eye, EyeOff } from "lucide-react";
import { matchesBookFormat } from "@/lib/library/catalog";
import { BookCover } from "./BookCover";

interface SeriesCardProps {
  series: Series;
  currentUser: UserAccount | null;
  formatFilter: FormatFilter;
  statusFilter: StatusFilter;
  lang: Language;
  onOpenBookModal: (book: Book, series: Series) => void;
  onOpenAuthorModal: (authorName: string) => void;
  onToggleOwned: (bookId: string, defaultEditionId: string) => void;
  onUpdateReadingStatus?: (bookId: string, status: ReadingStatus) => void;
  onToggleHideBook?: (bookId: string) => void;
  onToggleHideSeries?: (seriesId: string) => void;
  showHidden?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const SeriesCard: React.FC<SeriesCardProps> = ({
  series,
  currentUser,
  formatFilter,
  statusFilter,
  lang,
  onOpenBookModal,
  onOpenAuthorModal,
  onToggleOwned,
  onUpdateReadingStatus,
  onToggleHideBook,
  onToggleHideSeries,
  showHidden = false,
  isCollapsed,
  onToggleCollapse,
}) => {
  const t = translations[lang];

  const [localCollapsed, setLocalCollapsed] = useState(false);
  const collapsed = isCollapsed !== undefined ? isCollapsed : localCollapsed;
  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setLocalCollapsed((prev) => !prev);
    }
  };

  // Calculate series ownership stats
  const totalBooks = series.books.length;
  const ownedCount = series.books.filter(
    (b) => currentUser?.ownedBooks && currentUser.ownedBooks[b.id]
  ).length;
  const percent = totalBooks ? Math.round((ownedCount / totalBooks) * 100) : 0;
  const isComplete = percent === 100;

  const isSeriesHidden = Boolean(currentUser?.hiddenSeries?.[series.seriesId]);
  if (!showHidden && isSeriesHidden) return null;
  if (showHidden && !isSeriesHidden && series.books.every((b) => !currentUser?.hiddenBooks?.[b.id])) {
    return null;
  }

  // Filter books inside the series
  const visibleBooks = series.books.filter((book) => {
    const isOwned = Boolean(currentUser?.ownedBooks && currentUser.ownedBooks[book.id]);
    const isHidden = Boolean(currentUser?.hiddenBooks?.[book.id]);

    // Hidden filter
    if (!showHidden && isHidden) return false;
    if (showHidden && !isHidden && !isSeriesHidden) return false;

    // Format filter
    if (!matchesBookFormat(book, formatFilter, currentUser?.ownedBooks?.[book.id])) {
      return false;
    }

    // Status filter
    if (statusFilter === "owned" && !isOwned) return false;
    if (statusFilter === "missing" && isOwned) return false;
    if (statusFilter === "reading" && currentUser?.readingStatus?.[book.id] !== "reading") return false;
    if (statusFilter === "read" && currentUser?.readingStatus?.[book.id] !== "read") return false;

    return true;
  });

  if (visibleBooks.length === 0 && (formatFilter !== "all" || statusFilter !== "all" || showHidden)) {
    return null;
  }

  return (
    <div className="card-glass rounded-2xl p-3.5 sm:p-6 border border-gray-800/80 shadow-xl space-y-4 transition-all overflow-hidden">
      {/* Series Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/70 pb-4">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              onClick={handleToggle}
              className="text-lg sm:text-xl font-bold font-serif text-white tracking-wide cursor-pointer hover:text-brand-300 transition flex items-center gap-2 group select-none"
            >
              <span>{series.seriesName}</span>
              <span className="text-gray-500 group-hover:text-brand-400 transition text-sm">
                {collapsed ? <ChevronDown className="w-4 h-4 inline" /> : <ChevronUp className="w-4 h-4 inline" />}
              </span>
            </h3>
            {isSeriesHidden && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                🚫 {lang === "pl" ? "Cykl ukryty" : "Series hidden"}
              </span>
            )}
            {isComplete ? (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {t.completeSeries}
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                {t.missingCount.replace("{n}", String(totalBooks - ownedCount))}
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {t.author}{" "}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenAuthorModal(series.author);
              }}
              className="text-brand-400 font-bold hover:underline"
            >
              {series.author}
            </button>
          </p>
        </div>

        {/* Progress bar info & Toggle button */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:justify-end w-full sm:w-auto">
          <div className="text-left sm:text-right w-full sm:w-auto sm:min-w-[130px]">
            <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-semibold text-gray-300 mb-1">
              <span className="text-gray-400 font-normal">{t.progress}</span>
              <span className={isComplete ? "text-emerald-400" : "text-amber-400"}>
                {ownedCount}/{totalBooks} ({percent}%)
              </span>
            </div>
            <div className="w-full sm:w-36 bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isComplete ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-brand-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Hide/Unhide Series Button */}
          {onToggleHideSeries && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleHideSeries(series.seriesId);
              }}
              className={`p-2 rounded-xl text-xs font-semibold transition flex items-center gap-1 shrink-0 cursor-pointer ${
                isSeriesHidden
                  ? "bg-rose-500/25 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white"
                  : "bg-gray-800/60 hover:bg-rose-950/40 text-gray-400 hover:text-rose-300 border border-gray-700/60"
              }`}
              title={
                isSeriesHidden
                  ? (lang === "pl" ? "Przywróć ten cykl do widoku" : "Unhide this series")
                  : (lang === "pl" ? "Nie interesuje mnie ten cykl (Ukryj)" : "Not interested in this series (Hide)")
              }
            >
              {isSeriesHidden ? <Eye className="w-4 h-4 text-emerald-400" /> : <EyeOff className="w-4 h-4" />}
            </button>
          )}

          {/* Collapse/Expand Toggle Button */}
          <button
            onClick={handleToggle}
            className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/60 transition flex items-center gap-1.5 text-xs font-semibold shrink-0 cursor-pointer shadow-sm"
            title={collapsed ? (t.expandSeries || "Rozwiń") : (t.collapseSeries || "Zwiń")}
          >
            <span className="hidden sm:inline">
              {collapsed ? (t.expandSeries || "Rozwiń") : (t.collapseSeries || "Zwiń")}
            </span>
            {collapsed ? <ChevronDown className="w-4 h-4 text-brand-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Body: Collapsed preview vs Expanded full book grid */}
      {collapsed ? (
        <div
          onClick={handleToggle}
          className="bg-gray-950/40 hover:bg-gray-900/50 border border-gray-800/70 hover:border-gray-700/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 cursor-pointer transition shadow-inner"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {lang === "pl" ? "Tomy:" : "Volumes:"}
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {series.books.map((b) => {
                const isOwned = Boolean(currentUser?.ownedBooks && currentUser.ownedBooks[b.id]);
                return (
                  <span
                    key={b.id}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold border transition ${
                      isOwned
                        ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300"
                        : "bg-gray-900 border-gray-800 text-gray-500"
                    }`}
                    title={`#${b.volume}: ${b.title} (${isOwned ? (lang === "pl" ? "Posiadasz" : "Owned") : (lang === "pl" ? "Brak" : "Missing")})`}
                  >
                    #{b.volume} {isOwned ? "✓" : "—"}
                  </span>
                );
              })}
            </div>
          </div>
          <span className="text-xs font-semibold text-brand-400 hover:text-brand-300 flex items-center gap-1">
            <span>{t.showAllVolumes || (lang === "pl" ? "Rozwiń tomy cyklu" : "Show volumes")} ({visibleBooks.length})</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </span>
        </div>
      ) : (
        /* Books Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-2.5 sm:gap-4 pt-1">
        {visibleBooks.map((book) => {
          const isOwned = Boolean(currentUser?.ownedBooks && currentUser.ownedBooks[book.id]);
          const selectedEditionId = currentUser?.ownedBooks?.[book.id];
          const selectedEdition = book.editions.find((e) => e.id === selectedEditionId);
          const cheapestPrice = book.prices.find((p) => p.isBest) || book.prices[0];

          return (
            <div
              key={book.id}
              className={`group relative rounded-xl border p-3 flex flex-col justify-between transition-all duration-200 ${
                isOwned
                  ? "bg-gray-950/60 border-emerald-900/40 hover:border-emerald-500/50"
                  : "bg-gray-950/30 border-gray-800/80 hover:border-brand-500/40"
              }`}
            >
              {/* Top thumbnail & status badge */}
              <div className="space-y-2">
                <div
                  onClick={() => onOpenBookModal(book, series)}
                  className="relative aspect-[2/3] w-full rounded-lg overflow-hidden cursor-pointer shadow-md bg-gray-900"
                >
                  <BookCover
                    src={book.cover}
                    isbn={book.editions[0]?.isbn}
                    title={book.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  {/* Volume pill */}
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[10px] font-bold text-white">
                    #{book.volume}
                  </span>

                  {/* Format pill */}
                  <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-gray-900/85 backdrop-blur-sm text-[10px] font-semibold text-gray-300">
                    {book.formatType === "hardcover" ? "📖 Twarda" : "📕 Miękka"}
                  </span>

                  {/* Reading status pill on cover */}
                  {currentUser?.readingStatus?.[book.id] === "reading" && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-amber-500 text-black text-[10px] font-extrabold flex items-center gap-1 shadow-lg ring-1 ring-amber-300 animate-pulse">
                      📖 {lang === "pl" ? "Czytam" : "Reading"}
                    </span>
                  )}
                  {currentUser?.readingStatus?.[book.id] === "read" && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-lg ring-1 ring-emerald-400">
                      ✓ {lang === "pl" ? "Przeczytana" : "Read"}
                    </span>
                  )}
                  {currentUser?.readingStatus?.[book.id] === "wishlist" && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-purple-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-lg ring-1 ring-purple-400">
                      ⭐ {lang === "pl" ? "Chcę" : "Wishlist"}
                    </span>
                  )}
                  {/* Hidden badge on cover */}
                  {currentUser?.hiddenBooks?.[book.id] && (
                    <span className="absolute top-8 left-2 px-1.5 py-0.5 rounded bg-rose-900/90 text-rose-200 text-[10px] font-bold border border-rose-600/50 flex items-center gap-1 shadow">
                      🚫 {lang === "pl" ? "Ukryta" : "Hidden"}
                    </span>
                  )}
                </div>

                {/* Title */}
                <div>
                  <h4
                    onClick={() => onOpenBookModal(book, series)}
                    className="text-sm font-bold text-white hover:text-brand-400 cursor-pointer line-clamp-1"
                    title={book.title}
                  >
                    {book.title}
                  </h4>
                  <p className="text-[11px] text-gray-400 truncate">
                    {isOwned && selectedEdition
                      ? `${selectedEdition.publisher} (${selectedEdition.year})`
                      : cheapestPrice
                      ? `Od ${cheapestPrice.price}`
                      : "Sprawdź wydania"}
                  </p>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="pt-3 border-t border-gray-800/60 mt-3 flex items-center justify-between gap-1 text-xs">
                {isOwned ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Posiadasz</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400">
                    <span>🎯 Brak</span>
                  </span>
                )}

                <div className="flex items-center gap-1">
                  {onToggleHideBook && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleHideBook(book.id);
                      }}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                        currentUser?.hiddenBooks?.[book.id]
                          ? "bg-rose-500/25 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white"
                          : "bg-gray-800 text-gray-400 hover:text-rose-300 hover:bg-rose-950/40"
                      }`}
                      title={
                        currentUser?.hiddenBooks?.[book.id]
                          ? (lang === "pl" ? "Przywróć tom do widoku" : "Unhide book")
                          : (lang === "pl" ? "Nie interesuje mnie to (Ukryj tom)" : "Not interested (Hide book)")
                      }
                    >
                      {currentUser?.hiddenBooks?.[book.id] ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {onUpdateReadingStatus && isOwned && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const current = currentUser?.readingStatus?.[book.id];
                        const nextStatus: ReadingStatus =
                          current === "reading" ? "read" : current === "read" ? "unread" : "reading";
                        onUpdateReadingStatus(book.id, nextStatus);
                      }}
                      className={`p-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                        currentUser?.readingStatus?.[book.id] === "reading"
                          ? "bg-amber-500/25 text-amber-300 border border-amber-500/40"
                          : currentUser?.readingStatus?.[book.id] === "read"
                          ? "bg-emerald-500/25 text-emerald-300 border border-emerald-500/40"
                          : "bg-gray-800 text-gray-400 hover:text-white"
                      }`}
                      title={
                        currentUser?.readingStatus?.[book.id] === "reading"
                          ? (lang === "pl" ? "Teraz czytasz. Kliknij, aby oznaczyć jako przeczytaną." : "Reading now. Click to mark as read.")
                          : currentUser?.readingStatus?.[book.id] === "read"
                          ? (lang === "pl" ? "Przeczytana. Kliknij, aby zresetować status." : "Finished. Click to reset.")
                          : (lang === "pl" ? "Kliknij, aby oznaczyć: Czytam teraz" : "Click to mark as reading")
                      }
                    >
                      <span>{currentUser?.readingStatus?.[book.id] === "reading" ? "📖" : currentUser?.readingStatus?.[book.id] === "read" ? "🎓" : "🔖"}</span>
                    </button>
                  )}

                  <button
                    onClick={() => onToggleOwned(book.id, book.editions[0]?.id || "default")}
                    className={`p-1.5 rounded-lg text-xs font-semibold transition ${
                      isOwned
                        ? "bg-emerald-950/40 text-emerald-300 hover:bg-rose-950/50 hover:text-rose-300"
                        : "bg-brand-600/30 text-brand-300 hover:bg-brand-600 hover:text-white"
                    }`}
                    title={isOwned ? t.removeOwned : t.markOwned}
                  >
                    {isOwned ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        </div>
      )}
    </div>
  );
};