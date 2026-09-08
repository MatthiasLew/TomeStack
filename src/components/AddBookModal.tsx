"use client";

import React, { useState } from "react";
import { BindingFormat, Language } from "@/types";
import { X, BookOpen, Search, Loader2 } from "lucide-react";

interface AddBookModalProps {
  lang: Language;
  onClose: () => void;
  onAddBook: (bookData: {
    title: string;
    author: string;
    series: string;
    formatType: BindingFormat;
    isbn?: string;
  }) => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({
  lang,
  onClose,
  onAddBook,
}) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [series, setSeries] = useState("");
  const [formatType, setFormatType] = useState<BindingFormat>("hardcover");
  const [isbn, setIsbn] = useState("");

  // BN Fetch State
  const [isLoadingBn, setIsLoadingBn] = useState(false);
  const [bnFeedback, setBnFeedback] = useState<string | null>(null);

  const handleBnLookup = async () => {
    if (!isbn.trim() && !title.trim()) {
      setBnFeedback("Wpisz najpierw numer ISBN lub tytuł.");
      return;
    }

    setIsLoadingBn(true);
    setBnFeedback(null);

    try {
      if (isbn.trim()) {
        const res = await fetch(`/api/bn/lookup?isbn=${encodeURIComponent(isbn.trim())}`);
        const json = await res.json();

        if (res.ok && json.data) {
          const b = json.data;
          setTitle(b.title || title);
          setAuthor(b.author || author);
          setFormatType(b.formatType || formatType);
          setBnFeedback(`✓ Znaleziono w Bibliotece Narodowej: ${b.publisher} (${b.publicationYear})`);
        } else {
          setBnFeedback("Nie znaleziono pozycji w BN dla tego ISBN.");
        }
      } else if (title.trim()) {
        const res = await fetch(
          `/api/bn/search?title=${encodeURIComponent(title.trim())}&author=${encodeURIComponent(author.trim())}`
        );
        const json = await res.json();

        if (res.ok && json.data && json.data.length > 0) {
          const b = json.data[0];
          setTitle(b.title || title);
          setAuthor(b.author || author);
          if (b.isbn) setIsbn(b.isbn);
          setFormatType(b.formatType || formatType);
          setBnFeedback(`✓ Znaleziono w BN: ${b.publisher} (${b.publicationYear})`);
        } else {
          setBnFeedback("Brak wyników w BN dla tego tytułu.");
        }
      }
    } catch {
      setBnFeedback("Błąd połączenia z API Biblioteki Narodowej.");
    } finally {
      setIsLoadingBn(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    onAddBook({
      title,
      author,
      series: series || (lang === "pl" ? "Książki samodzielne" : "Standalone"),
      formatType,
      isbn,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-400" />
            <h3 className="text-lg font-bold text-white">
              {lang === "pl" ? "Dodaj nową książkę" : "Add new book"}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BN Quick Lookup Section */}
        <div className="my-3 p-3 rounded-xl bg-gradient-to-r from-brand-950/40 to-gray-950/60 border border-brand-500/20 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-brand-300 flex items-center gap-1">
              <span>🏛️ API Biblioteki Narodowej</span>
            </span>
            <button
              type="button"
              onClick={handleBnLookup}
              disabled={isLoadingBn}
              className="px-2.5 py-1 rounded bg-brand-600 hover:bg-brand-500 text-white font-semibold transition flex items-center gap-1 disabled:opacity-50"
            >
              {isLoadingBn ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
              <span>Pobierz dane</span>
            </button>
          </div>
          {bnFeedback && (
            <p
              className={`mt-2 text-[11px] font-medium ${
                bnFeedback.startsWith("✓") ? "text-emerald-400" : "text-amber-400"
              }`}
            >
              {bnFeedback}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {lang === "pl" ? "Numer ISBN (10 lub 13 cyfr)" : "ISBN-13 (10 or 13 digits)"}
            </label>
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="np. 9788375780635"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500 font-mono"
            />
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
      </div>
    </div>
  );
};