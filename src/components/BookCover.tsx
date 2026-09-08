"use client";

import React, { useState } from "react";
import { BookOpen } from "lucide-react";

interface BookCoverProps {
  src?: string;
  isbn?: string;
  title: string;
  className?: string;
  priority?: boolean;
}

export const BookCover: React.FC<BookCoverProps> = ({
  src,
  isbn,
  title,
  className = "w-full h-full object-cover",
}) => {
  const [errorCount, setErrorCount] = useState(0);

  // Generate primary and fallback URLs
  const cleanIsbn = isbn?.replace(/[^0-9X]/gi, "");

  const candidateUrls: string[] = [];

  // Priority 1: Explicitly provided valid cover (ignoring legacy unsplash placeholders)
  if (src && !src.includes("unsplash.com")) {
    candidateUrls.push(src);
  }

  // Priority 2: Open Library Large cover CDN with default=false (triggers 404 when missing instead of blank 1x1 gif)
  if (cleanIsbn) {
    candidateUrls.push(`https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg?default=false`);
    // Priority 3: Google Books dynamic cover CDN
    candidateUrls.push(`https://books.google.com/books/content?vid=isbn${cleanIsbn}&printsec=frontcover&img=1&zoom=1`);
    // Priority 4: Open Library Medium cover CDN
    candidateUrls.push(`https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg?default=false`);
  }

  const currentUrl = candidateUrls[errorCount];

  if (!currentUrl || errorCount >= candidateUrls.length) {
    // High-quality typographic hardcover spine & cover fallback
    return (
      <div
        className={`w-full h-full bg-gradient-to-br from-slate-900 via-gray-900 to-brand-950 p-3.5 flex flex-col justify-between items-center text-center select-none border border-gray-800 shadow-inner ${className}`}
      >
        <div className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-400 flex items-center justify-center mt-1 border border-brand-500/20">
          <BookOpen className="w-4 h-4" />
        </div>
        <div className="my-auto px-1">
          <p className="text-xs font-bold font-serif text-gray-100 line-clamp-3 leading-snug">
            {title}
          </p>
        </div>
        <div className="w-full pt-1.5 border-t border-gray-800/80 flex items-center justify-between text-[9px] text-gray-500 font-mono">
          <span>TOMESTACK</span>
          <span>{cleanIsbn ? `#${cleanIsbn.slice(-4)}` : "EDITION"}</span>
        </div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentUrl}
      alt={title}
      loading="lazy"
      onError={() => setErrorCount((prev) => prev + 1)}
      className={className}
    />
  );
};
