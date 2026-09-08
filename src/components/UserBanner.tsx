"use client";

import React from "react";
import { UserAccount, Language } from "@/types";
import { translations } from "@/data/mockData";

interface UserBannerProps {
  currentUser: UserAccount | null;
  onSwitchUser: (userId: string) => void;
  lang: Language;
}

export const UserBanner: React.FC<UserBannerProps> = ({
  currentUser,
  onSwitchUser,
  lang,
}) => {
  const isKamil = currentUser?.id === "kamil";
  const isAnna = currentUser?.id === "anna";
  const isGuest = currentUser === null;

  return (
    <div className="border-b border-gray-800/80 bg-gray-950/40 py-2.5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-base">👤</span>
          <span className="text-gray-400 font-medium">
            {lang === "pl" ? "Aktywna biblioteczka:" : "Active bookshelf:"}
          </span>
          <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded border border-gray-700">
            {currentUser ? currentUser.name : lang === "pl" ? "Gość (Wylogowany)" : "Guest (Logged out)"}
          </span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${
              currentUser
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : "bg-gray-800 text-gray-400 border-gray-700"
            }`}
          >
            {currentUser
              ? lang === "pl"
                ? "Prywatna półka"
                : "Private shelf"
              : lang === "pl"
              ? "Tylko odczyt"
              : "Read-only"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-gray-400 hidden sm:inline">
            {lang === "pl" ? "Szybkie przełączanie kont demonstracyjnych:" : "Quick demo account switcher:"}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSwitchUser("kamil")}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                isKamil
                  ? "bg-brand-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              👤 Kamil (Fantasy)
            </button>
            <button
              onClick={() => onSwitchUser("anna")}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                isAnna
                  ? "bg-brand-600 text-white"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              👤 Anna (Potter & Tolkien)
            </button>
            <button
              onClick={() => onSwitchUser("guest")}
              className={`px-2 py-1 rounded text-xs font-semibold transition ${
                isGuest
                  ? "bg-brand-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              👁️ {lang === "pl" ? "Gość" : "Guest"}
            </button>
          </div>
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