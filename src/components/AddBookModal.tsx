"use client";

import React, { useState } from "react";
import { BindingFormat, Language } from "@/types";
import { X, BookOpen } from "lucide-react";

interface AddBookModalProps {
  lang: Language;
  onClose: () => void;
  onAddBook: (bookData: {
    title: string;
    author: string;
    series: string;
    formatType: BindingFormat;
    isbn?: string;
  }) => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({
  lang,
  onClose,
  onAddBook,
}) => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [series, setSeries] = useState("");
  const [formatType, setFormatType] = useState<BindingFormat>("hardcover");
  const [isbn, setIsbn] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !author.trim()) return;

    onAddBook({
      title,
      author,
      series: series || (lang === "pl" ? "Książki samodzielne" : "Standalone"),
      formatType,
      isbn,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-brand-400" />
            <h3 className="text-lg font-bold text-white">
              {lang === "pl" ? "Dodaj nową książkę" : "Add new book"}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {lang === "pl" ? "Tytuł dzieła / tomu" : "Book title"}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Narrenturm"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {lang === "pl" ? "Autor" : "Author"}
            </label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="np. Andrzej Sapkowski"
              required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {lang === "pl" ? "Cykl / Seria" : "Series / Cycle"}
            </label>
            <input
              type="text"
              value={series}
              onChange={(e) => setSeries(e.target.value)}
              placeholder="np. Trylogia Husycka (Tom 1)"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {lang === "pl" ? "Typ oprawy" : "Binding format"}
            </label>
            <select
              value={formatType}
              onChange={(e) => setFormatType(e.target.value as BindingFormat)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            >
              <option value="hardcover">📖 Twarda oprawa (Hardcover)</option>
              <option value="paperback">📕 Miękka oprawa (Paperback)</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-400 block mb-1">
              {lang === "pl" ? "Numer ISBN (opcjonalnie)" : "ISBN-13 (optional)"}
            </label>
            <input
              type="text"
              value={isbn}
              onChange={(e) => setIsbn(e.target.value)}
              placeholder="np. 9788370541538"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg text-sm hover:bg-gray-700 transition"
            >
              {lang === "pl" ? "Anuluj" : "Cancel"}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold rounded-lg text-sm transition shadow-md shadow-brand-900/40"
            >
              {lang === "pl" ? "Dodaj do bazy" : "Add to catalog"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};