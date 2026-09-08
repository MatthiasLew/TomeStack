"use client";

import React from "react";
import { BookOpen, CheckCircle2, Target, TrendingUp } from "lucide-react";
import { Language } from "@/types";
import { translations } from "@/data/mockData";

interface StatsCardsProps {
  totalBooks: number;
  ownedBooks: number;
  missingBooks: number;
  avgCompletion: number;
  lang: Language;
}

export const StatsCards: React.FC<StatsCardsProps> = ({
  totalBooks,
  ownedBooks,
  missingBooks,
  avgCompletion,
  lang,
}) => {
  const t = translations[lang];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="card-glass p-4 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            {t.statTotal}
          </p>
          <p className="text-2xl font-bold text-white mt-1">{totalBooks}</p>
        </div>
        <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg text-xl">
          <BookOpen className="w-6 h-6" />
        </div>
      </div>

      <div className="card-glass p-4 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            {t.statOwned}
          </p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{ownedBooks}</p>
        </div>
        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg text-xl">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      </div>

      <div className="card-glass p-4 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            {t.statMissing}
          </p>
          <p className="text-2xl font-bold text-rose-400 mt-1">{missingBooks}</p>
        </div>
        <div className="p-3 bg-rose-500/10 text-rose-400 rounded-lg text-xl">
          <Target className="w-6 h-6" />
        </div>
      </div>

      <div className="card-glass p-4 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
            {t.statAvg}
          </p>
          <p className="text-2xl font-bold text-amber-400 mt-1">{avgCompletion}%</p>
        </div>
        <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg text-xl">
          <TrendingUp className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};