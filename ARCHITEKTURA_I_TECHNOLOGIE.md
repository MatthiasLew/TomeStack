# 🛠️ Architektura i Wybór Technologii dla TomeStack

Dokument wyjaśniający wybór stosu technologicznego (Tech Stack) dla pełnej wersji aplikacji **TomeStack**, uwzględniający specyfikę polskiego rynku wydawniczego, wygodę kolekcjonerów oraz koszty utrzymania.

---

## 🏗️ 1. Stos Technologiczny (Tech Stack) – Podsumowanie

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND & PWA                         │
│   Next.js 14 (App Router) + React + Tailwind CSS + Lucide   │
│   • Skaner kodów ISBN w telefonie (html5-qrcode / ZXing)   │
│   • Tryb offline i mobilny (PWA - dodaj do ekranu gł.)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ (REST / Server Actions)
┌──────────────────────────────▼──────────────────────────────┐
│                    BACKEND & BAZA DANYCH                    │
│   Supabase (PostgreSQL) lub Node.js / FastAPI               │
│   • Relacje: Dzieło (Work) ➔ Wydania (Editions) ➔ Użytkownik│
│   • Szybkie zapytania, indeksy ISBN, Row Level Security     │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Pobieranie metadanych i cen)
┌──────────────────────────────▼──────────────────────────────┐
│               ZEWNĘTRZNE API I INTEGRACJE                   │
│   1. API Biblioteki Narodowej (data.bn.org.pl) - Polska     │
│   2. Google Books API / Open Library - Świat               │
│   3. Integrator Cen (Ceneo API, Allegro REST API)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 2. Dlaczego właśnie takie technologie? (Szczegółowe uzasadnienie)

### A. Frontend: **Next.js (React) + Tailwind CSS**
* **Dlaczego Next.js, a nie czysty React/Vite?**
  * **SEO i szybkie ładowanie (SSR):** Każda seria (np. *„Saga o Wiedźminie – wszystkie tomy i wydania”*) może mieć swój publiczny link indeksowany przez Google. Jeśli kiedyś zechcesz udostępniać profile swoich kolekcji znajomym, linki załadują się natychmiast z miniaturką i podglądem na Facebooku czy Discordzie.
  * **Server Actions / API Routes w jednym projekcie:** Nie musisz stawiać i utrzymywać osobnego serwera backendowego — Next.js obsługuje bazę i zapytania do zewnętrznych API w jednym repozytorium.
* **Dlaczego Tailwind CSS?**
  * Umożliwia błyskawiczne tworzenie nowoczesnego, ciemnego interfejsu (Dark Mode) dopasowanego zarówno do ekranów telefonów (gdy stoisz przed regałem w księgarni), jak i monitora komputera.
  * Brak konieczności pisania i utrzymywania tysięcy linii plików `.css`.

---

### B. Baza Danych: **PostgreSQL (poprzez Supabase)**
* **Dlaczego relacyjna baza (SQL), a nie NoSQL (np. MongoDB)?**
  Kolekcjonowanie książek to **klasyczny model relacyjny**:
  * **Autor** ma wiele **Serii** i **Książek**.
  * **Dzieło literackie (Work)** (np. *„Ostatnie życzenie”*) ma wiele **Wydań (Editions)** (SuperNowa 1993, SuperNowa 2014 w twardej oprawie, wydanie serialowe).
  * **Użytkownik** posiada konkretne **Wydanie** o konkretnym numerze **ISBN**.
  * W bazie relacyjnej zmiana np. statusu posiadania tomu automatycznie i bezbłędnie przelicza postęp całej serii.
* **Dlaczego Supabase?**
  * Jest darmowy na start (do 500 MB danych i 50 000 użytkowników).
  * Oferuje wbudowane logowanie (Google, e-mail, GitHub).
  * Posiada bezpieczne reguły dostępu (Row Level Security) — każdy użytkownik widzi tylko swoje półki i swoje braki.

---

### C. Źródła Danych o Książkach i Wydaniach:
Dlaczego nie wpisujemy książek ręcznie? Bo w Polsce wychodzą dziesiątki tysięcy książek rocznie.

1. **API Biblioteki Narodowej (`data.bn.org.pl`):**
   * **Najważniejsze źródło dla polskiego kolekcjonera!**
   * Posiada urzędowy rejestr każdego numeru ISBN wydanego w Polsce od dziesięcioleci.
   * Zwraca precyzyjne dane: wydawnictwo, rok wydania, format oprawy (twarda/miękka), liczbę stron i tłumacza.
   * Jest całkowicie **darmowe i otwarte**.
2. **Google Books API + Open Library:**
   * Uzupełnienie dla książek zagranicznych oraz świetne źródło okładek w wysokiej rozdzielczości.

---

### D. Skaner Kodów Kreskowych w Telefonie: **`html5-qrcode` / `ZXing-js`**
* **Dlaczego skaner przez kamerę w przeglądarce?**
  * Kolekcjoner nie musi instalować aplikacji ze sklepu Google Play / App Store.
  * Otwierasz stronę na telefonie, klikasz ikonę aparatu, najeżdżasz na kod kreskowy ISBN z tyłu książki na swojej półce — i książka sama dodaje się do kolekcji w ułamku sekundy.

---

### E. Porównywarka Cen: **API Ceneo / Allegro / Web Scraping**
* **Dlaczego warto agregować ceny?**
  * Kolekcjonerzy szukający brakujących tomów (zwłaszcza z oprawą twardą) często przepłacają lub polują na wyprzedaże.
  * Zestawienie cen z księgarni (*Świat Książki, TaniaKsiążka, Empik, Allegro*) bezpośrednio przy brakującym tomie pozwala jednym kliknięciem kupić najtańszy egzemplarz i dobić serię do 100%.

---

## 💰 3. Koszty Infrastruktury (Hosting & Utrzymanie)

Projekt w tej architekturze można uruchomić **w 100% za darmo**:
* **Frontend + API:** Vercel (Darmowy plan Hobby – idealny dla projektów open-source i małych stron).
* **Baza Danych & Auth:** Supabase Free Tier (PostgreSQL).
* **API Biblioteki Narodowej:** 0 zł (publiczne otwarte API).
* **Domena (opcjonalnie):** np. `.pl` za ok. 15 zł za pierwszy rok, lub darmowa subdomena `tomestack.vercel.app`.
