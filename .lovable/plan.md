# Poprawki formularza kontaktów prywatnych

## 1. Brak wychodzenia danych poza okna (PrivateContactForm + dialog)
Plik: `src/components/team-contacts/PrivateContactForm.tsx`, `TeamContactsTab.tsx`
- Wszystkie kontenery sekcji: dodać `min-w-0 overflow-hidden`, kolumny grid `min-w-0`.
- `Input`, `Select`, `Textarea`: `w-full max-w-full`, `Textarea` z `resize-none` lub `resize-y` w stałej szerokości (`w-full`).
- Wrapper grid: `grid-cols-1 lg:grid-cols-12 gap-4` z `min-w-0` na każdym dziecku, sekcje `lg:col-span-6 min-w-0`.
- Sekcja „Pierwszy / drugi kontakt" i „Przypomnienia": pola dat + select godzin w `flex flex-wrap gap-2 min-w-0`, każdy element `flex-1 min-w-[140px]`.
- DialogContent: zostawić `w-[96vw] h-[92vh]`, dodać wewnątrz `min-w-0` na content area i `overflow-x-hidden` na sekcji scrollowanej (tylko `overflow-y-auto`).
- Pola własne: input label `flex-1 min-w-0`, textarea `w-full`, przycisk usuń `shrink-0`.

## 2. Filtr priorytetu (gwiazdki) w panelu Filtry
Plik: `src/components/team-contacts/TeamContactsTab.tsx` (sekcja Filtry) + `src/hooks/useTeamContacts.ts` (lub miejsce filtrowania klienckiego — sprawdzę przy implementacji).
- Dodać nowy filtr `priorityFilter: 'all' | '0' | '1' | '2' | '3' | '4' | '5'`.
- UI: `Select` „Priorytet" obok „Status relacji" z opcjami: „Wszystkie", „Bez priorytetu (0)", „1 ⭐", „2 ⭐⭐", … „5 ⭐⭐⭐⭐⭐".
- Logika: `contact.priority_level === Number(priorityFilter)` (gdy != 'all').
- Reset filtru w przycisku „Wyczyść filtry" jeśli istnieje.

## 3. Gwiazdki widoczne przy kontakcie
Plik: `src/components/team-contacts/TeamContactAccordion.tsx` (nagłówek karty kontaktu).
- Obok imienia/nazwiska i Badge statusu renderować read-only `RatingElement` w mniejszym wariancie (gwiazdki 4×4 zamiast 6×6).
- Mały refactor `RatingElement`: dodać prop `size?: 'sm' | 'md'` (sm = `w-4 h-4`, md = obecne `w-6 h-6`), bez zmiany domyślnego zachowania.
- Pokazywać tylko gdy `priority_level > 0`; w innym przypadku nic (żeby nie zaśmiecać kart bez priorytetu).
- Widok rozwinięty (`ContactExpandedDetails.tsx`): pełne 5 gwiazdek (md) z labelem „Poziom zainteresowania" + lista pól własnych (`custom_fields`).

## Pliki do zmiany
- `src/components/team-contacts/PrivateContactForm.tsx` — overflow fix
- `src/components/team-contacts/TeamContactsTab.tsx` — filtr priorytetu + dialog overflow
- `src/components/team-contacts/TeamContactAccordion.tsx` — gwiazdki w nagłówku karty
- `src/components/team-contacts/ContactExpandedDetails.tsx` — gwiazdki + pola własne w detalach
- `src/hooks/useTeamContacts.ts` — obsługa nowego filtru (jeśli filtrowanie tam)
- `src/components/elements/RatingElement.tsx` — opcjonalny prop `size`

## Nienaruszalność
Bez zmian: schemat DB, RLS, edge functions, logika zapisu, kontakty `team_member`, eksporty, historia. Wyłącznie warstwa prezentacji + 1 nowy filtr kliencki.
