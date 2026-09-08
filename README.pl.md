# 📚 TomeStack – The Series Completionist & Edition Tracker

> Twoja osobista biblioteczka online, która śledzi polskie i zagraniczne wydania, wykrywa brakujące tomy w seriach, pozwala przeglądać pełne bibliografie autorów oraz porównuje ceny w księgarniach internetowych.

---

## 🖥️ Jak uruchomić prototyp (Mockup)?

1. Przejdź do folderu:
   ```text
   C:\Users\Praca\Desktop\Plany\Biblioteka online\
   ```
2. Kliknij dwukrotnie w plik:
   👉 **`index.html`**
3. Strona uruchomi się bezpośrednio w Twojej przeglądarce internetowej!

---

## ✨ Kluczowe Funkcje Aplikacji

* 👤 **Prywatne konta i osobiste biblioteczki (NOWOŚĆ w v2.2):**
  * Każdy użytkownik loguje się i posiada **swoją własną, niezależną półkę**.
  * W prototypie możesz w ułamku sekundy przełączać się między kontami demonstracyjnymi:
    * **👤 Kamil** (kolekcja fantasy: Wiedźmin 75%, Diuna, itp.)
    * **👤 Anna** (fanka klasyki: Harry Potter 100%, Tolkien 100%)
    * **👁️ Gość (Wylogowany)** (przeglądanie katalogu z zachętą do rejestracji)
  * Statystyki ukończenia serii i radar braków przeliczają się natychmiast po zmianie użytkownika!
* 📖 **Wybór formatu oprawy (Twarda vs Miękka):**
  * Filtrowanie całej biblioteki i pojedynczych tomów pod kątem typu oprawy (`📖 Twarda` / `📕 Miękka`).
  * Wybór dokładnego wydania posiadanego na półce (rok, wydawnictwo, ISBN, okładka).
* 💰 **Porównywarka Cen w Księgarniach Online:** Bezpośrednie porównanie ofert w polskich księgarniach (*Świat Książki, TaniaKsiążka.pl, Empik, Allegro*) z filtrowaniem według typu oprawy, oznaczeniem najtańszej oferty i bezpośrednim linkiem do zakupu.
* 🎯 **Radar Braków (Completionist Mode):** Szybka lista wszystkich brakujących tomów ze wszystkich Twoich serii.
* ✍️ **Profil Autora i Pełna Bibliografia:** Kliknij nazwisko dowolnego autora, aby zobaczyć wszystkie jego cykle, książki samodzielne oraz stopień skompletowania jego twórczości przez zalogowanego użytkownika.
* 🌐 **Bilingual (PL / EN):** Błyskawiczny przełącznik języka w prawym górnym rogu.

---

## 🛠️ Architektura i Baza Danych:
Szczegółowe wyjaśnienie doboru technologii (Next.js, PostgreSQL/Supabase, API Biblioteki Narodowej) znajdziesz w:
👉 [**`ARCHITEKTURA_I_TECHNOLOGIE.md`**](file:///C:/Users/Praca/Desktop/Plany/Biblioteka%20online/ARCHITEKTURA_I_TECHNOLOGIE.md).
