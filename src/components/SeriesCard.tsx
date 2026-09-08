"use client";

import React from "react";
import { Series, Book, FormatFilter, StatusFilter, Language, UserAccount } from "@/types";
import { translations } from "@/data/mockData";
import { Check, Plus } from "lucide-react";
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
}) => {
  const t = translations[lang];

  // Calculate series ownership stats
  const totalBooks = series.books.length;
  const ownedCount = series.books.filter(
    (b) => currentUser?.ownedBooks && currentUser.ownedBooks[b.id]
  ).length;
  const percent = Math.round((ownedCount / totalBooks) * 100);
  const isComplete = percent === 100;

  // Filter books inside the series
  const visibleBooks = series.books.filter((book) => {
    const isOwned = Boolean(currentUser?.ownedBooks && currentUser.ownedBooks[book.id]);

    // Format filter
    if (formatFilter !== "all" && book.formatType !== formatFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === "owned" && !isOwned) return false;
    if (statusFilter === "missing" && isOwned) return false;

    return true;
  });

  if (visibleBooks.length === 0 && (formatFilter !== "all" || statusFilter !== "all")) {
    return null;
  }

  return (
    <div className="card-glass rounded-2xl p-6 border border-gray-800/80 shadow-xl space-y-5">
      {/* Series Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/70 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold font-serif text-white tracking-wide">
              {series.seriesName}
            </h3>
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
              onClick={() => onOpenAuthorModal(series.author)}
              className="text-brand-400 font-bold hover:underline"
            >
              {series.author}
            </button>
          </p>
        </div>

        {/* Progress bar info */}
        <div className="sm:text-right min-w-[140px]">
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-semibold text-gray-300 mb-1">
            <span className="text-gray-400 font-normal">{t.progress}</span>
            <span className={isComplete ? "text-emerald-400" : "text-amber-400"}>
              {ownedCount}/{totalBooks} ({percent}%)
            </span>
          </div>
          <div className="w-full sm:w-40 bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isComplete ? "bg-emerald-500" : "bg-gradient-to-r from-amber-500 to-brand-500"
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Books Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 gap-4">
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
          );
        })}
      </div>
    </div>
  );
};