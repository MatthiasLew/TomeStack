"use client";

import React from "react";
import { UserAccount, Language } from "@/types";
import { translations } from "@/data/mockData";

interface UserBannerProps {
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
  lang: Language;
}

export const UserBanner: React.FC<UserBannerProps> = ({
  currentUser,
  onOpenAuth,
  lang,
}) => {
  return (
    <div className="border-b border-gray-800/80 bg-gray-950/40 py-2.5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">👤</span>
          <span className="text-gray-400 font-medium">
            {lang === "pl" ? "Twoja biblioteczka:" : "Your bookshelf:"}
          </span>
          <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
            {currentUser ? currentUser.name : lang === "pl" ? "Konto niezalogowane" : "Not logged in"}
          </span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${
              currentUser
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/20 text-amber-400 border-amber-500/30"
            }`}
          >
            {currentUser
              ? lang === "pl"
                ? "☁️ Synchronizacja z chmurą"
                : "☁️ Cloud Synced"
              : lang === "pl"
              ? "🔒 Wymagane logowanie"
              : "🔒 Login required"}
          </span>
        </div>

        <div>
          {!currentUser ? (
            <button
              onClick={onOpenAuth}
              className="px-3 py-1 rounded-lg bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs transition shadow"
            >
              {lang === "pl" ? "Zaloguj się do swojej biblioteki" : "Sign in to your library"}
            </button>
          ) : (
            <span className="text-gray-400 text-xs">
              {lang === "pl" ? "Wszystkie zmiany zapisują się na Twoim koncie" : "All changes saved to your account"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export const GuestAlertBanner: React.FC<{
  onOpenAuth: () => void;
  lang: Language;
}> = ({ onOpenAuth, lang }) => {
  const t = translations[lang];

  return (
    <div className="bg-amber-950/30 border-b border-amber-800/40 py-2.5 px-4 text-xs text-center text-amber-300">
      <span>{t.guestWarning} </span>
      <button
        onClick={onOpenAuth}
        className="font-bold underline text-amber-200 hover:text-white ml-1"
      >
        {t.guestAction}
      </button>
      <span>{t.guestSuffix}</span>
    </div>
  );
};