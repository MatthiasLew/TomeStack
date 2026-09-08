# TomeStack — audyt techniczny i plan rozwoju

**Data audytu:** 8 września 2026

**Audytowany commit bazowy:** `079773d`

**Ocena:** działający demonstrator/MVP; **NO-GO dla publicznej aplikacji wieloużytkownikowej**

## 1. Zakres i wykonana weryfikacja

Audyt objął aplikację Next.js, komponenty React, trasy API, integrację z Supabase,
schemat SQL, algorytm cen, dane demonstracyjne, testy, CI, dokumentację i działanie
interfejsu w przeglądarce.

Wyniki kontroli:

- `npm run lint` — sukces;
- `npm run typecheck` — sukces;
- `npm test` — 14/14 testów przeszło poza ograniczonym sandboxem Windows;
- `npm run build` — produkcyjny build przeszedł;
- `npm audit` — 0 znanych podatności zależności;
- aplikacja uruchomiła się lokalnie, bez błędów konsoli przeglądarki;
- bieżący GitHub Actions dla `main` zakończył się błędem;
- repozytorium było czyste i zgodne z `origin/main` przed publikacją raportu.

`npm audit = 0` oznacza tylko brak znanych alertów zależności. Nie potwierdza
bezpieczeństwa własnej logiki aplikacji.

## 2. Klasyfikacja gotowości

| Obszar | Ocena | Wniosek |
|---|---:|---|
| Lokalne demo koncepcji | Warunkowe GO | Główne przepływy działają, lecz CI, teksty i część UI wymagają naprawy. |
| Publiczne demo bez prawdziwych kont | Warunkowe GO | Tylko po jasnym oznaczeniu danych demonstracyjnych. |
| Produkcyjna aplikacja wieloużytkownikowa | NO-GO | Brak prawdziwego uwierzytelniania i bezpiecznej izolacji danych. |
| Płatne lub limitowane integracje API | NO-GO | Brak limitowania, cache, obserwowalności i ochrony budżetu. |

## 3. Problemy krytyczne

### P0-1. Logowanie jest lokalną symulacją

`src/components/AuthModal.tsx` zapisuje adresy e-mail i hasła w jawnej postaci
w `localStorage`. Próba zalogowania nieznanego adresu automatycznie tworzy konto.
Nie jest to Supabase Auth ani wiarygodna granica tożsamości.

Skutki:

- hasła mogą zostać odczytane przez kod działający w kontekście strony;
- lokalny rekord sesji można zmienić i podszyć się pod inny identyfikator;
- nie istnieją bezpieczny reset hasła, weryfikacja e-mail ani kontrola sesji;
- komunikaty o prywatnym koncie i półce są mylące.

Zalecenie:

1. Usunąć lokalną bazę kont i zapisywanie haseł.
2. Wdrożyć Supabase Auth.
3. Tożsamość pobierać wyłącznie z ważnej sesji Supabase.
4. Dodać testy rejestracji, logowania, wylogowania i wygaśnięcia sesji.

### P0-2. Polityki RLS pozwalają ominąć izolację danych

W `supabase/schema.sql` polityki `user_books` i `custom_books` dopuszczają:

```sql
auth.uid()::text = user_id OR user_id LIKE 'user-%'
```

Aplikacja tworzy przewidywalne identyfikatory `user-*` z adresu e-mail. Jeżeli
schemat z repozytorium jest wdrożony i tabele są wystawione przez Supabase API,
drugi warunek pozwala operować na rekordach bez powiązania z `auth.uid()`.

Zalecenie:

1. Zmienić `user_id` na `UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`.
2. Usunąć wyjątek `user_id LIKE 'user-%'`.
3. Rozdzielić polityki SELECT, INSERT, UPDATE i DELETE.
4. Dla mutacji zastosować `USING` i `WITH CHECK` oparte na `auth.uid() = user_id`.
5. Dodać testy RLS dla dwóch użytkowników i roli anonimowej.

## 4. Problemy wysokiego priorytetu

