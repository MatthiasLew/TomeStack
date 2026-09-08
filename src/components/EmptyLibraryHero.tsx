"use client";

import React, { useState } from "react";
import { Language } from "@/types";
import { Library, Search, Loader2 } from "lucide-react";

interface EmptyLibraryHeroProps {
  lang: Language;
  onImportAuthor: (author: string) => Promise<void>;
  onOpenAuthorSearch: (initialQuery?: string) => void;
  onLoadDemoData: () => void;
  loadingAuthor?: string | null;
}

const POPULAR_AUTHORS = [
  "George Orwell",
  "Stanisław Lem",
  "Stephen King",
  "J.R.R. Tolkien",
  "Andrzej Sapkowski",
  "Remigiusz Mróz",
];

export const EmptyLibraryHero: React.FC<EmptyLibraryHeroProps> = ({
  lang,
  onImportAuthor,
  onOpenAuthorSearch,
  onLoadDemoData,
  loadingAuthor,
}) => {
  const [quickInput, setQuickInput] = useState("");

  const handleImport = () => {
    if (quickInput.trim()) {
      onImportAuthor(quickInput.trim());
    }
  };

  const handleBrowse = () => {
    if (quickInput.trim()) {
      onOpenAuthorSearch(quickInput.trim());
    }
  };

  return (
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
      <div className="max-w-md mx-auto flex flex-wrap gap-2">
        <input
          type="text"
          value={quickInput}
          onChange={(e) => setQuickInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && quickInput.trim()) {
              handleImport();
            }
          }}
          placeholder={lang === "pl" ? "Wpisz autora (np. George Orwell)..." : "Enter author name..."}
          className="flex-1 px-4 py-3 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-brand-500 transition"
        />
        <button
          onClick={handleImport}
          disabled={Boolean(loadingAuthor && loadingAuthor === quickInput.trim())}
          className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-brand-600 hover:from-amber-500 hover:to-brand-500 text-white text-xs sm:text-sm font-bold transition flex items-center gap-1.5 shadow-lg shadow-brand-900/40 cursor-pointer shrink-0"
          title={lang === "pl" ? "Wczytaj dostępne książki autora" : "Import all books"}
        >
          {loadingAuthor === quickInput.trim() ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <span>?</span>
          )}
          <span>{lang === "pl" ? "Dodaj książki" : "Import all"}</span>
        </button>
        <button
          onClick={handleBrowse}
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
            ? "? Kliknij autora, aby od razu załadować wszystkie jego książki do śledzenia:"
            : "? Click an author to instantly track all their books:"}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {POPULAR_AUTHORS.map((author) => (
            <button
              key={author}
              onClick={() => onImportAuthor(author)}
              disabled={loadingAuthor === author}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-gray-800/90 hover:bg-brand-600 text-gray-200 hover:text-white border border-gray-700 hover:border-brand-500 transition cursor-pointer flex items-center gap-1.5 shadow"
              title={lang === "pl" ? `Wczytaj dostępne książki ${author}` : `Load all books by ${author}`}
            >
              {loadingAuthor === author ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <span>??</span>
              )}
              <span>{author}</span>
              <span className="text-[10px] text-brand-300 font-extrabold ml-1">
                {loadingAuthor === author ? "..." : "+ Wszystkie tomy"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-gray-800/80 flex items-center justify-center gap-4 text-xs text-gray-500">
        <span>{lang === "pl" ? "Chcesz zobaczyć przykładowe dane?" : "Want to see sample data?"}</span>
        <button
          onClick={onLoadDemoData}
          className="text-brand-400 hover:text-brand-300 font-semibold underline underline-offset-4 cursor-pointer"
        >
          {lang === "pl" ? "Załaduj kolekcję demonstracyjną" : "Load demo collection"}
        </button>
      </div>
    </div>
  );
};
