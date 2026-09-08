"use client";

import React, { useState } from "react";
import { Language } from "@/types";
import { User, Lock, Mail, ArrowRight } from "lucide-react";

interface AuthModalProps {
  lang: Language;
  onClose?: () => void;
  onLogin: (name: string, email: string) => void;
  isForcedModal?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  lang,
  onClose,
  onLogin,
  isForcedModal = false,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(lang === "pl" ? "Podaj swoje imię lub pseudonim." : "Please enter your name or nickname.");
      return;
    }
    if (!email.trim() || !email.includes("@")) {
      setError(lang === "pl" ? "Wpisz poprawny adres e-mail." : "Please enter a valid email address.");
      return;
    }

    onLogin(name.trim(), email.trim());
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8">
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {lang === "pl" ? "Zaloguj się do swojej biblioteki" : "Sign in to your library"}
              </h3>
              <p className="text-xs text-gray-400">
                {lang === "pl"
                  ? "TomeStack chroni Twoją półkę przed edycją przez obcych"
                  : "Protect your personal collection from unauthorized changes"}
              </p>
            </div>
          </div>
          {!isForcedModal && onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
              ✕
            </button>
          )}
        </div>

        <div className="mt-5 space-y-4">
          <p className="text-xs text-gray-300 leading-relaxed bg-gray-950/60 p-3 rounded-xl border border-gray-800">
            {lang === "pl"
              ? "Wpisz swoje dane, aby uzyskać dostęp do własnej półki. Twoja kolekcja, postęp serii i brakujące tomy synchronizują się z chmurą PostgreSQL."
              : "Enter your details to access your personal shelf. Your owned editions and series completion stats sync to your cloud database."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                {lang === "pl" ? "Twoje imię / Nick" : "Your Name / Nick"}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError(null);
                  }}
                  placeholder={lang === "pl" ? "np. Maciej" : "e.g. Alex"}
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 pl-9 text-sm text-white focus:outline-none focus:border-brand-500 transition"
                />
                <User className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                {lang === "pl" ? "Adres E-mail" : "Email Address"}
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                  placeholder="twoj.email@example.com"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 pl-9 text-sm text-white focus:outline-none focus:border-brand-500 transition"
                />
                <Mail className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              </div>
            </div>

            {error && (
              <p className="text-xs font-medium text-rose-400 bg-rose-950/30 p-2.5 rounded-lg border border-rose-500/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-brand-900/40 flex items-center justify-center gap-2"
            >
              <span>{lang === "pl" ? "Wejdź do mojej biblioteczki" : "Access My Bookshelf"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};