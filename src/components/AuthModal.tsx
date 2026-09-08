"use client";

import React, { useState } from "react";
import { UserAccount, Language } from "@/types";
import { X, User, Check } from "lucide-react";

interface AuthModalProps {
  userAccounts: Record<string, UserAccount>;
  currentUser: UserAccount | null;
  lang: Language;
  onClose: () => void;
  onSelectUser: (userId: string) => void;
  onCustomLogin: (name: string, email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  userAccounts,
  currentUser,
  lang,
  onClose,
  onSelectUser,
  onCustomLogin,
}) => {
  const [customName, setCustomName] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    onCustomLogin(customName, customEmail || "user@example.com");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-brand-400" />
            <h3 className="text-lg font-bold text-white">
              {lang === "pl" ? "Logowanie do Biblioteczki" : "Library Account Login"}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mt-4">
          <p className="text-xs text-gray-400">
            {lang === "pl"
              ? "Wybierz jedno z przygotowanych kont demonstracyjnych, aby zobaczyć inną kolekcję i stopień ukończenia:"
              : "Select a demo collector profile to test different series completion rates:"}
          </p>

          {/* Presets */}
          <div className="space-y-2">
            {Object.values(userAccounts).map((acc) => {
              const isSelected = currentUser?.id === acc.id;

              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    onSelectUser(acc.id);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? "bg-brand-950/40 border-brand-500/60"
                      : "bg-gray-950/40 border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={acc.avatar}
                      alt={acc.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-700"
                    />
                    <div>
                      <p className="text-sm font-bold text-white">{acc.name}</p>
                      <p className="text-xs text-gray-400">{acc.role}</p>
                    </div>
                  </div>

                  {isSelected ? (
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Aktywne</span>
                    </span>
                  ) : (
                    <button className="text-xs text-brand-400 font-semibold hover:underline">
                      Przełącz
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-900 px-2 text-gray-500">
                {lang === "pl" ? "Lub utwórz własną półkę" : "Or custom login"}
              </span>
            </div>
          </div>

          {/* Custom login form */}
          <form onSubmit={handleCustomSubmit} className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">
                {lang === "pl" ? "Twoje imię / Nick" : "Your Name / Nick"}
              </label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="np. Michał"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">E-mail</label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="np. michal@gmail.com"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-brand-500"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg text-xs transition border border-gray-700"
            >
              {lang === "pl" ? "Zaloguj do nowej półki" : "Login to new shelf"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};