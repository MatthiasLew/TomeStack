"use client";

import React, { useState, useEffect } from "react";
import { BindingFormat, Language, ReadingStatus } from "@/types";
import { X, BookOpen, Search, Loader2, Camera } from "lucide-react";
import { BarcodeScannerModal } from "./BarcodeScannerModal";

interface AddBookModalProps {
  initialIsbn?: string;
  lang: Language;
  onClose: () => void;
  onAddBook: (bookData: {
    title: string;
    author: string;
    series: string;
    formatType: BindingFormat;
    isbn?: string;
    cover?: string;
    publisher?: string;
    publicationYear?: number;
    readingStatus?: ReadingStatus;
  }) => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({
  lang,
  initialIsbn = "",
  onClose,
  onAddBook,
}) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [series, setSeries] = useState("");
  const [formatType, setFormatType] = useState<BindingFormat>("hardcover");
  const [readingStatus, setReadingStatus] = useState<ReadingStatus>("unread");
  const [isbn, setIsbn] = useState(initialIsbn);
  const [metadata, setMetadata] = useState<{ cover?: string; publisher?: string; publicationYear?: number }>({});
  const [showScanner, setShowScanner] = useState(false);
  const isBackdropClick = React.useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showScanner) setShowScanner(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showScanner]);

  // Multi-Provider Book Fetch State
  const [isLoadingLookup, setIsLoadingLookup] = useState(false);
  const [lookupFeedback, setLookupFeedback] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!isbn.trim() && !title.trim()) {
      setLookupFeedback(
        lang === "pl"
          ? "Wpisz najpierw numer ISBN lub tytuł książki."
          : "Please enter an ISBN or title first."
      );
      return;
    }

    setIsLoadingLookup(true);
    setLookupFeedback(null);

    try {
      if (isbn.trim()) {
        const res = await fetch(`/api/books/lookup?isbn=${encodeURIComponent(isbn.trim())}`);
        const json = await res.json();

        if (res.ok && json.data) {
          const b = json.data;
          setMetadata({ cover: b.coverUrl, publisher: b.publisher, publicationYear: b.publicationYear });
          setTitle(b.title || title);
          setAuthor(b.author || author);
          setFormatType(b.formatType || formatType);

          const providerLabel =
            b.source === "bn"
              ? "Biblioteka Narodowa"
              : b.source === "openlibrary"
              ? "Open Library"
              : b.source === "googlebooks"
              ? "Google Books"
              : "BN + Open Library / Google";

          setLookupFeedback(
            `✓ Pobrano (${providerLabel}): ${b.publisher || ""} ${
              b.publicationYear ? `(${b.publicationYear})` : ""
            }`
          );
        } else {
          setLookupFeedback(
            lang === "pl"
              ? "Nie znaleziono pozycji w bazach BN, Open Library ani Google Books."
              : "Book not found in BN, Open Library, or Google Books."
          );
        }
      } else if (title.trim()) {
        const res = await fetch(
          `/api/books/search?q=${encodeURIComponent(
            title.trim() + (author.trim() ? ` ${author.trim()}` : "")
          )}`
        );
        const json = await res.json();

        if (res.ok && json.data && json.data.length > 0) {
          const b = json.data[0];
          setMetadata({ cover: b.coverUrl, publisher: b.publisher, publicationYear: b.publicationYear });
          setTitle(b.title || title);
          setAuthor(b.author || author);
          if (b.isbn) setIsbn(b.isbn);
          setFormatType(b.formatType || formatType);

          const providerLabel =
            b.source === "bn"
              ? "Biblioteka Narodowa"
              : b.source === "openlibrary"
              ? "Open Library"
              : "Google Books";

          setLookupFeedback(
            `✓ Znaleziono (${providerLabel}): ${b.publisher || ""} ${
              b.publicationYear ? `(${b.publicationYear})` : ""
            }`
          );
        } else {
          setLookupFeedback(
            lang === "pl"
              ? "Brak wyników w połączonych bazach dla tego tytułu."
              : "No search results across connected providers."
          );
        }
      }
    } catch {
      setLookupFeedback(
        lang === "pl"
          ? "Błąd połączenia z bazą książek."
          : "Connection error with book provider APIs."
      );
    } finally {
      setIsLoadingLookup(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    onAddBook({
      ...metadata,
      title: title.trim(),
      author: author.trim(),
      series: series || (lang === "pl" ? "Książki samodzielne" : "Standalone"),
      formatType,
      isbn,
      readingStatus,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onMouseDown={(e) => {
        isBackdropClick.current = (e.target === e.currentTarget);
      }}
      onClick={(e) => {
        if (isBackdropClick.current && e.target === e.currentTarget) onClose();
        isBackdropClick.current = false;
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-book-title"
        className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl overflow-y-auto max-h-[92vh] shadow-2xl p-6"
      >
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-400" />
            <h3 id="add-book-title" className="text-lg font-bold text-white">
              {lang === "pl" ? "Dodaj nową książkę" : "Add new book"}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={lang === "pl" ? "Zamknij" : "Close"}
            className="text-gray-400 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Provider Quick Lookup Section */}
        <div className="my-3 p-3 rounded-xl bg-gradient-to-r from-brand-950/40 via-purple-950/20 to-gray-950/60 border border-brand-500/20 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-brand-300 flex items-center gap-1">
                <span>🌐 Multi-Provider Auto-Fetch</span>
              </span>
              <span className="text-[10px] text-gray-400 block">
                {lang === "pl"
                  ? "BN • Open Library • Google Books"
                  : "PL National Lib • Open Library • Google Books"}
              </span>
            </div>
            <button
              type="button"
              onClick={handleLookup}
              disabled={isLoadingLookup}
              className="px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white font-semibold transition flex items-center gap-1 disabled:opacity-50"
            >
              {isLoadingLookup ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>{lang === "pl" ? "Pobierz dane" : "Auto-fill"}</span>
            </button>
          </div>
          {lookupFeedback && (
            <p
              className={`mt-2 text-[11px] font-medium ${
                lookupFeedback.startsWith("✓") ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {lookupFeedback}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs text-gray-400">
                {lang === "pl" ? "Numer ISBN (10 lub 13 cyfr)" : "ISBN-13 (10 or 13 digits)"}
              </label>
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-400 hover:text-brand-300 transition"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{lang === "pl" ? "Skanuj aparatem" : "Scan with camera"}</span>
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={isbn}
                onChange={(e) => { setIsbn(e.target.value); setMetadata({}); }}
                placeholder="np. 9788375780635"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 pr-24 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="absolute right-1.5 top-1.5 bottom-1.5 px-2.5 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-xs font-medium flex items-center gap-1 transition"
                title={lang === "pl" ? "Uruchom skaner kodów kreskowych" : "Open camera scanner"}
              >
                <Camera className="w-3.5 h-3.5 text-brand-400" />
                <span>Skaner</span>
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {lang === "pl" ? "Tytuł dzieła / tomu" : "Book title"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Ostatnie życzenie"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {lang === "pl" ? "Autor" : "Author"}
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="np. Andrzej Sapkowski"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {lang === "pl" ? "Cykl / Seria" : "Series / Cycle"}
            </label>
            <input
              type="text"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              placeholder="np. Saga o Wiedźminie"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {lang === "pl" ? "Typ oprawy" : "Binding format"}
              </label>
              <select
                value={formatType}
                onChange={(e) => setFormatType(e.target.value as BindingFormat)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="hardcover">📖 Twarda oprawa (Hardcover)</option>
                <option value="paperback">📕 Miękka oprawa (Paperback)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {lang === "pl" ? "Status pozycji" : "Reading status"}
              </label>
              <select
                value={readingStatus}
                onChange={(e) => setReadingStatus(e.target.value as ReadingStatus)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
              >
                <option value="unread">{lang === "pl" ? "Nieprzeczytana" : "Unread"}</option>
                <option value="reading">{lang === "pl" ? "📖 W trakcie czytania" : "📖 Currently reading"}</option>
                <option value="read">{lang === "pl" ? "✓ Przeczytana" : "✓ Read"}</option>
                <option value="wishlist">{lang === "pl" ? "⭐ Lista życzeń (Wishlist)" : "⭐ Wishlist"}</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition"
            >
              {lang === "pl" ? "Anuluj" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg text-sm transition shadow-md shadow-brand-900/40"
            >
              {lang === "pl" ? "Dodaj do bazy" : "Add to catalog"}
            </button>
          </div>
        </form>

        {/* Camera Barcode Scanner Modal */}
        {showScanner && (
          <BarcodeScannerModal
            lang={lang}
            onClose={() => setShowScanner(false)}
            onDetected={(scannedIsbn) => {
              setIsbn(scannedIsbn);
              setShowScanner(false);
              // Trigger automatic lookup immediately after barcode detected
              setTimeout(() => {
                fetch(`/api/books/lookup?isbn=${encodeURIComponent(scannedIsbn)}`)
                  .then((res) => res.json())
                  .then((json) => {
                    if (json && json.data) {
                      const b = json.data;
          setMetadata({ cover: b.coverUrl, publisher: b.publisher, publicationYear: b.publicationYear });
                      setTitle(b.title || "");
                      setAuthor(b.author || "");
                      setFormatType(b.formatType || "hardcover");
                      setLookupFeedback(
                        `✓ Zeskanowano kod kreskowy! Pobrano dane: ${b.publisher || ""} (${b.publicationYear || ""})`
                      );
                    }
                  })
                  .catch(() => {
                    setLookupFeedback(`✓ Zeskanowano kod: ${scannedIsbn}. Uzupełnij pozostałe pola.`);
                  });
              }, 150);
            }}
          />
        )}
      </div>
    </div>
  );
};