### P1-1. Bieżący GitHub Actions nie przechodzi

Lokalny skrypt testowy działa na Windows, lecz workflow Linux przekazuje
`tests/**/*.test.ts` jako literalną ścieżkę.

Dowód: [GitHub Actions run 34259345619](https://github.com/MatthiasLew/TomeStack/actions/runs/34259345619).

Należy zastosować przenośny sposób wskazywania testów i wymagać zielonego CI
przed scaleniem zmian.

### P1-2. Dodawanie książki może utracić część stanu

`handleAddBook` wywołuje kolejno `handleToggleOwned` i
`handleUpdateReadingStatus`. Obie funkcje budują wynik na podstawie tego samego,
przechwyconego `currentUser`. Przy grupowaniu aktualizacji przez React późniejsza
aktualizacja może nadpisać wcześniejsze oznaczenie książki jako posiadanej.

`targetBookId` jest też modyfikowany wewnątrz funkcji przekazanej do
`setSeriesList`, a następnie używany poza nią. Kolejność wykonania updatera nie
powinna służyć do przekazywania danych.

Zalecenie: wykonać jeden funkcyjny, atomowy update użytkownika i jawnie
zaplanowaną synchronizację chmurową.

### P1-3. Dane użytkownika są synchronizowane tylko częściowo

Do Supabase trafia wyłącznie mapa posiadanych książek. Statusy czytania, ukryte
książki i serie, książki dodane ręcznie oraz struktura kolekcji pozostają lokalne.
Lista serii używa wspólnego klucza `tomestack_user_shelf_v4`, niezależnego od
użytkownika.

Skutek: przełączanie kont nie zapewnia odrębnej biblioteki, a część danych znika
po zmianie urządzenia lub wyczyszczeniu przeglądarki.

### P1-4. Błędy Supabase są ignorowane

Zapisy i usunięcia są uruchamiane bez `await`. UI aktualizuje się optymistycznie,
a niepowodzenie jest tylko wypisywane do konsoli. Użytkownik może otrzymać
wrażenie zapisu, mimo że dane nie trafiły do chmury.

Należy dodać stany `saving/saved/error`, retry oraz rollback albo kolejkę
synchronizacji.

### P1-5. Publiczne trasy API nie walidują limitów

`limit` jest przetwarzany przez `parseInt`, ale wynik nie jest sprawdzany. Test
runtime potwierdził akceptację `limit=abc`, `limit=-1` i `limit=1000000`.
Długość `q` i `author` również nie jest ograniczona.

Endpoint wykonuje równoległe wywołania kilku dostawców, w tym Google Books,
które może korzystać z klucza serwerowego.

Należy:

- walidować ISBN, zapytania i limit przy użyciu jawnego schematu;
- ograniczyć `limit` do małego zakresu;
- dodać rate limiting, cache i budżet wywołań;
- zwracać 400 dla niepoprawnych danych i 429 po przekroczeniu limitu.

### P1-6. Porównywarka cen nie jest funkcją live

Ceny pochodzą głównie z danych demonstracyjnych. Kod oznacza każdą ofertę jako
dostępną, syntetycznie ustala czas dostawy i przyjmuje stały koszt wysyłki.

Algorytm koszyka sumuje każdą ofertę sklepu, więc kilka wydań tego samego tomu
może zwiększyć liczbę książek i koszt. Niepoprawna cena jest zamieniana na `0`,
co może uczynić błędną ofertę najtańszą.

Do czasu wdrożenia prawdziwych feedów UI powinien używać określenia „cena
demonstracyjna” albo „wyszukaj ofertę”.

### P1-7. Stary `index.html` jest niespójną drugą aplikacją

README nadal kieruje do starego SPA. Plik ma inny model danych, pozorowane
logowanie, Tailwind z CDN i przycisk dodawania książki pokazujący tylko `alert`.

Nazwa użytkownika jest wstawiana bez escaping do `innerHTML`, co tworzy ryzyko
DOM XSS po podaniu przygotowanej wartości.

Plik należy usunąć z aktywnej ścieżki produktu albo przenieść do jednoznacznie
oznaczonego archiwum.

## 5. Problemy średniego priorytetu

### P2-1. Uszkodzone kodowanie tekstów

`src/components/EmptyLibraryHero.tsx` i część testów zawierają znak `�`. Problem
był widoczny w przeglądarce w nazwiskach i tekstach onboardingowych.

Należy przywrócić UTF-8 i dodać kontrolę znaków zastępczych do CI.

### P2-2. Część okładek jest błędnie przypisana

Te same identyfikatory Open Library są użyte dla różnych książek, m.in.
„Ostatniego życzenia” i „Narrenturm”. Sam fakt, że URL zwraca obraz, nie dowodzi
zgodności z książką.

Okładka powinna być powiązana z ISBN/edition ID, źródłem i statusem weryfikacji.

### P2-3. Responsywność

Przy viewport 774 px dokument miał 811 px szerokości i poziomy scrollbar.
Należy przetestować szerokości 320, 375, 768, 1024 i 1440 px.

### P2-4. Dostępność

Modal uwierzytelniania nie ma semantyki dialogu, etykiety nie są powiązane z
polami, a inputy nie mają stabilnych `name` i `autocomplete`. Nie ma
zweryfikowanego focus trap, obsługi Escape ani powrotu fokusu. Dokument ma stale
`lang="en"`, mimo domyślnego polskiego UI.

### P2-5. Tryb gościa jest sprzeczny z onboardingiem

UI informuje o trybie gościa, lecz pierwsza wizyta otwiera wymuszony modal bez
normalnej możliwości zamknięcia. Projekt powinien wybrać prawdziwy tryb gościa
albo jasno wymagać konta.

### P2-6. Dokumentacja wyprzedza implementację

README deklaruje PWA, SSR stron serii, rygorystyczną prywatność RLS, pełne
bibliografie i automatyczną agregację cen. Repo nie ma manifestu ani service
workera, publicznych stron książek/serii ani pełnego modelu z diagramu.

Roadmapa jednocześnie oznacza inicjalizację Next.js i Supabase jako niewykonaną,
chociaż część tej pracy już istnieje.

Dokumentację należy podzielić na „działa obecnie”, „demo/mock” i „planowane”.

### P2-7. Brak jednej wersji Node.js

CI używa Node 20, audyt lokalny wykonano na Node 24, a repo nie ma `engines` ani
`.nvmrc`. Należy wybrać wspieraną wersję LTS i używać jej w repo oraz CI.

## 6. Braki w testach

Obecne 14 testów obejmuje głównie czyszczenie danych BN, kanonizację tytułów i
część kalkulatora cen. Brakuje testów:

- komponentów React i interakcji użytkownika;
- atomowości aktualizacji kolekcji;
- tras API i walidacji parametrów;
- uwierzytelniania i sesji;
- polityk Supabase RLS;
- synchronizacji, retry i błędów sieci;
- kodowania, responsywności i dostępności;
- pełnego E2E od logowania do niezależnego odczytu danych;
- skanera kamery na urządzeniach mobilnych.

Test integracji autora może przejść na danych kuratorowanych mimo awarii
dostawcy. Testy jednostkowe powinny mockować dostawców, a testy integracyjne
jawnie raportować ich dostępność.

## 7. Plan rozwoju

### Etap A — wiarygodna baza

- [ ] Naprawić przenośny skrypt testowy i uzyskać zielone CI.
- [ ] Naprawić UTF-8.
- [ ] Ustalić jedną wersję Node.js.
- [ ] Usunąć lub zarchiwizować `index.html`.
- [ ] Zaktualizować README.

Kryterium wyjścia: świeży commit przechodzi lint, typecheck, test i build lokalnie
oraz w GitHub Actions.

### Etap B — prawdziwa tożsamość i izolacja

- [ ] Wdrożyć Supabase Auth.
- [ ] Przeprowadzić migrację `user_id` do UUID.
- [ ] Napisać ścisłe polityki RLS bez wyjątków prefiksowych.
- [ ] Dodać testy dwóch użytkowników i roli anonimowej.
- [ ] Usunąć lokalnie przechowywane hasła.

Kryterium wyjścia: użytkownik A nie może odczytać, zmienić ani usunąć danych
użytkownika B; anonimowy klient nie może zarządzać danymi prywatnymi.

### Etap C — niezawodny model kolekcji

- [ ] Ujednolicić encje Work, Edition, Series, UserBook i CustomBook.
- [ ] Zapisywać status czytania, ukrywanie i własne książki w bazie.
- [ ] Wprowadzić atomowe aktualizacje React.
- [ ] Dodać retry, obsługę konfliktów i widoczne błędy synchronizacji.
- [ ] Zaplanować migrację obecnych danych z `localStorage`.

Kryterium wyjścia: operacja na urządzeniu A jest po ponownym logowaniu poprawnie
odczytywana na urządzeniu B.

### Etap D — bezpieczne i przewidywalne API

- [ ] Walidować wszystkie parametry wejściowe.
- [ ] Dodać rate limiting i cache.
- [ ] Rozróżniać błąd dostawcy, brak wyniku, timeout i wyczerpanie limitu.
- [ ] Dodać obserwowalność bez logowania sekretów i danych wrażliwych.
- [ ] Dodać testy kontraktowe dostawców.

### Etap E — wiarygodne dane i ceny

- [ ] Rozdzielić dzieło od konkretnego wydania.
- [ ] Powiązać okładki z ISBN/edition ID.
- [ ] Oznaczać źródło, pewność i świeżość danych.
- [ ] Zastąpić mocki zgodnymi regulaminowo integracjami albo generatorami linków.
- [ ] Liczyć najwyżej jedną ofertę danego sklepu na książkę.

### Etap F — UX, dostępność i PWA

- [ ] Naprawić overflow i przetestować breakpointy.
- [ ] Uzupełnić semantykę dialogów i formularzy.
- [ ] Zapewnić obsługę klawiatury i czytników ekranu.
- [ ] Dokończyć PL/EN oraz dynamiczny `lang`.
- [ ] Wdrożyć PWA wraz z manifestem, ikonami, cache i testami offline.

## 8. Minimalne bramki przed produkcją

- [ ] prawdziwe uwierzytelnianie bez haseł w `localStorage`;
- [ ] testy RLS potwierdzające izolację użytkowników;
- [ ] zielony GitHub Actions na dokładnym wdrażanym SHA;
- [ ] E2E obejmujące zapis i niezależny odczyt z bazy;
- [ ] limity zewnętrznych API;
- [ ] rozdzielenie danych live od demonstracyjnych;
- [ ] monitoring błędów i podstawowa obserwowalność;
- [ ] backup oraz przetestowana procedura odtworzenia;
- [ ] polityka prywatności i retencji danych;
- [ ] brak znanych krytycznych i wysokich defektów bezpieczeństwa.

## 9. Obszary nieweryfikowane

- rzeczywisty stan wdrożonego Supabase i zgodność polityk z `schema.sql`;
- hosting, domena, TLS, sekrety i limity kont dostawców;
- kamera na fizycznych urządzeniach mobilnych;
- procedury backupu i odtwarzania;
- prawna i regulaminowa możliwość automatycznego pobierania cen;
- zachowanie pod realnym obciążeniem.

Są to brakujące dowody wymagane przed produkcją, nie potwierdzone defekty.

## 10. Zalecenie końcowe

Najpierw należy ustabilizować CI oraz usunąć pozorowane uwierzytelnianie i
wadliwy wyjątek RLS. Następnie trzeba zapewnić pełną trwałość danych i testy
izolacji użytkowników. Dopiero później warto inwestować w ceny live, PWA i
kolejne funkcje.

Do tego czasu projekt powinien być opisywany jako **interaktywny demonstrator/MVP
z częściową integracją ze źródłami danych o książkach**, a nie gotowa prywatna
platforma produkcyjna.
