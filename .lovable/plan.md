## 1. Naprawa nakładających się zakładek (mobile)

**`src/components/team-contacts/TeamContactsTab.tsx`** (linie 345–380)

Główny `TabsList` używa siatki `grid-cols-N` z `minmax(0, 1fr)` — na wąskim ekranie 4 zakładki (Kontakty prywatne / Członkowie zespołu / Szukaj / Struktura) są ściskane do tego stopnia, że teksty etykiet nachodzą na siebie i pasek przewijania pojawia się pod spodem.

Zmiana: zastąpić siatkę poziomo-przewijalnym flex-em:
- `TabsList` → `flex w-full overflow-x-auto whitespace-nowrap gap-1 lg:w-auto lg:inline-flex` (bez `grid` i bez inline `style`).
- Każdy `TabsTrigger` dostaje `shrink-0`, żeby nie ściskał się poniżej własnej zawartości.
- Skrócone etykiety mobilne zostają (`Prywatne`, `Zespół`, `Szukaj`, `Struktura`).

Dzięki temu na mobile zakładki układają się jedna po drugiej w jednym rzędzie i, jeśli nie mieszczą się, użytkownik przewija je poziomo — bez nakładania.

## 2. Zmiana nazwy zakładki HK + przycisk usuwania

**`src/components/team-contacts/TeamContactsTab.tsx`** (linia 520)
- Tekst przycisku `Z udostępnionego materiału ZW` → **`Z udostępnionego materiału BW`**.

**`src/components/team-contacts/HKMaterialContactsList.tsx`** (sekcja przycisków akcji, linie 217–277)
- Aktualnie przycisk usunięcia (Trash2) pojawia się tylko gdy `moved && onDelete && movedContact`.
- Dodajemy drugi tryb: jeśli sesja NIE jest jeszcze przeniesiona do mojej listy (`!moved`), pokazujemy przycisk „Usuń z listy" (Trash2 w kolorze destructive). Klik wywołuje nową prop `onDeleteSession(session_id)` po potwierdzeniu w AlertDialog (re-używamy istniejący `deleteConfirm` rozszerzony o typ `{kind: 'contact'|'session', id}`).

**`src/components/team-contacts/TeamContactsTab.tsx`** (przekazanie propsa do `HKMaterialContactsList`, linia 596)
- Dodajemy `onDeleteSession={deleteHkSession}` — handler ukrywa sesję lokalnie (filtrowanie `hkSessions` po `session_id`), bez zmian w DB. Toast „Usunięto z listy". Sesja wróci po `fetchHkSessions()` przy następnym wejściu / odświeżeniu — i to jest OK, bo nie chcemy trwale kasować logu sesji w `infolink_sessions`. (Jeśli wolisz trwałe ukrycie po stronie serwera, dopisz mi to — wymagałoby kolumny `hidden_for_partner_at` w tabeli sesji i osobnej migracji; domyślnie idę w wersję client-side, zgodnie z duchem listy „surowych" sesji.)

## 3. Trwałe usunięcie kontaktu w zakładce „Usunięte"

**`src/hooks/useTeamContacts.ts`** (po `restoreContact`, ok. linia 330)
- Nowa funkcja `permanentlyDeleteContact(id)`:
  - `await supabase.from('team_contacts').delete().eq('id', id)` — twardy DELETE (RLS pozwala właścicielowi).
  - Po sukcesie: `fetchDeletedContacts()`, toast „Kontakt usunięty trwale".
- Eksport w return value razem z `restoreContact`.

**`src/components/team-contacts/TeamContactsTab.tsx`** (destructuring na linii 71 + przekazanie do `DeletedContactsList` linia 548)
- Dodać `permanentlyDeleteContact` do destruktury hooka i przekazać jako `onPermanentDelete`.

**`src/components/team-contacts/DeletedContactsList.tsx`**
- Nowa opcjonalna prop `onPermanentDelete: (id: string) => void`.
- Obok przycisku „Przywróć" dodać czerwony `Button variant="destructive" size="sm"` z ikoną `Trash2` i tekstem „Usuń trwale".
- Klik otwiera lokalny `AlertDialog` z potwierdzeniem („Tej operacji nie można cofnąć. Kontakt zostanie nieodwracalnie usunięty z bazy.") i dopiero po potwierdzeniu wywołuje `onPermanentDelete(contact.id)`.

## Bez zmian
- Schema bazy, RLS, edge functions, migracje.
- Logika `priority_traits` / formularz prywatnego kontaktu.
- Pozostałe zakładki, eksport, struktura organizacji.
