"use client";

import React, { useState } from "react";
import { Series, Book, FormatFilter, StatusFilter, Language, UserAccount, ReadingStatus } from "@/types";
import { authorsDatabase } from "@/data/mockData";
import { SeriesCard } from "./SeriesCard";
import { ChevronDown, ChevronUp, Library } from "lucide-react";

interface AuthorSectionProps {
  authorName: string;
  seriesList: Series[];
  currentUser: UserAccount | null;
  formatFilter: FormatFilter;
  statusFilter: StatusFilter;
  lang: Language;
  showHidden?: boolean;
  collapsedSeriesIds: Set<string>;
  onToggleSeriesCollapse: (seriesId: string) => void;
  onOpenBookModal: (book: Book, series: Series) => void;
  onOpenAuthorModal: (authorName: string) => void;
  onOpenAuthorSearch?: (authorName: string) => void;
  onToggleOwned: (bookId: string, defaultEditionId: string) => void;
  onUpdateReadingStatus?: (bookId: string, status: ReadingStatus) => void;
  onToggleHideBook?: (bookId: string) => void;
  onToggleHideSeries?: (seriesId: string) => void;
}

export const AuthorSection: React.FC<AuthorSectionProps> = ({
  authorName,
  seriesList,
  currentUser,
  formatFilter,
  statusFilter,
  lang,
  showHidden = false,
  collapsedSeriesIds,
  onToggleSeriesCollapse,
  onOpenBookModal,
  onOpenAuthorModal,
  onOpenAuthorSearch,
  onToggleOwned,
  onUpdateReadingStatus,
  onToggleHideBook,
  onToggleHideSeries,
}) => {
  const [isAuthorCollapsed, setIsAuthorCollapsed] = useState(false);
  const authorData = authorsDatabase[authorName];

  // Calculate author-level statistics
  let totalBooks = 0;
  let ownedBooks = 0;

  seriesList.forEach((s) => {
    s.books.forEach((b) => {
      const isHidden = Boolean(currentUser?.hiddenBooks?.[b.id]);
      if (!showHidden && isHidden) return;
      totalBooks++;
      if (currentUser?.ownedBooks && currentUser.ownedBooks[b.id]) {
        ownedBooks++;
      }
    });
  });

  const percent = totalBooks > 0 ? Math.round((ownedBooks / totalBooks) * 100) : 0;
  const isComplete = totalBooks > 0 && percent === 100;

  return (
    <section className="rounded-3xl border border-gray-800 bg-gray-950/40 p-4 sm:p-6 shadow-2xl space-y-4 transition-all hover:border-gray-700/80">
      {/* Level 1: Author Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-800/80">
        <div className="flex items-center gap-3.5">
          {authorData?.avatar ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={authorData.avatar}
              alt={authorName}
              className="w-13 h-13 rounded-2xl object-cover border-2 border-brand-500/40 shadow-md"
            />
          ) : (
            <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-600 flex items-center justify-center text-white font-bold text-lg shadow-lg border border-brand-400/30">
              {authorName.substring(0, 1)}
            </div>
          )}

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-300 border border-brand-500/30">
                {lang === "pl" ? "Autor" : "Author"}
              </span>
              <h2
                onClick={() => onOpenAuthorModal(authorName)}
                className="text-xl sm:text-2xl font-bold font-serif text-white hover:text-brand-300 cursor-pointer transition flex items-center gap-2"
                title={lang === "pl" ? "Zobacz pełny profil i biografię" : "View profile"}
              >
                <span>{authorName}</span>
              </h2>
            </div>
            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5 max-w-xl">
              {authorData?.bio || (lang === "pl" ? "Pisarz i twórca literatury" : "Author & Creator")}
            </p>
          </div>
        </div>

        {/* Author Stats & Toggle Actions */}
        <div className="flex flex-wrap items-center gap-3 justify-between sm:justify-end">
          {/* Progress Pill */}
          <div className="flex items-center gap-2.5 bg-gray-900/80 px-3.5 py-1.5 rounded-xl border border-gray-800 text-xs">
            <span className="text-gray-400 font-medium">
              {lang === "pl" ? "Na półce:" : "Collected:"}
            </span>
            <span className="font-bold text-white font-mono">
              {ownedBooks}/{totalBooks} ({percent}%)
            </span>
            <div className="w-16 sm:w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isComplete ? "bg-emerald-500" : "bg-gradient-to-r from-brand-500 to-amber-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Quick link to load more books of this author */}
          {onOpenAuthorSearch && (
            <button
              onClick={() => onOpenAuthorSearch(authorName)}
              className="px-2.5 py-1.5 rounded-xl bg-gray-800 hover:bg-brand-900/40 text-gray-300 hover:text-brand-300 border border-gray-700/60 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
              title={lang === "pl" ? "Pobierz więcej książek tego autora z BN" : "Fetch more books"}
            >
              <Library className="w-3.5 h-3.5 text-brand-400" />
              <span className="hidden md:inline">{lang === "pl" ? "Pobierz dzieła" : "Fetch books"}</span>
            </button>
          )}

          {/* Collapse/Expand entire author */}
          <button
            onClick={() => setIsAuthorCollapsed((prev) => !prev)}
            className="p-2 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700/60 transition flex items-center gap-1.5 text-xs font-semibold cursor-pointer shadow-sm"
            title={isAuthorCollapsed ? (lang === "pl" ? "Rozwiń autora" : "Expand author") : (lang === "pl" ? "Zwiń autora" : "Collapse author")}
          >
            <span className="hidden sm:inline">
              {isAuthorCollapsed ? (lang === "pl" ? "Rozwiń" : "Expand") : (lang === "pl" ? "Zwiń" : "Collapse")}
            </span>
            {isAuthorCollapsed ? (
              <ChevronDown className="w-4 h-4 text-brand-400" />
            ) : (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Level 2 & 3: Series and Books under this Author */}
      {!isAuthorCollapsed && (
        <div className="space-y-4 pt-1 pl-1 sm:pl-3 border-l-2 border-brand-500/20">
          {seriesList.map((series) => (
            <SeriesCard
              key={series.seriesId}
              series={series}
              currentUser={currentUser}
              formatFilter={formatFilter}
              statusFilter={statusFilter}
              lang={lang}
              showHidden={showHidden}
              isCollapsed={collapsedSeriesIds.has(series.seriesId)}
              onToggleCollapse={() => onToggleSeriesCollapse(series.seriesId)}
              onOpenBookModal={onOpenBookModal}
              onOpenAuthorModal={onOpenAuthorModal}
              onToggleOwned={onToggleOwned}
              onUpdateReadingStatus={onUpdateReadingStatus}
              onToggleHideBook={onToggleHideBook}
              onToggleHideSeries={onToggleHideSeries}
            />
          ))}
        </div>
      )}
    </section>
  );
};
