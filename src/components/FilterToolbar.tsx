"use client";

import React from "react";
import { FormatFilter, StatusFilter, ActiveTab, Language } from "@/types";
import { translations } from "@/data/mockData";
import { Layers, Target, Library } from "lucide-react";

interface FilterToolbarProps {
  formatFilter: FormatFilter;
  onSetFormatFilter: (fmt: FormatFilter) => void;
  statusFilter: StatusFilter;
  onSetStatusFilter: (st: StatusFilter) => void;
  activeTab: ActiveTab;
  onSetActiveTab: (tab: ActiveTab) => void;
  lang: Language;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  formatFilter,
  onSetFormatFilter,
  statusFilter,
  onSetStatusFilter,
  activeTab,
  onSetActiveTab,
  lang,
}) => {
  const t = translations[lang];

  return (
    <div className="card-glass rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
      {/* Format Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-1">
          {t.filterFormatLabel}
        </span>
        <button
          onClick={() => onSetFormatFilter("all")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
            formatFilter === "all"
              ? "bg-brand-600 text-white shadow"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {t.filterAll}
        </button>
        <button
          onClick={() => onSetFormatFilter("hardcover")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
            formatFilter === "hardcover"
              ? "bg-brand-600 text-white shadow"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          <span>📖</span>
          <span>{t.hardcover}</span>
        </button>
        <button
          onClick={() => onSetFormatFilter("paperback")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
            formatFilter === "paperback"
              ? "bg-brand-600 text-white shadow"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          <span>📕</span>
          <span>{t.paperback}</span>
        </button>

        <span className="text-gray-600 mx-1 hidden sm:inline">|</span>

        {/* Status Filter */}
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-1 hidden sm:inline">
          {t.filterStatusLabel}
        </span>
        <button
          onClick={() => onSetStatusFilter("all")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
            statusFilter === "all"
              ? "bg-brand-600 text-white shadow"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          {lang === "pl" ? "Wszystkie" : "All"}
        </button>
        <button
          onClick={() => onSetStatusFilter("owned")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
            statusFilter === "owned"
              ? "bg-emerald-600 text-white shadow"
              : "bg-gray-800 text-emerald-400 hover:bg-gray-700"
          }`}
        >
          <span>✅</span>
          <span>{lang === "pl" ? "Posiadane" : "Owned"}</span>
        </button>
        <button
          onClick={() => onSetStatusFilter("missing")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
            statusFilter === "missing"
              ? "bg-rose-600 text-white shadow"
              : "bg-gray-800 text-rose-400 hover:bg-gray-700"
          }`}
        >
          <span>🎯</span>
          <span>{lang === "pl" ? "Tylko braki" : "Missing only"}</span>
        </button>
        <button
          onClick={() => onSetStatusFilter("reading")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
            statusFilter === "reading"
              ? "bg-amber-500 text-black font-bold shadow"
              : "bg-gray-800 text-amber-400 hover:bg-gray-700"
          }`}
        >
          <span>📖</span>
          <span>{lang === "pl" ? "Czytane" : "Reading"}</span>
        </button>
        <button
          onClick={() => onSetStatusFilter("read")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1 ${
            statusFilter === "read"
              ? "bg-emerald-600 text-white shadow"
              : "bg-gray-800 text-emerald-300 hover:bg-gray-700"
          }`}
        >
          <span>🎓</span>
          <span>{lang === "pl" ? "Przeczytane" : "Finished"}</span>
        </button>
      </div>

      {/* View Tabs Switcher */}
      <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-800">
        <button
          onClick={() => onSetActiveTab("series")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === "series"
              ? "bg-brand-600 text-white shadow"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{t.tabSeries}</span>
        </button>
        <button
          onClick={() => onSetActiveTab("missing")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === "missing"
              ? "bg-rose-600 text-white shadow"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>{t.tabMissing}</span>
        </button>
        <button
          onClick={() => onSetActiveTab("all")}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition flex items-center gap-1.5 ${
            activeTab === "all"
              ? "bg-brand-600 text-white shadow"
              : "text-gray-400 hover:text-white"
          }`}
        >
          <Library className="w-3.5 h-3.5" />
          <span>{t.tabAll}</span>
        </button>
      </div>
    </div>
  );
};