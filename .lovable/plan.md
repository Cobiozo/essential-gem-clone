## Zmiany w `src/components/team-contacts/PrivateContactForm.tsx`

1. **Usunięcie etykiety „Poziom zainteresowania"** — kasuję `<Label>Poziom zainteresowania</Label>` nad listą 5 cech (linia 322). Gwiazdki cech zostają bez zmian.

2. **Zmiana tytułu sekcji** — sekcja klasyfikacji (linia 316) z „Klasyfikacja" → **„Klasyfikacja / Priorytetyzacja"** (zarówno tekst domyślny, jak i klucz tłumaczenia pozostaje, zmieniam tylko fallback).

3. **Przeniesienie „Notatki z rozmów" pod „Dane kontaktu"** — sekcja Notatki (linie 551–564) ląduje zaraz po sekcji „Dane kontaktu" (po linii 312). Sekcja zmienia szerokość z `lg:col-span-12` na `lg:col-span-6`, żeby zmieściła się obok/pod „Dane kontaktu" w siatce 12-kolumnowej. (Ponieważ „Dane kontaktu" zajmuje lewe 6 kolumn, a „Klasyfikacja" prawe 6, Notatki trafią pod „Dane kontaktu" po lewej stronie — symetrycznie do Klasyfikacji po prawej.)

4. **Naprawa scrolla (nie da się zjechać niżej niż pola własne)** — `<form>` ma teraz `flex flex-col h-full`. W kontekście rodzica `DialogContent` (też `flex flex-col`) `h-full` nie nadaje formularzowi proporcjonalnej wysokości, przez co wewnętrzny kontener z `overflow-y-auto` nie jest ograniczony i kolejne sekcje wypychają się poza widoczny obszar dialogu. Zmieniam klasy formularza na `flex-1 min-h-0 flex flex-col` — wtedy `overflow-y-auto` w środku faktycznie scrolluje, a sticky footer pozostaje na dole. Bez zmian w `TeamContactsTab.tsx`.

## Bez zmian

- Logika zapisu (`priority_traits`, `priority_level`, `custom_fields`, `notes`).
- Migracje, RLS, edge functions.
- Komponent `RatingElement`, badge sumy, pozostałe sekcje (Pierwszy/drugi kontakt, Przypomnienia, Pola własne, Historia eventów).
