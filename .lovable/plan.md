# Plan: zamiana sekcji + usunięcie błędnego automatycznego zapisu

## 1. Zamiana miejscami sekcji w formularzu „Dodaj/Edytuj kontakt prywatny"

Plik: `src/components/team-contacts/PrivateContactForm.tsx`

Aktualnie w prawej kolumnie:
- góra: **Notatki z rozmów**
- dół: **Komunikacja/konwersacja z kontaktem**

Po zmianie (proste przeniesienie bloków `<Section>` — bez zmiany logiki, walidacji, stanu, zapisu):
- góra: **Komunikacja/konwersacja z kontaktem** (obok „Dane kontaktu")
- dół: **Notatki z rozmów** (obok „Klasyfikacja / Priorytetyzacja")

Brak zmian w danych, hookach i funkcjach zapisu.

## 2. Usunięcie błędnego komunikatu „Automatycznie dodany po rejestracji – oczekuje na zatwierdzenie"

### Skąd pochodzi
Wartość jest wstawiana do `team_contacts.notes` przez funkcję triggera `handle_new_user` (ostatnio w migracji `20260220232157_...sql`). Wyświetlana jest w karcie członka zespołu w sekcji „Notatki" (`TeamContactAccordion`) — wprowadza w błąd, bo nie odzwierciedla faktycznego statusu konta (`Status konta: Aktywny`).

### Co zrobimy (jedna migracja)
1. **CREATE OR REPLACE FUNCTION `public.handle_new_user`** — identyczna logika jak obecnie, ale w `INSERT INTO public.team_contacts (...)` pole `notes` ustawiamy na `NULL` zarówno dla głównej gałęzi (auto-dodanie do bazy opiekuna), jak i dla pozostałych miejsc, które wstawiały tę samą frazę (m.in. fallback „Automatycznie dodany - naprawiony wpis", jeżeli pojawia się w aktualnej wersji funkcji — po prostu nie zapisujemy żadnego komunikatu w `notes`).
2. **Czyszczenie istniejących rekordów** — jednorazowy `UPDATE`:
   ```sql
   UPDATE public.team_contacts
   SET notes = NULL
   WHERE contact_type = 'team_member'
     AND notes IN (
       'Automatycznie dodany po rejestracji - oczekuje na zatwierdzenie',
       'Automatycznie dodany po rejestracji',
       'Automatycznie dodany - naprawiony wpis'
     );
   ```
   Dzięki temu w UI pole „Notatki" po prostu zniknie/zostanie puste dla wszystkich obecnych kontaktów, których notatka była tylko automatycznym placeholderem. Notatki wpisane ręcznie przez użytkownika pozostają nietknięte.

### Czego NIE ruszamy
- Schemat tabeli `team_contacts`, RLS, GRANT-y, indeksy — bez zmian.
- Logika zatwierdzeń (Guardian/Leader), powiadomienia, profile — bez zmian.
- Frontend nie wymaga zmian dla tego punktu — sekcja „Notatki" w karcie sama zniknie, gdy `notes` jest puste.

## Pliki

- edytowany: `src/components/team-contacts/PrivateContactForm.tsx` (zamiana kolejności dwóch sekcji)
- nowa migracja: `supabase/migrations/<timestamp>_remove_auto_team_contact_note.sql` (CREATE OR REPLACE `handle_new_user` + UPDATE czyszczący istniejące notatki)
