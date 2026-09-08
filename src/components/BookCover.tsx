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

  // Priority 1: provided explicit cover url (if not an old unsplash placeholder or failed)
  // Priority 2: Open Library high-res CDN
  // Priority 3: Open Library medium-res CDN
  const candidateUrls: string[] = [];

  if (src && !src.includes("unsplash.com")) {
    candidateUrls.push(src);
  }
  if (cleanIsbn) {
    candidateUrls.push(`https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`);
    candidateUrls.push(`https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg`);
  }
  if (src && src.includes("unsplash.com")) {
    candidateUrls.push(src);
  }

  const currentUrl = candidateUrls[errorCount];

  if (!currentUrl || errorCount >= candidateUrls.length) {
    // Elegant typographic book cover fallback with rich gradient
    return (
      <div className={`w-full h-full bg-gradient-to-br from-gray-900 via-slate-800 to-brand-950 p-3 flex flex-col justify-between items-center text-center select-none border border-gray-800 ${className}`}>
        <div className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center mt-2">
          <BookOpen className="w-4 h-4" />
        </div>
        <p className="text-xs font-bold font-serif text-gray-200 line-clamp-3 leading-snug px-1">
          {title}
        </p>
        <span className="text-[9px] uppercase tracking-wider text-brand-400/80 font-mono">
          TomeStack
        </span>
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
