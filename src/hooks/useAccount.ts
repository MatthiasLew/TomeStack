"use client";
import { useEffect, useState } from 'react';
import type { UserAccount } from '@/types';
import { supabase } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function accountKey(id: string) { return `tomestack_account:${encodeURIComponent(id)}`; }
export function shelfKey(id?: string) { return `tomestack_shelf_v5:${encodeURIComponent(id || 'guest')}`; }
export function readAccount(id: string): UserAccount | null {
  try {
    const value = JSON.parse(localStorage.getItem(accountKey(id)) || 'null');
    return value?.id === id && typeof value.name === 'string' && value.ownedBooks && typeof value.ownedBooks === 'object' ? value : null;
  } catch { return null; }
}
export function createAccount(id: string, name: string, email = ''): UserAccount {
  return { ...readAccount(id), id, name, email, role: id.startsWith('local-') ? 'Profil lokalny' : 'Kolekcjoner',
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name)}`,
    ownedBooks: readAccount(id)?.ownedBooks || {} };
}
export function useAccount() {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    // Preserve old local collection as an explicitly local profile, never as a cloud session.
    try {
      const old = JSON.parse(localStorage.getItem('tomestack_user') || 'null');
      if (old?.id && old?.name && old?.ownedBooks) {
        const id = `local-${encodeURIComponent(old.name.trim().toLowerCase())}`;
        if (!localStorage.getItem(accountKey(id))) {
          localStorage.setItem(accountKey(id), JSON.stringify({ ...old, id, role: 'Profil lokalny' }));
          const shelf = localStorage.getItem('tomestack_user_shelf_v4');
          if (shelf) localStorage.setItem(shelfKey(id), shelf);
        }
        if (!supabase) localStorage.setItem('tomestack_local_session', id);
        localStorage.removeItem('tomestack_user');
      }
      localStorage.removeItem('tomestack_registered_users');
    } catch { /* Unavailable or malformed local cache is not authentication. */ }
    if (!supabase) {
      try {
        const id = localStorage.getItem('tomestack_local_session');
        if (id?.startsWith('local-')) setCurrentUser(readAccount(id));
      } catch { /* Guest mode remains available. */ }
      setLoaded(true);
      return;
    }
    const apply = (user: User | null) => {
      if (!active) return;
      setCurrentUser(prev => user ? prev?.id === user.id ? prev
        : createAccount(user.id, user.user_metadata?.name || user.email?.split('@')[0] || 'Kolekcjoner', user.email) : null);
      setLoaded(true);
    };
    let authEventReceived = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authEventReceived = true;
      apply(session?.user || null);
    });
    supabase.auth.getUser().then(({ data }) => { if (!authEventReceived) apply(data.user); })
      .catch(() => { if (!authEventReceived) apply(null); });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      if (currentUser) localStorage.setItem(accountKey(currentUser.id), JSON.stringify(currentUser));
      if (!supabase) {
        if (currentUser) localStorage.setItem('tomestack_local_session', currentUser.id);
        else localStorage.removeItem('tomestack_local_session');
      }
    } catch { setError('Nie udało się zapisać danych w przeglądarce. / Browser storage failed.'); }
  }, [currentUser, loaded]);
  const logout = async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut();
      if (error) { setError(error.message); return; }
    }
    setCurrentUser(null);
  };
  return { currentUser, setCurrentUser, loaded, logout, error };
}
