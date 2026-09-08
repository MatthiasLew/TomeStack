"use client";

import React, { useState } from "react";
import { Language } from "@/types";
import { User, Lock, Mail, ArrowRight, UserPlus, KeyRound } from "lucide-react";

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
  const [mode, setMode] = useState<"login" | "register">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setError(lang === "pl" ? "Wpisz poprawny adres e-mail." : "Please enter a valid email address.");
      return;
    }

    if (password.length < 6) {
      setError(lang === "pl" ? "Hasło musi mieć co najmniej 6 znaków." : "Password must be at least 6 characters.");
      return;
    }

    // Load registered accounts database from localStorage
    let registeredUsers: Record<string, { name: string; email: string; password: string }> = {};
    try {
      const stored = localStorage.getItem("tomestack_registered_users");
      if (stored) {
        registeredUsers = JSON.parse(stored);
      }
    } catch {
      registeredUsers = {};
    }

    if (mode === "register") {
      if (!name.trim()) {
        setError(lang === "pl" ? "Podaj swoje imię lub pseudonim." : "Please enter your name or nickname.");
        return;
      }
      if (password !== confirmPassword) {
        setError(lang === "pl" ? "Hasła nie są identyczne." : "Passwords do not match.");
        return;
      }

      // Check if user already exists
      if (registeredUsers[cleanEmail]) {
        setError(
          lang === "pl"
            ? "Konto z tym adresem e-mail już istnieje. Przełącz się na logowanie."
            : "An account with this email already exists. Please sign in."
        );
        return;
      }

      // Save new registered user
      registeredUsers[cleanEmail] = {
        name: name.trim(),
        email: cleanEmail,
        password,
      };
      localStorage.setItem("tomestack_registered_users", JSON.stringify(registeredUsers));

      onLogin(name.trim(), cleanEmail);
      if (onClose) onClose();
    } else {
      // Login mode
      const existing = registeredUsers[cleanEmail];
      if (existing) {
        if (existing.password !== password) {
          setError(lang === "pl" ? "Nieprawidłowe hasło." : "Invalid password.");
          return;
        }
        onLogin(existing.name, cleanEmail);
      } else {
        // Allow first-time login as quick-register if not present
        const derivedName = cleanEmail.split("@")[0];
        const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
        registeredUsers[cleanEmail] = {
          name: formattedName,
          email: cleanEmail,
          password,
        };
        localStorage.setItem("tomestack_registered_users", JSON.stringify(registeredUsers));
        onLogin(formattedName, cleanEmail);
      }

      if (onClose) onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl p-6 sm:p-8">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              {mode === "register" ? <UserPlus className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {mode === "register"
                  ? (lang === "pl" ? "Stwórz konto kolekcjonera" : "Create Collector Account")
                  : (lang === "pl" ? "Zaloguj się do biblioteki" : "Sign In to Library")}
              </h3>
              <p className="text-xs text-gray-400">
                {mode === "register"
                  ? (lang === "pl" ? "Załóż własną, prywatną półkę" : "Set up your private book shelf")
                  : (lang === "pl" ? "Dostęp do Twojej zapisanej kolekcji" : "Access your saved collection")}
              </p>
            </div>
          </div>
          {!isForcedModal && onClose && (
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg">
              ✕
            </button>
          )}
        </div>

        {/* Tab Switcher: Logowanie vs Rejestracja */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1 bg-gray-950 rounded-xl border border-gray-800">
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              mode === "login"
                ? "bg-brand-600 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {lang === "pl" ? "Logowanie" : "Sign In"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition ${
              mode === "register"
                ? "bg-brand-600 text-white shadow"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {lang === "pl" ? "Stwórz konto" : "Register"}
          </button>
        </div>

        {/* Form Fields */}
        <div className="mt-4 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === "register" && (
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
            )}

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

            <div>
              <label className="text-xs font-semibold text-gray-300 block mb-1">
                {lang === "pl" ? "Hasło" : "Password"}
              </label>
              <div className="relative">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 pl-9 text-sm text-white focus:outline-none focus:border-brand-500 transition"
                />
                <KeyRound className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
              </div>
            </div>

            {mode === "register" && (
              <div>
                <label className="text-xs font-semibold text-gray-300 block mb-1">
                  {lang === "pl" ? "Powtórz hasło" : "Confirm Password"}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      setError(null);
                    }}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-2.5 pl-9 text-sm text-white focus:outline-none focus:border-brand-500 transition"
                  />
                  <KeyRound className="w-4 h-4 text-gray-500 absolute left-3 top-3" />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs font-medium text-rose-400 bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/30 animate-shake">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-brand-900/40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>
                {mode === "register"
                  ? (lang === "pl" ? "Utwórz konto i przejdź do półki" : "Create Account & Start")
                  : (lang === "pl" ? "Zaloguj się" : "Sign In")}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Bottom Switcher Link */}
          <div className="pt-2 text-center border-t border-gray-800/80">
            {mode === "register" ? (
              <p className="text-xs text-gray-400">
                {lang === "pl" ? "Masz już konto?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                  }}
                  className="text-brand-400 font-bold hover:underline"
                >
                  {lang === "pl" ? "Zaloguj się" : "Sign In"}
                </button>
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                {lang === "pl" ? "Nie masz jeszcze konta?" : "Don't have an account yet?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError(null);
                  }}
                  className="text-brand-400 font-bold hover:underline"
                >
                  {lang === "pl" ? "Zarejestruj się bezpłatnie" : "Create one for free"}
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};