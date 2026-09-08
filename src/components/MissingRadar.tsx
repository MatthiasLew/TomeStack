"use client";

import React, { useState } from "react";
import { Series, Book, FormatFilter, Language, UserAccount } from "@/types";
import { translations } from "@/data/mockData";
import { calculateSeriesBasket } from "@/lib/pricing/priceEngine";
import {
  Target,
  ExternalLink,
  Plus,
  ShoppingCart,
  Sparkles,
  Truck,
  TrendingDown,
} from "lucide-react";

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
  const [selectedSeriesFilter, setSelectedSeriesFilter] = useState<string>("all");

  // Collect all missing books across all series
  const missingItems: { book: Book; series: Series }[] = [];

  seriesList.forEach((s) => {
    if (selectedSeriesFilter !== "all" && s.seriesId !== selectedSeriesFilter) {
      return;
    }

    s.books.forEach((b) => {
      const isOwned = Boolean(currentUser?.ownedBooks && currentUser.ownedBooks[b.id]);
      if (!isOwned) {
        if (formatFilter === "all" || b.formatType === formatFilter) {
          missingItems.push({ book: b, series: s });
        }
      }
    });
  });

  // Basket optimization calculation
  const basketOptimization = calculateSeriesBasket(
    missingItems.map((item) => ({
      id: item.book.id,
      title: item.book.title,
      volume: item.book.volume,
      formatType: item.book.formatType,
      prices: item.book.prices,
    })),
    formatFilter
  );

  return (
    <div className="space-y-6">
      {/* Radar Banner */}
      <div className="card-glass rounded-2xl p-6 border-rose-500/30 bg-gradient-to-r from-rose-950/30 via-gray-900/60 to-brand-950/30 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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

          {/* Series Filter dropdown */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs text-gray-400">
              {lang === "pl" ? "Filtruj serię:" : "Filter series:"}
            </span>
            <select
              value={selectedSeriesFilter}
              onChange={(e) => setSelectedSeriesFilter(e.target.value)}
              className="bg-gray-800 text-white rounded-lg px-3 py-1.5 border border-gray-700 text-xs focus:outline-none focus:border-brand-500"
            >
              <option value="all">
                {lang === "pl" ? "Wszystkie serie" : "All series"} ({seriesList.length})
              </option>
              {seriesList.map((s) => (
                <option key={s.seriesId} value={s.seriesId}>
                  {s.seriesName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Basket Optimizer Bar */}
        {missingItems.length > 0 && (
          <div className="mt-6 pt-5 border-t border-rose-900/40 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Cherry-pick lowest total */}
            <div className="p-3.5 rounded-xl bg-gray-900/80 border border-emerald-500/30 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                <TrendingDown className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 font-medium block">
                  {lang === "pl" ? "Najniższy łączny koszt zakupu" : "Cherry-picked lowest total"}
                </span>
                <p className="text-lg font-bold text-emerald-400 font-mono">
                  {basketOptimization.cheapestCombinedPrice.toFixed(2)} zł
                </p>
                <span className="text-[10px] text-emerald-300/80">
                  {lang === "pl"
                    ? `Łącznie za ${basketOptimization.totalMissingBooks} brakujące tomy`
                    : `Total for ${basketOptimization.totalMissingBooks} missing volumes`}
                </span>
              </div>
            </div>

            {/* Best Single Store */}
            {basketOptimization.bestSingleStore && (
              <div className="p-3.5 rounded-xl bg-gray-900/80 border border-amber-500/30 flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] text-gray-400 font-medium block">
                    {lang === "pl" ? "Paczka z 1 księgarni (1 wysyłka)" : "Best single store (1 parcel)"}
                  </span>
                  <p className="text-lg font-bold text-amber-400 font-mono">
                    {basketOptimization.bestSingleStore.grandTotal.toFixed(2)} zł
                  </p>
                  <span className="text-[10px] text-amber-300/80">
                    {basketOptimization.bestSingleStore.storeName} •{" "}
                    {basketOptimization.bestSingleStore.availableBooksCount} z{" "}
                    {basketOptimization.totalMissingBooks} tomów
                  </span>
                </div>
              </div>
            )}

            {/* Smart Completionist Advice */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-brand-900/30 to-purple-950/40 border border-brand-500/30 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-brand-500/20 text-brand-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-brand-300 font-semibold block">
                  {lang === "pl" ? "Rekomendacja kolekcjonera" : "Collector tip"}
                </span>
                <p className="text-xs text-gray-300 mt-0.5 leading-snug">
                  {lang === "pl"
                    ? "Kupuj wydania o spójnej oprawie, by grzbiety na półce pasowały wysokością!"
                    : "Buy consistent bindings so shelf spines align perfectly!"}
                </p>
              </div>
            </div>
          </div>
        )}
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
                className="card-glass rounded-xl p-4 border border-rose-900/30 hover:border-rose-500/40 transition flex gap-4 bg-gray-950/40 hover:bg-gray-900/50"
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
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                              {bestOffer.store}
                            </span>
                            <span className="text-[10px] text-gray-400">{bestOffer.shipping}</span>
                          </div>
                          <p className="text-sm font-extrabold text-amber-400 mt-0.5 font-mono">
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
                          title={lang === "pl" ? "Przejdź do oferty w księgarni" : "Go to bookstore offer"}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
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