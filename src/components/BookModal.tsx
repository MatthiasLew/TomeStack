"use client";

import React, { useState, useEffect } from "react";
import { Book, Series, FormatFilter, Language, UserAccount, ReadingStatus } from "@/types";
import { translations } from "@/data/mockData";
import { X, Check, ShoppingBag, BookOpen, BookmarkCheck, Eye, EyeOff } from "lucide-react";
import { BookCover } from "./BookCover";

interface BookModalProps {
  book: Book;
  series: Series;
  currentUser: UserAccount | null;
  lang: Language;
  onClose: () => void;
  onSelectEdition: (bookId: string, editionId: string) => void;
  onToggleOwned: (bookId: string, editionId: string) => void;
  onOpenAuthor: (authorName: string) => void;
  onUpdateReadingStatus?: (bookId: string, status: ReadingStatus) => void;
  onToggleHideBook?: (bookId: string) => void;
}

export const BookModal: React.FC<BookModalProps> = ({
  book,
  series,
  currentUser,
  lang,
  onClose,
  onSelectEdition,
  onToggleOwned,
  onOpenAuthor,
  onUpdateReadingStatus,
  onToggleHideBook,
}) => {
  const t = translations[lang];
  const [modalFormat, setModalFormat] = useState<FormatFilter>("all");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const isOwned = Boolean(currentUser?.ownedBooks && currentUser.ownedBooks[book.id]);
  const isHidden = Boolean(currentUser?.hiddenBooks?.[book.id]);
  const userEditionId = currentUser?.ownedBooks?.[book.id];

  // Filter prices by selected format
  const filteredPrices = book.prices.filter((p) => {
    if (modalFormat === "all") return true;
    return p.formatType === modalFormat;
  });

  // Filter editions by selected format
  const filteredEditions = book.editions.filter((e) => {
    if (modalFormat === "all") return true;
    return e.formatType === modalFormat;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-modal-title"
        className="bg-gray-900 border border-gray-700 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800 flex items-start justify-between bg-gray-950/70">
          <div className="flex gap-4">
            <div className="w-20 h-28 shrink-0 overflow-hidden rounded-lg shadow-md border border-gray-700 bg-gray-950">
              <BookCover
                src={book.cover}
                isbn={book.editions[0]?.isbn}
                title={book.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-500/20 text-brand-400">
                {series.seriesName} #{book.volume}
              </span>
              <h2 id="book-modal-title" className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">
                {book.title}
              </h2>
              <p className="text-sm text-gray-400 font-medium">
                {t.author}{" "}
                <button
                  onClick={() => {
                    onClose();
                    onOpenAuthor(series.author);
                  }}
                  className="text-brand-400 font-bold underline hover:text-brand-300"
                >
                  {series.author}
                </button>
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isOwned
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                  }`}
                >
                  {isOwned ? t.ownedBadge : t.missingBadge}
                </span>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-gray-800 text-gray-300 border border-gray-700">
                  {book.formatType === "hardcover" ? "📖 Twarda oprawa" : "📕 Miękka oprawa"}
                </span>
                {isHidden && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                    🚫 {lang === "pl" ? "Ukryta z widoku" : "Hidden from view"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={lang === "pl" ? "Zamknij" : "Close"}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 transition focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {/* Reading Status Selector */}
          {onUpdateReadingStatus && (
            <div className="p-4 rounded-xl bg-gray-950/70 border border-brand-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-brand-400" />
                  <span>{lang === "pl" ? "Twój status czytania:" : "Your Reading Status:"}</span>
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  {lang === "pl"
                    ? "Zaznacz, czy czytasz ten tom teraz, czy już go ukończyłeś:"
                    : "Mark if you are currently reading this volume or completed it:"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onUpdateReadingStatus(book.id, "reading")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentUser?.readingStatus?.[book.id] === "reading"
                      ? "bg-amber-500 text-black shadow-lg shadow-amber-500/25 ring-2 ring-amber-400"
                      : "bg-gray-800 text-amber-300 hover:bg-gray-700"
                  }`}
                >
                  <span>📖</span>
                  <span>{lang === "pl" ? "Czytam teraz" : "Reading"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateReadingStatus(book.id, "read")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentUser?.readingStatus?.[book.id] === "read"
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/25 ring-2 ring-emerald-400"
                      : "bg-gray-800 text-emerald-400 hover:bg-gray-700"
                  }`}
                >
                  <span>✅</span>
                  <span>{lang === "pl" ? "Przeczytana" : "Read"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateReadingStatus(book.id, "wishlist")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    currentUser?.readingStatus?.[book.id] === "wishlist"
                      ? "bg-purple-600 text-white shadow-lg shadow-purple-600/25 ring-2 ring-purple-400"
                      : "bg-gray-800 text-purple-300 hover:bg-gray-700"
                  }`}
                >
                  <span>⭐</span>
                  <span>{lang === "pl" ? "Chcę przeczytać" : "Want to read"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateReadingStatus(book.id, "unread")}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    !currentUser?.readingStatus?.[book.id] || currentUser?.readingStatus?.[book.id] === "unread"
                      ? "bg-gray-700 text-gray-200"
                      : "bg-gray-800/60 text-gray-400 hover:bg-gray-700"
                  }`}
                >
                  <span>{lang === "pl" ? "Na półce" : "On shelf"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Format Selector */}
          <div className="p-4 rounded-xl bg-gray-950/60 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300 flex items-center gap-1.5">
                <span>🎯 Preferowana oprawa / Format:</span>
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Wybierz format, aby przefiltrować ceny w księgarniach i wydania:
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setModalFormat("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${
                  modalFormat === "all"
                    ? "bg-brand-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                Wszystkie
              </button>
              <button
                onClick={() => setModalFormat("hardcover")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                  modalFormat === "hardcover"
                    ? "bg-brand-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <span>📖</span>
                <span>Twarda</span>
              </button>
              <button
                onClick={() => setModalFormat("paperback")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1 ${
                  modalFormat === "paperback"
                    ? "bg-brand-600 text-white"
                    : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <span>📕</span>
                <span>Miękka</span>
              </button>
            </div>
          </div>

          {/* Section 1: Price Comparison */}
          {book.prices.length > 0 && <p className="text-xs text-amber-300">{lang === 'pl' ? 'Ceny demonstracyjne — sprawdź aktualną ofertę w sklepie.' : 'Demo prices — check current offers at the store.'}</p>}
          <div className="bg-gray-950/70 border border-amber-500/30 rounded-xl p-4 sm:p-5 space-y-3 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-gray-800/80 pb-2.5">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-400" />
                <h4 className="text-sm font-bold text-amber-300 uppercase tracking-wider">
                  {t.priceCompTitle}
                </h4>
              </div>
              <span className="text-xs font-medium text-amber-400/80">
                {modalFormat === "all"
                  ? "Wszystkie oferty z polskich księgarni"
                  : `Tylko oprawa: ${modalFormat === "hardcover" ? "twarda" : "miękka"}`}
              </span>
            </div>

            <div className="divide-y divide-gray-800/60">
              {filteredPrices.length === 0 ? (
                <p className="text-xs text-gray-500 py-3">Brak ofert dla wybranego formatu.</p>
              ) : (
                filteredPrices.map((price, idx) => (
                  <div
                    key={idx}
                    className="py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-gray-200 text-sm">{price.store}</span>
                      <span className="px-2 py-0.5 rounded text-[11px] bg-gray-800 text-gray-300 font-medium">
                        {price.format}
                      </span>
                      {price.isBest && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[10px] border border-amber-500/40">
                          {t.cheapest}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-[11px] hidden sm:inline">
                        {price.shipping}
                      </span>
                      <span className="font-bold text-white text-sm">{price.price}</span>
                      <a
                        href={price.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-semibold transition flex items-center gap-1 shadow"
                      >
                        <span>{t.buyInStore}</span>
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section 2: Editions list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-400" />
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                  {t.editionsTitle}
                </h4>
              </div>
              <span className="text-xs text-gray-500 hidden sm:inline">{t.editionsDesc}</span>
            </div>

            <div className="space-y-2">
              {filteredEditions.map((ed) => {
                const isSelected = userEditionId === ed.id;

                return (
                  <div
                    key={ed.id}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 transition ${
                      isSelected
                        ? "bg-emerald-950/30 border-emerald-500/60"
                        : "bg-gray-950/40 border-gray-800 hover:border-gray-700"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{ed.publisher || "—"}</span>
                        <span className="text-xs text-gray-400">({ed.year || "—"})</span>
                        <span className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-300 font-medium">
                          {ed.format}
                        </span>
                        {isSelected && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {t.yourEdition}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        ISBN: <span className="font-mono text-gray-300">{ed.isbn || "—"}</span>
                        {ed.coverDesc && ` • ${ed.coverDesc}`}
                      </p>
                    </div>

                    <button
                      onClick={() => onSelectEdition(book.id, ed.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                        isSelected
                          ? "bg-emerald-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {isSelected ? "✓ Wybrane" : t.selectThis}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/70 flex items-center justify-between">
          <button
            onClick={() => onToggleOwned(book.id, userEditionId || book.editions[0]?.id || "ed1")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              isOwned
                ? "bg-rose-950/50 text-rose-300 hover:bg-rose-900/60 border border-rose-800/40"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg"
            }`}
          >
            {isOwned ? (
              <span>{t.removeOwned}</span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>{t.markOwned}</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {onToggleHideBook && (
              <button
                type="button"
                onClick={() => onToggleHideBook(book.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  isHidden
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500 hover:text-white"
                    : "bg-gray-800 text-gray-300 hover:text-rose-300 hover:bg-rose-950/40 border border-gray-700/60"
                }`}
              >
                {isHidden ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{lang === "pl" ? "Przywróć tom do widoku" : "Unhide book"}</span>
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>{lang === "pl" ? "Nie interesuje mnie to (Ukryj)" : "Not interested (Hide)"}</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold cursor-pointer"
            >
              {t.closeBtn}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};