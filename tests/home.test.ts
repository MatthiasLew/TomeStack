import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import Home from '../src/app/page';
import { AddBookModal } from '../src/components/AddBookModal';
import { Navbar } from '../src/components/Navbar';
import { AuthModal } from '../src/components/AuthModal';
import { StatsCards } from '../src/components/StatsCards';
import { accountKey, shelfKey } from '../src/hooks/useAccount';
import type { UserAccount } from '../src/types';

function setup() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  } });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: { documentElement: { lang: 'pl' } } });
  const user: UserAccount = { id: 'local-test', name: 'Test', email: '', role: 'Profil lokalny', avatar: '', ownedBooks: {} };
  localStorage.setItem('tomestack_local_session', user.id);
  localStorage.setItem(accountKey(user.id), JSON.stringify(user));
  return { values, user };
}
test('bulk addition retains all ownership and reading state; repeated addition is idempotent', async () => {
  const { user } = setup();
  let view!: ReactTestRenderer;
  await act(async () => { view = create(React.createElement(Home)); });
  await act(async () => { view.root.findByType(Navbar).props.onOpenAddBook(); });
  const add = view.root.findByType(AddBookModal).props.onAddBook;
  const data = { title: 'Książka A', author: 'Autor', series: 'Seria', formatType: 'hardcover', isbn: '9788328716162', readingStatus: 'read' };
  await act(async () => { add(data); add({ ...data, title: 'Książka B', isbn: '9788328716179' }); });
  const saved = JSON.parse(localStorage.getItem(accountKey(user.id))!);
  assert.equal(Object.keys(saved.ownedBooks).length, 2);
  assert.equal(Object.values(saved.readingStatus).filter(status => status === 'read').length, 2);
  assert.equal(view.root.findByType(StatsCards).props.ownedBooks, 2);
  await act(async () => { view.root.findByType(AddBookModal).props.onAddBook(data); });
  assert.equal(view.root.findByType(StatsCards).props.ownedBooks, 2);
  await act(async () => { view.unmount(); });
  await act(async () => { view = create(React.createElement(Home)); });
  assert.equal(view.root.findByType(StatsCards).props.ownedBooks, 2);
  await act(async () => { view.root.findByType(Navbar).props.onLogout(); });
  assert.equal(view.root.findByType(StatsCards).props.totalBooks, 0);
  assert.equal(view.root.findByType(StatsCards).props.ownedBooks, 0);
  await act(async () => { view.root.findByType(AuthModal).props.onLogin(saved); });
  assert.equal(view.root.findByType(StatsCards).props.ownedBooks, 2);
  assert.equal(JSON.parse(localStorage.getItem(shelfKey(user.id))!).length, 1);
  await act(async () => { view.unmount(); });
});
test('wishlisted books are tracked without claiming ownership', async () => {
  setup(); let view!: ReactTestRenderer;
  await act(async () => { view = create(React.createElement(Home)); });
  await act(async () => { view.root.findByType(Navbar).props.onOpenAddBook(); });
  await act(async () => { view.root.findByType(AddBookModal).props.onAddBook({ title: 'Plan', author: 'Autor', series: 'Seria', formatType: 'paperback', readingStatus: 'wishlist' }); });
  assert.equal(view.root.findByType(StatsCards).props.totalBooks, 1);
  assert.equal(view.root.findByType(StatsCards).props.ownedBooks, 0);
  await act(async () => { view.unmount(); });
});
test('malformed shelf is preserved rather than overwritten on startup', async () => {
  const { user } = setup();
  localStorage.setItem(shelfKey(user.id), '{broken');
  let view!: ReactTestRenderer;
  await act(async () => { view = create(React.createElement(Home)); });
  assert.equal(localStorage.getItem(shelfKey(user.id)), '{broken');
  assert.ok(view.root.findAllByProps({ role: 'alert' }).length);
  await act(async () => { view.unmount(); });
});
