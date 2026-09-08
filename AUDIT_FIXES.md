# TomeStack — poprawki po przeglądzie repozytorium

Baza: `14ccdb90723e63d9461a2c0008d9269ca170eb83` (`main`).
Zakres: kod aplikacji Next.js, komponenty, trasy API, dostawcy danych, katalog,
Supabase/SQL, ceny, prototyp HTML, testy, konfiguracja i dokumentacja.

## Poprawione problemy

| Problem | Zmiana |
|---|---|
| Jawne hasła i pozorowane logowanie | Supabase Auth dla kont online. Bez konfiguracji: jawnie lokalny profil bez hasła. Stary rejestr haseł jest usuwany. |
| Dostęp do cudzych rekordów przez `user-*` | RLS oparty na `auth.uid()`, rola `authenticated`, jawne `WITH CHECK`; brak publicznego odczytu e-maili profili. |
| Wspólna półka i reset po logowaniu | Osobne klucze katalogu i profilu; odtwarzanie oznaczeń i migracja poprzedniej aktywnej sesji. |
| Nadpisanie zapisu pustą listą podczas startu | Zapis dopiero po odczycie; uszkodzony zapis pozostaje nietknięty, UI pokazuje błąd. |
| Gubienie oznaczeń przy imporcie wielu książek | Ustalenie ID przed aktualizacją; funkcyjne aktualizacje stanu użytkownika i bieżąca referencja katalogu. |
| Ponowne dodanie usuwało własność lub wskazywało nieistniejące wydanie | Import jest idempotentny i zwraca identyfikator rzeczywistego, istniejącego wydania. |
| Łączenie różnych autorów/cykli | Seria rozpoznawana po autorze oraz nazwie; import bibliografii odnajduje istniejące dzieło w jego serii. |
| Utrata numeracji/odwołań przy automatycznym scalaniu | Odczyt nie usuwa ID ani nie renumeruje tomów. |
| Wishlist automatycznie oznaczana jako posiadana | Nowa pozycja wishlist jest śledzona bez oznaczenia własności. |
| Spóźnione odczyty chmury i wyszukiwania | Ignorowanie odpowiedzi po zmianie profilu, zamknięciu lub nowszym zapytaniu; odczyt nie nadpisuje nowszej lokalnej mutacji. |
| Nieprawdziwe komunikaty o pełnej synchronizacji | UI opisuje lokalny zapis; nieudane zapisy chmurowe pokazują błąd. |
| Fikcyjne ceny, ISBN i lata importowanych książek | Brak automatycznych ofert; brakujące metadane pozostają nieznane. Kuratorowany fallback udostępnia tytuł i autora bez niezweryfikowanego ISBN/okładki. |
| Gubienie tytułów bez polskich znaków | Usunięty filtr uznający takie tytuły za niepożądane angielskie wpisy. |
| Nadmierne skracanie tytułów i nazwisk | Zachowanie znaczących podtytułów, slashy w tytułach i pełnych imion autora; poprawiony odczyt wydawcy i roku. |
| API akceptujące dowolny limit i kod | ISBN-10/13 z sumą kontrolną, `limit` 1–40, maks. 200 znaków zapytania, błędne dane zwracają 400. |
| Koszyk liczący kilka wydań jako kilka książek | Najtańsza oferta danego sklepu na książkę, ścisły filtr oprawy, odrzucenie brakujących/błędnych cen. |
| Błędne kwoty i koszty wysyłki | Separatory tysięcy i groszy, rozpoznanie jawnego kosztu dostawy, osobna liczba książek z ceną. |
| Filtr oprawy ignorujący wydania i zakładka ignorująca filtry | Uwzględnienie posiadanego/dostępnego wydania; przekazanie filtrów do listy wszystkich książek. |
| Nieotwierające się profile importowanych autorów | Bibliografia modalna tworzona z aktualnego katalogu. |
| Skaner przyjmujący obce kody i duplikujący callback | Walidacja ISBN, pojedyncze wykrycie, anulowanie timera, sekwencyjne start/stop i cleanup po zakończeniu startu. |
| Globalny skaner gubiący ISBN formularza | Kod przekazywany do formularza; użytkownik zatwierdza dodanie zamiast automatycznego zapisu w tle. |
| Uszkodzone polskie teksty i brakujące style | UTF-8, zdefiniowane kolory brand, właściwa zmienna fontu, język dokumentu, zawijanie nagłówka. |
| XSS i pozorowany zapis starego prototypu | Escaping nazwy w HTML; widoczne oznaczenie demo; przycisk nie twierdzi, że zapisał książkę. |
| Nieprzenośny runner testów | `node --import tsx --test tests/*.test.ts`; CI korzysta z Node 22 z `.nvmrc`. |

## Weryfikacja

- `npm test`: **30 testów**, w tym scenariusze React: import masowy, ponowny import,
  status czytania, wishlist, ponowne uruchomienie, wylogowanie i powrót do profilu.
- Testy dostawców używają kontrolowanych odpowiedzi zamiast polegać na sieci.
- Polityki RLS wykonane na lokalnym PostgreSQL/PGlite: dwie tożsamości, rola
  anonimowa, próby dostępu do cudzych danych, podmiany właściciela i prefiksu
  `user-*`; skrypt SQL wykonany dwukrotnie.
- `npm run typecheck`, `npm run lint`, `npm run build`.
- Środowisko lokalne: Node 24.19.0. Workflow sprawdza Node 22.

## Wdrożenie i pozostające ograniczenia

**Przed uruchomieniem kont online zastosuj poprawiony `supabase/schema.sql` w
istniejącym projekcie Supabase i skonfiguruj Auth.** Nie wykonano zmian w żadnej
zewnętrznej bazie. Stare `user-*` rekordy pozostają do świadomej migracji po
potwierdzeniu właściciela; nie zostały automatycznie przypisane do nowych kont.

Nie testowano logowania/e-maili na rzeczywistym projekcie Supabase, kamery na
fizycznym urządzeniu ani pełnego E2E/układu w przeglądarce. Testy React sprawdzają
stan i logikę, a nie rzeczywisty layout i uprawnienia sprzętowe.

Pełna synchronizacja katalogu i statusów między urządzeniami, trwała kolejka
ponawiania zapisów/rozwiązywanie konfliktów, rate limiting publicznych API,
kontraktowe testy rzeczywistych dostawców, live ceny, PWA i pełna dostępność są
nadal poza aktualną implementacją. Oprawa bez metadanych ma domyślną wartość do
weryfikacji; dane demonstracyjne nadal nie są bazą zweryfikowanych wydań.

Poprawki nie stanowią potwierdzenia gotowości całej aplikacji do produkcji.
