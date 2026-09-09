"use client";
import React, { useState, useEffect, useRef } from 'react';
import type { Language, UserAccount } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { createAccount, readAccount } from '@/hooks/useAccount';

interface AuthModalProps {
  lang: Language;
  onClose?: () => void;
  onLogin: (user: UserAccount) => void;
  isForcedModal?: boolean;
}
export function AuthModal({ lang, onClose, onLogin }: AuthModalProps) {
  const pl = lang === 'pl';
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstInputRef.current?.focus();
    if (typeof window === 'undefined') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, mode]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage('');
    try {
      if (!supabase) {
        const cleanName = name.trim();
        if (!cleanName) return;
        const id = `local-${encodeURIComponent(cleanName.toLowerCase())}`;
        onLogin(readAccount(id) || createAccount(id, cleanName));
        onClose?.();
        return;
      }
      const credentials = { email: email.trim().toLowerCase(), password };
      const { data, error } = mode === 'register'
        ? await supabase.auth.signUp({ ...credentials, options: { data: { name: name.trim() } } })
        : await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (!data.session) {
        setMessage(pl ? 'Sprawdź e-mail i potwierdź rejestrację przed zalogowaniem.' : 'Check your email to confirm your registration before signing in.');
        return;
      }
      // The auth subscription establishes the account from the actual session.
      onClose?.();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (pl ? 'Logowanie nie powiodło się.' : 'Sign in failed.'));
    } finally { setBusy(false); }
  };
  const field = 'w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-500';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md" onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="auth-title" className="bg-gray-900 border border-gray-700 w-full max-w-md rounded-2xl p-6 space-y-4 shadow-2xl">
        <div className="flex justify-between items-center gap-3">
          <h2 id="auth-title" className="text-lg font-bold text-white">
            {!supabase ? (pl ? 'Profil lokalny' : 'Local profile') : mode === 'login' ? (pl ? 'Zaloguj się' : 'Sign in') : (pl ? 'Utwórz konto' : 'Create account')}
          </h2>
          <button onClick={onClose} aria-label={pl ? 'Zamknij' : 'Close'} className="text-gray-400 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer">✕</button>
        </div>
        {!supabase && <p className="text-sm text-gray-300">{pl ? 'Kolekcja będzie zapisana w tej przeglądarce. Profil lokalny nie jest chroniony hasłem. Wpisz tę samą nazwę, aby wrócić do swojej półki.' : 'Your collection is stored in this browser. Local profiles are not password protected. Enter the same name to reopen your shelf.'}</p>}
        <form onSubmit={submit} className="space-y-3">
          {(!supabase || mode === 'register') && (
            <label className="block text-sm text-gray-300">
              {pl ? 'Nazwa profilu' : 'Profile name'}
              <input ref={firstInputRef} className={field} value={name} onChange={e => setName(e.target.value)} required maxLength={80} autoComplete="nickname" />
            </label>
          )}
          {supabase && (
            <>
              <label className="block text-sm text-gray-300">
                E-mail
                <input ref={firstInputRef} className={field} type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
              </label>
              <label className="block text-sm text-gray-300">
                {pl ? 'Hasło' : 'Password'}
                <input className={field} type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              </label>
            </>
          )}
          {message && <p role="status" className="text-sm text-amber-300">{message}</p>}
          <button disabled={busy} className="w-full p-3 bg-brand-600 hover:bg-brand-500 rounded-xl font-bold text-white transition disabled:opacity-50 cursor-pointer">
            {busy ? '…' : pl ? 'Kontynuuj' : 'Continue'}
          </button>
        </form>
        {supabase && (
          <button className="text-sm text-brand-300 hover:underline cursor-pointer" disabled={busy} onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setMessage(''); }}>
            {mode === 'login' ? (pl ? 'Utwórz nowe konto' : 'Create a new account') : (pl ? 'Mam już konto' : 'I already have an account')}
          </button>
        )}
      </section>
    </div>
  );
}
