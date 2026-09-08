"use client";

import React from "react";
import { BookOpen, Search, Plus, User, LogOut, Camera, Library } from "lucide-react";
import { UserAccount, Language } from "@/types";
import { translations } from "@/data/mockData";

interface NavbarProps {
  lang: Language;
  onToggleLang: () => void;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenAddBook: () => void;
  onOpenScanner?: () => void;
  onOpenAuthorSearch?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  lang,
  onToggleLang,
  currentUser,
  onOpenAuth,
  onLogout,
  onOpenAddBook,
  onOpenScanner,
  onOpenAuthorSearch,
  searchQuery,
  onSearchChange,
}) => {
  const t = translations[lang];

  return (
    <header className="sticky top-0 z-30 border-b border-gray-800/80 bg-gray-950/85 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-16 py-2 flex flex-wrap items-center justify-between gap-2">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-brand-900/40">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>TomeStack</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-400 font-semibold border border-brand-500/30">
                v2.2 React
              </span>
            </h1>
            <p className="text-xs text-gray-400 hidden sm:block">{t.subheader}</p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim() && onOpenAuthorSearch) {
                  onOpenAuthorSearch();
                }
              }}
              placeholder={lang === "pl" ? "Szukaj autora lub tomu (Enter = szukaj online)..." : "Search author or book (Enter = search online)..."}
              className="w-full bg-gray-900/90 border border-gray-700/80 rounded-lg pl-10 pr-16 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
            />
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-500" />
            {searchQuery && onOpenAuthorSearch && (
              <button
                type="button"
                onClick={onOpenAuthorSearch}
                className="absolute right-2 top-2 px-2 py-0.5 rounded bg-brand-600 hover:bg-brand-500 text-[10px] font-bold text-white transition shadow cursor-pointer"
                title={lang === "pl" ? "Przeszukaj bazę online (BN & Open Library)" : "Search online"}
              >
                Szukaj
              </button>
            )}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Barcode Scanner Button */}
          {onOpenScanner && (
            <button
              onClick={onOpenScanner}
              title={lang === "pl" ? "Skaner kodów kreskowych" : "Barcode camera scanner"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-500/30 bg-brand-950/40 hover:bg-brand-900/50 text-xs font-semibold text-brand-300 transition shadow cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden sm:inline">
                {lang === "pl" ? "Skanuj ISBN" : "Scan ISBN"}
              </span>
            </button>
          )}

          {/* Search Author Books via API Button */}
          {onOpenAuthorSearch && (
            <button
              onClick={onOpenAuthorSearch}
              title={lang === "pl" ? "Szukaj autora i dodaj książki z API" : "Search author and import books from API"}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-950/40 hover:bg-purple-900/50 text-xs font-semibold text-purple-300 transition shadow cursor-pointer"
            >
              <Library className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">
                {lang === "pl" ? "Szukaj autora" : "Author Search"}
              </span>
            </button>
          )}

          {/* Language Switcher */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-xs font-semibold text-gray-300 transition"
          >
            <span>{lang === "pl" ? "🇬🇧" : "🇵🇱"}</span>
            <span>{lang === "pl" ? "English" : "Polski"}</span>
          </button>

          {/* User Auth */}
          {currentUser ? (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenAuth}
                className="flex items-center gap-2 p-1 rounded-lg hover:bg-gray-800/80 transition"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-8 h-8 rounded-full object-cover border border-brand-500 shadow"
                />
                <div className="hidden lg:block text-left leading-tight">
                  <p className="text-xs font-bold text-white truncate max-w-[90px]">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-brand-400 font-medium">TomeStack</p>
                </div>
              </button>
              <button
                onClick={onLogout}
                title={t.logoutBtn}
                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-gray-800 transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-500/40 bg-brand-600/20 hover:bg-brand-600/30 text-xs font-semibold text-brand-300 transition"
            >
              <User className="w-3.5 h-3.5" />
              <span>{t.loginBtn}</span>
            </button>
          )}

          {/* Add Book Button */}
          <button
            onClick={onOpenAddBook}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-md shadow-brand-900/40"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t.addBookBtn}</span>
          </button>
        </div>
      </div>
    </header>
  );
};