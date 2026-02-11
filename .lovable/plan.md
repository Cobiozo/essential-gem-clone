

# Plan: Usprawnienie tlumaczen + Akcje rozwiazujace w alertach systemowych

## Czesc 1: Usprawnienie procesu tlumaczenia

### Problem
Obecny system tlumaczenia dziala wolno z kilku powodow:
- Batch size wynosi zaledwie 8 kluczy na partie w edge function `background-translate`
- Kazdy klucz CMS jest tlumaczony osobnym wywolaniem AI (funkcja `translateText` wywolywana po kolei dla kazdego pola)
- Opoznienie 300-500ms miedzy kazdym batchem
- Limit czasu edge function (55s) powoduje przerywanie pracy i koniecznosc wznawiania

### Rozwiazanie

**Plik: `supabase/functions/background-translate/index.ts`**

1. **Zwieksz batch size** z 8 na 20 kluczy — AI dobrze radzi sobie z wiekszymi porcjami
2. **Grupuj tlumaczenia CMS** — zamiast tlumaczc kazde pole osobno (tytul, opis, naglowek osobno), wyslij caly obiekt sekcji/itemu jako jeden request do AI z instrukcja "przetlumacz wszystkie pola"
3. **Zmniejsz delay miedzy batchami** z 300-500ms na 100ms (rate limiting jest i tak obslugiwany)
4. **Dodaj retry z exponential backoff** przy bledzie 429 (rate limit) zamiast zwracac oryginalny tekst
5. **Batch CMS items** — tlumacz kilka CMS items naraz jednym zapytaniem do AI zamiast osobno

**Plik: `supabase/functions/translate-content/index.ts`**
- Zwieksz wewnetrzny batch size z 12 na 25 kluczy (uzywane przy recznym tlumaczeniu z frontendu)

**Plik: `src/hooks/useTranslations.ts`**
- Zwieksz `batchSize` z 12 na 25
- Zwieksz `parallelLimit` z 3 na 5 rownoleglych batchy

### Szacowany efekt
- Przetlumaczenie 500 kluczy powinno zajac okolo 2-3 minuty zamiast 10-15 minut
- CMS z 30 elementami: 1-2 minuty zamiast 5-8 minut

---

## Czesc 2: Przyciski akcji rozwiazujacych w alertach systemowych

### Problem
Alerty systemowe pokazuja sugestie tekstowe, ale admin musi sam szukac sposobu rozwiazania. Brakuje konkretnych przyciskow akcji.

### Rozwiazanie

**Plik: `src/components/admin/SystemHealthAlertsPanel.tsx`**

Dodanie systemu przyciskow akcji obok "Oznacz jako rozwiazane" dla kazdego typu alertu:

#### Mapowanie typ alertu na akcje:

| Typ alertu | Przycisk akcji | Co robi |
|---|---|---|
| `missing_training_group` | "Wyslij baner: Odswiez akademie" | Tworzy powiadomienie w bazie dla wszystkich uzytkownikow z brakujacymi szkoleniami — baner w Akademii z tekstem "Odswiez akademie i kontynuuj szkolenia" |
| `missing_role` / `missing_role_group` | "Przejdz do uzytkownikow" | Nawiguje do zakladki Uzytkownicy z filtrem "bez roli" |
| `unapproved_user_24h` | "Zatwierdz konto" | Nawiguje do zakladki Uzytkownicy z filtrem oczekujacych |
| `google_calendar_disconnected` | "Wyslij przypomnienie" | Tworzy powiadomienie w aplikacji dla lidera z prosba o polaczenie Google Calendar |

#### Implementacja banera "Odswiez akademie":

**Nowa funkcja w `SystemHealthAlertsPanel.tsx`:**
- `handleSendRefreshBanner(alert)` — pobiera liste uzytkownikow z metadanych alertu (sample_users)
- Dla kazdego user_id tworzy wpis w tabeli `notifications` z typem `training_refresh_reminder` i trescia "Wykryto brakujace szkolenia. Kliknij 'Odswiez akademie' na stronie Szkolenia, aby zsynchronizowac dostepne materialy."
- Po wyslaniu wyswietla toast "Wyslano baner do X uzytkownikow"

**Plik: `src/pages/Training.tsx`**
- Dodanie zapytania o powiadomienia typu `training_refresh_reminder` (nieodczytane)
- Jesli istnieja — wyswietlenie zoltego banera nad lista modulow: "Wykryto brakujace szkolenia. Kliknij ponizej aby zsynchronizowac." z przyciskiem "Odswiez akademie"
- Po kliknieciu i udanym odswiezeniu — automatyczne oznaczenie powiadomienia jako odczytanego

#### Wyglad przyciskow akcji w alercie:

Obok istniejacego przycisku "Oznacz jako rozwiazane" pojawi sie drugi przycisk (lub wiecej) z konkretna akcja. Przyklad dla `missing_training_group`:

```text
[Wyslij baner: Odswiez akademie]  [Oznacz jako rozwiazane]
```

Przyciski akcji beda mialy wariant `default` (wyrazisty), a "Oznacz jako rozwiazane" pozostanie `outline`.

### Zakres zmian plikow

1. `supabase/functions/background-translate/index.ts` — wieksze batche, grupowanie CMS, mniej opoznien
2. `supabase/functions/translate-content/index.ts` — wiekszy batch size
3. `src/hooks/useTranslations.ts` — wieksze batche i wiecej rownoleglych zadan
4. `src/components/admin/SystemHealthAlertsPanel.tsx` — przyciski akcji, logika wysylania banerow/powiadomien
5. `src/pages/Training.tsx` — baner informacyjny o koniecznosci odswiezenia akademii

