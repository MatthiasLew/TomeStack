"use client";

import React, { useState, useMemo } from "react";
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
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFailedAll, setHasFailedAll] = useState(false);

  const cleanIsbn = isbn?.replace(/[^0-9X]/gi, "");

  // Build unique candidate cover URLs
  const candidateUrls = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();

    const add = (u?: string) => {
      if (!u || seen.has(u) || u.includes("unsplash.com")) return;
      seen.add(u);
      urls.push(u);
    };

    add(src);
    if (cleanIsbn) {
      add(`https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg?default=false`);
      add(`https://books.google.com/books/content?vid=isbn${cleanIsbn}&printsec=frontcover&img=1&zoom=1`);
      add(`https://covers.openlibrary.org/b/isbn/${cleanIsbn}-M.jpg?default=false`);
    }

    return urls;
  }, [src, cleanIsbn]);

  const currentUrl = candidateUrls[candidateIndex];

  const handleImgError = () => {
    if (candidateIndex + 1 < candidateUrls.length) {
      setCandidateIndex((prev) => prev + 1);
    } else {
      setHasFailedAll(true);
    }
  };

  const handleImgLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div className={`relative w-full h-full overflow-hidden select-none bg-slate-950 ${className}`}>
      {/* 1. Base Layer: Always-rendered Luxury Hardcover Typographic Cover */}
      <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-slate-900 via-gray-900 to-brand-950/70 p-3.5 flex flex-col justify-between items-center text-center border-l-2 border-brand-500/30 shadow-inner">
        {/* Top Ornament */}
        <div className="w-full flex items-center justify-between opacity-50 text-[8px] font-mono tracking-widest text-brand-400">
          <span>◆</span>
          <span className="uppercase">TOMESTACK</span>
          <span>◆</span>
        </div>

        {/* Center Title & Emblem */}
        <div className="my-auto px-1 flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-500/15 text-brand-400 flex items-center justify-center border border-brand-500/30 shadow-sm">
            <BookOpen className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold font-serif text-gray-100 line-clamp-3 leading-snug tracking-wide">
            {title}
          </p>
        </div>

        {/* Bottom Spine Details */}
        <div className="w-full pt-1.5 border-t border-gray-800/80 flex items-center justify-between text-[9px] text-gray-400 font-mono">
          <span className="text-[8px] text-brand-400/80">CANON</span>
          <span>{cleanIsbn ? `#${cleanIsbn.slice(-4)}` : "EDITION"}</span>
        </div>
      </div>

      {/* 2. Dynamic Image Layer: Smoothly fades in once fully downloaded and validated */}
      {!hasFailedAll && currentUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={currentUrl}
          alt=""
          aria-hidden="true"
          loading="lazy"
          onLoad={handleImgLoad}
          onError={handleImgError}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isLoaded ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        />
      )}
    </div>
  );
};
