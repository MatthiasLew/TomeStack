# TomeStack

Katalog książek, wydań i serii w Next.js + React + TypeScript.

## Uruchomienie

Node.js 22:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Otwórz http://localhost:3000. W PowerShell plik środowiska skopiujesz poleceniem `Copy-Item .env.example .env.local`.

**Uruchamiaj aplikację Next.js.** `index.html` jest archiwalną demonstracją interfejsu; jego logowanie i ceny są symulowane, a przycisk dodawania nie zapisuje książek.

## Konta i przechowywanie

Bez konfiguracji Supabase korzystasz z **profilu lokalnego bez hasła**. Każdy, kto korzysta z tej samej przeglądarki, może otworzyć profil po nazwie. Ponowne wpisanie tej samej nazwy przywraca jego kolekcję.

Dla kont online ustaw `NEXT_PUBLIC_SUPABASE_URL` i `NEXT_PUBLIC_SUPABASE_ANON_KEY`, uruchom `supabase/schema.sql` w Supabase i skonfiguruj logowanie e-mail. Jeśli projekt wymaga potwierdzenia adresu, potwierdź e-mail przed logowaniem.

**Istniejąca baza wymaga ponownego uruchomienia poprawionego skryptu SQL.** Sam commit nie zmienia wdrożonych reguł RLS. Skrypt blokuje dawny wyjątek `user-*`, a stare rekordy pozostawia do ręcznej, zweryfikowanej migracji.

Do chmury trafia tylko oznaczenie posiadanych książek i wydań. Katalog, statusy czytania i ukrywanie pozostają w przeglądarce. Pełna synchronizacja między urządzeniami nie jest jeszcze gotowa; nie ma też trwałej kolejki ponawiania nieudanych zapisów.

Poprzednia aktywna sesja jest przenoszona do profilu lokalnego o dotychczasowej nazwie. Jawne hasła zapisane przez starą wersję są usuwane. Konta Supabase trzeba utworzyć oddzielnie; starych identyfikatorów nie można uznać za potwierdzoną tożsamość.

## Funkcje i ograniczenia

- Dodawanie książek i wydań, import z katalogów, status czytania, filtry, radar braków.
- Skanowanie ISBN wymaga dostępu do aparatu i HTTPS lub localhost. Po skanowaniu dane można uzupełnić w formularzu.
- Ceny w kolekcjach demo są poglądowe. Brak integracji z aktualnymi ofertami sklepów.
- Importowane książki nie otrzymują fikcyjnych cen, ISBN ani roku wydania.
- Dane kuratorowane/demo wymagają weryfikacji względem konkretnego wydania. Wynik wyszukiwania nie gwarantuje pełnej bibliografii.
- PWA, pełna synchronizacja, pełne tłumaczenia/dostępność i ograniczanie ruchu API pozostają do rozwinięcia.

## Weryfikacja

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

Testy używają atrap odpowiedzi zewnętrznych API, testów stanu React i lokalnego silnika PostgreSQL (PGlite) do sprawdzenia izolacji RLS.

Szczegóły: [raport poprawek](AUDIT_FIXES.md), [README EN](README.md), [proponowana architektura](ARCHITEKTURA_I_TECHNOLOGIE.md).
