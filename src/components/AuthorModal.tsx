"use client";

import React from "react";
import { Author, Series, Book, Language, UserAccount } from "@/types";
import { translations } from "@/data/mockData";
import { X, BookOpen } from "lucide-react";

interface AuthorModalProps {
  author: Author;
  seriesList: Series[];
  currentUser: UserAccount | null;
  lang: Language;
  onClose: () => void;
  onOpenBook: (book: Book, series: Series) => void;
}

export const AuthorModal: React.FC<AuthorModalProps> = ({
  author,
  seriesList,
  currentUser,
  lang,
  onClose,
  onOpenBook,
}) => {
  const t = translations[lang];

  // Calculate author total books and owned books
  let totalAuthorBooks = 0;
  let ownedAuthorBooks = 0;

  author.series.forEach((sRef) => {
    sRef.bookIds.forEach((bId) => {
      totalAuthorBooks++;
      if (currentUser?.ownedBooks && currentUser.ownedBooks[bId]) {
        ownedAuthorBooks++;
      }
    });
  });

  const authorPercent =
    totalAuthorBooks > 0 ? Math.round((ownedAuthorBooks / totalAuthorBooks) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Author Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gradient-to-r from-gray-950 to-gray-900">
          <div className="flex items-center gap-4">
            {author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatar}
                alt={author.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-brand-500 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-700 via-brand-900 to-gray-950 border border-brand-500/40 flex items-center justify-center text-xl font-bold font-serif text-brand-200 shadow-lg tracking-wider shrink-0">
                {author.name
                  .split(" ")
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()}
              </div>
            )}
            <div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-brand-500/20 text-brand-400 uppercase tracking-wider">
                Autor / Author
              </span>
              <h2 className="text-2xl font-serif font-bold text-white mt-0.5">
                {author.name}
              </h2>
              <p className="text-xs text-gray-300 mt-1">
                Posiadasz:{" "}
                <span className="font-bold text-emerald-400">
                  {ownedAuthorBooks}/{totalAuthorBooks} tomów ({authorPercent}%)
                </span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-800 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Bio & Bibliography */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <p className="text-sm text-gray-300 bg-gray-950/40 p-4 rounded-xl border border-gray-800">
            {author.bio}
          </p>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-300">
              {t.authorBiblio}
            </h3>
            <span className="text-xs text-gray-500">Kliknij książkę, by sprawdzić wydania</span>
          </div>

          <div className="space-y-6">
            {author.series.map((sRef) => {
              const matchedSeries = seriesList.find((s) => s.seriesId === sRef.seriesId);
              const booksInSeries =
                matchedSeries?.books.filter((b) => sRef.bookIds.includes(b.id)) || [];

              return (
                <div key={sRef.seriesId} className="space-y-3">
                  <h4 className="text-base font-bold font-serif text-white flex items-center gap-2 border-b border-gray-800 pb-2">
                    <BookOpen className="w-4 h-4 text-brand-400" />
                    <span>{sRef.name}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {booksInSeries.map((book) => {
                      const isOwned = Boolean(
                        currentUser?.ownedBooks && currentUser.ownedBooks[book.id]
                      );

                      return (
                        <div
                          key={book.id}
                          onClick={() => {
                            if (matchedSeries) {
                              onClose();
                              onOpenBook(book, matchedSeries);
                            }
                          }}
                          className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between gap-3 ${
                            isOwned
                              ? "bg-gray-950/60 border-emerald-900/40 hover:border-emerald-500"
                              : "bg-gray-950/30 border-gray-800 hover:border-brand-500"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={book.cover}
                              alt={book.title}
                              className="w-10 h-14 object-cover rounded shadow"
                            />
                            <div>
                              <p className="text-xs font-bold text-white line-clamp-1">
                                #{book.volume} {book.title}
                              </p>
                              <span className="text-[10px] text-gray-400">
                                {book.formatType === "hardcover" ? "📖 Twarda" : "📕 Miękka"}
                              </span>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              isOwned
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            }`}
                          >
                            {isOwned ? "✓ Na półce" : "✗ Brak"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium transition"
          >
            {t.closeBtn}
          </button>
        </div>
      </div>
    </div>
  );
};