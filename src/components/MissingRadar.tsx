"use client";

import React from "react";
import { Series, Book, FormatFilter, Language, UserAccount } from "@/types";
import { translations } from "@/data/mockData";
import { Target, ExternalLink, Plus } from "lucide-react";

interface MissingRadarProps {
  seriesList: Series[];
  currentUser: UserAccount | null;
  formatFilter: FormatFilter;
  lang: Language;
  onOpenBookModal: (book: Book, series: Series) => void;
  onToggleOwned: (bookId: string, defaultEditionId: string) => void;
}

export const MissingRadar: React.FC<MissingRadarProps> = ({
  seriesList,
  currentUser,
  formatFilter,
  lang,
  onOpenBookModal,
  onToggleOwned,
}) => {
  const t = translations[lang];

  // Collect all missing books across all series
  const missingItems: { book: Book; series: Series }[] = [];

  seriesList.forEach((s) => {
    s.books.forEach((b) => {
      const isOwned = Boolean(currentUser?.ownedBooks && currentUser.ownedBooks[b.id]);
      if (!isOwned) {
        if (formatFilter === "all" || b.formatType === formatFilter) {
          missingItems.push({ book: b, series: s });
        }
      }
    });
  });

  return (
    <div className="space-y-6">
      {/* Radar Banner */}
      <div className="card-glass rounded-2xl p-6 border-rose-500/30 bg-gradient-to-r from-rose-950/20 via-gray-900/40 to-brand-950/20 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl">
            <Target className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold font-serif text-white flex items-center gap-2">
              <span>{t.missingRadarTitle}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-500/30">
                {missingItems.length} {lang === "pl" ? "braków" : "missing"}
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">{t.missingRadarDesc}</p>
          </div>
        </div>
      </div>

      {/* Grid of Missing Books with direct prices */}
      {missingItems.length === 0 ? (
        <div className="card-glass rounded-2xl p-12 text-center text-gray-400 space-y-3">
          <span className="text-4xl">🏆</span>
          <h3 className="text-lg font-bold text-white">
            {lang === "pl" ? "Gratulacje! Brak brakujących tomów!" : "Congratulations! No missing volumes!"}
          </h3>
          <p className="text-sm">
            {lang === "pl"
              ? "Wszystkie tomy w aktualnie obserwowanych seriach znajdują się w Twojej biblioteczce."
              : "All volumes in your monitored series are in your personal library."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {missingItems.map(({ book, series }) => {
            const bestOffer = book.prices.find((p) => p.isBest) || book.prices[0];

            return (
              <div
                key={book.id}
                className="card-glass rounded-xl p-4 border border-rose-900/30 hover:border-rose-500/40 transition flex gap-4 bg-gray-950/40"
              >
                {/* Cover thumbnail */}
                <div
                  onClick={() => onOpenBookModal(book, series)}
                  className="w-20 sm:w-24 shrink-0 aspect-[2/3] rounded-lg overflow-hidden cursor-pointer shadow-md bg-gray-900 relative"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={book.cover}
                    alt={book.title}
                    className="w-full h-full object-cover hover:scale-105 transition"
                  />
                  <span className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded bg-black/80 text-[10px] font-bold text-white">
                    #{book.volume}
                  </span>
                </div>

                {/* Details & bookstore action */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-brand-400 uppercase tracking-wider block truncate">
                      {series.seriesName}
                    </span>
                    <h4
                      onClick={() => onOpenBookModal(book, series)}
                      className="text-base font-bold text-white hover:text-brand-300 cursor-pointer line-clamp-1"
                      title={book.title}
                    >
                      {book.title}
                    </h4>
                    <p className="text-xs text-gray-400">{series.author}</p>

                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-800 text-[11px] text-gray-300 font-medium">
                      <span>{book.formatType === "hardcover" ? "📖 Twarda" : "📕 Miękka"}</span>
                    </div>
                  </div>

                  {/* Best price & buy link */}
                  <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2 mt-2">
                    <div>
                      {bestOffer ? (
                        <>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            {bestOffer.store}
                          </span>
                          <p className="text-sm font-extrabold text-amber-400 mt-0.5">
                            {bestOffer.price}
                          </p>
                        </>
                      ) : (
                        <span className="text-xs text-gray-500">Brak ofert</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {bestOffer && (
                        <a
                          href={bestOffer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition flex items-center gap-1 shadow-md shadow-amber-900/30"
                        >
                          <span>Kup</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      <button
                        onClick={() =>
                          onToggleOwned(book.id, book.editions[0]?.id || "default")
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white text-xs font-semibold transition flex items-center gap-1"
                        title={t.quickAddOwned}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Mam</span>
                      </button>
                    </div>
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