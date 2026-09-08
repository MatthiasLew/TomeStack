# TomeStack

Personal book catalog and series tracker built with Next.js, React and TypeScript.

[Polski](README.pl.md) · [Audit fixes](AUDIT_FIXES.md) · [Architecture proposal](ARCHITEKTURA_I_TECHNOLOGIE.md)

## Run the application

Use Node.js 22 (see `.nvmrc`).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. For a production build, run `npm run build` followed by `npm start`.

## Available now

- Catalog books, editions, authors and series; track ownership and reading status.
- Import available book metadata from Biblioteka Narodowa, Open Library and Google Books.
- ISBN camera scanner with a manual completion form; camera access requires HTTPS or localhost.
- Binding/status filters, hidden books and a missing-volume radar.
- Separate browser storage for each local profile or authenticated account.
- Optional Supabase email/password authentication and ownership-map synchronization.

Without Supabase configuration, the application offers **local profiles without passwords**. Anyone using the same browser can open them by name. They are not secure online accounts. Guest collections remain separate from profile collections.

## Optional Supabase setup

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
3. Configure email authentication and the site's redirect URL in Supabase Auth. If email confirmation is enabled, confirm the address before signing in.
4. Restart/rebuild the application after setting public environment variables.

The SQL script is rerunnable and replaces the old unsafe RLS policies. Existing installations must **apply the updated script**; changing this repository does not change an existing database. Legacy `user-*` records remain in the database but are inaccessible to normal clients. They must not be assigned to new accounts automatically, because the old IDs were not authenticated.

Only the `book_id → edition_id` ownership map currently syncs to Supabase. The catalog, reading status and visibility preferences remain in this browser. This is **not yet full cross-device collection synchronization**. Failed cloud writes are shown in the UI; there is no durable retry queue or conflict resolution.

Old browser sessions are migrated to a local profile using their existing profile name, preserving the active user's catalog and ownership. The old plaintext password registry is removed. Old passwords do not create Supabase accounts. The original legacy catalog is retained as a backup; it is not shared with new accounts.

## Data and prototype limitations

- `index.html` is an **archived UI prototype**, not the current application. Its account switcher and prices are simulated, and its add-book button does not save data.
- Demo collections contain illustrative prices. No live retailer price feed is connected. Imported/manual books receive no fabricated offers.
- Curated author seeds and legacy demo metadata are not verified edition records. Search results are limited and do not guarantee a complete bibliography. Check ISBN, publisher and cover against the physical edition.
- Shipping calculations are estimates; unknown shipping uses 9.99 PLN, and combined lowest prices exclude delivery.
- PWA/offline installation, sharing, full translations/accessibility, distributed API rate limiting and production monitoring remain future work.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Tests cover catalog/state regressions, mocked provider responses, ISBN/limit validation, basket calculations and PostgreSQL RLS. RLS is executed with PGlite against isolated test data, not a live Supabase project. React state tests do not replace browser or physical-camera testing.

## License

MIT. See [LICENSE](LICENSE).
