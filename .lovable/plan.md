# Plan: Sekcja „Komunikacja/konwersacja z kontaktem"

## Cel
Przekształcić obecny blok „Pierwszy i drugi kontakt" w formularzu kontaktu CRM (`PrivateContactForm`) w pełną, wielowpisową historię konwersacji. Istniejące kontakty w bazie pozostają nietknięte — dla nich pokażemy starą sekcję w trybie tylko-do-odczytu (legacy) i pozwolimy dopisywać nowe wpisy w nowym układzie.

## Struktura nowego wpisu (jedna rozmowa)

Każdy wpis na liście historii:
- **Data kontaktu** (date) — kiedy odbyła się rozmowa
- **Kanał** (channel):
  - `offline` → podkanał: `face_to_face` (Spotkanie face to face)
  - `online` → podkanał: `phone`, `zoom`, `whatsapp`, `messenger`, `other_messenger`, `social_media`
- **Wynik** (result) — pokazywany tylko gdy podkanał = `phone`:
  - `answered` (Odebrał), `no_answer` (Nieodebrane), `wrong_number` (Błędny numer), `out_of_range` (Poza zasięgiem)
- **Data kolejnego kontaktu** (next_date) — opcjonalna
- **Adnotacja** (note) — tekst

Pierwszy wpis odpowiada „pierwszemu kontaktowi". Kolejne dodaje przycisk „➕ Dodaj kolejną rozmowę" — wpisy układają się chronologicznie z możliwością zwijania/rozwijania (akordeon), edycji i usuwania.

## Nad listą wpisów (read-only)
- **Data utworzenia kontaktu** — `added_at`, niezmienne (jak dziś).

## Zmiany w bazie danych

Nowa tabela `team_contact_conversations` przechowująca historię (jedna tabela, wiele wierszy na kontakt):

```text
team_contact_conversations
- id (uuid, pk)
- contact_id (uuid, fk → team_contacts.id, on delete cascade)
- user_id (uuid)            -- właściciel kontaktu, dla RLS
- contact_date (date)       -- data rozmowy
- channel (text)            -- 'offline' | 'online'
- subchannel (text)         -- 'face_to_face' | 'phone' | 'zoom' | 'whatsapp' | 'messenger' | 'other_messenger' | 'social_media'
- phone_result (text|null)  -- gdy subchannel='phone'
- next_contact_date (date|null)
- note (text|null)
- created_at, updated_at
- sort_index (int)          -- kolejność wpisów (1,2,3…)
```

- RLS: właściciel kontaktu (`user_id = auth.uid()`) ma pełny dostęp; admin pełny dostęp; index na `(contact_id, sort_index)`.
- GRANT-y dla `authenticated` i `service_role`.
- Pola legacy w `team_contacts` (`first_contact_result`, `first_contact_annotation`, `second_contact_date`, `next_contact_date`) **pozostają** w schemacie — używane tylko do wyświetlania starych kontaktów.

## Logika frontu (`src/components/team-contacts/PrivateContactForm.tsx`)

Nowa sekcja zastępuje aktualny blok (linie ~438–520):

1. **Nagłówek**: „Komunikacja/konwersacja z kontaktem" (klucz tłumaczeń `teamContacts.conversationHistory`).
2. **Tryb wyświetlania**:
   - Nowy kontakt (`!contact?.id`) lub kontakt bez starych pól → tylko nowy układ (historia wpisów).
   - Edycja kontaktu, który ma wypełnione legacy pola → pokaż mały kafelek „Dane archiwalne (pierwszy/drugi kontakt)" w trybie read-only + nowy układ poniżej z możliwością dopisywania konwersacji.
3. **Komponent listy wpisów** (nowy plik `ConversationHistoryEditor.tsx`):
   - Lokalny stan tablicy wpisów; przy edycji ładuje dane z `team_contact_conversations` przez hook `useContactConversations(contactId)`.
   - Przycisk „Dodaj kolejną rozmowę" dokleja pusty wpis.
   - Każdy wpis: pola Data, Kanał (Select offline/online), Podkanał (Select zależny od kanału), Wynik telefoniczny (Select widoczny tylko dla `phone`), Data kolejnego kontaktu, Adnotacja (Textarea), przycisk usuń.
   - Walidacja: data kontaktu ≥ data utworzenia kontaktu; data kolejnego ≥ data tego wpisu.
4. **Zapis**:
   - Tworzenie kontaktu: po insert do `team_contacts`, batch-insert wpisów do `team_contact_conversations`.
   - Edycja: upsert (po `id`) + delete usuniętych.
   - Pola legacy w nowych kontaktach nigdy nie są zapisywane.

## Wyświetlanie w akordeonie listy kontaktów (`TeamContactAccordion.tsx`)

- Sekcja „Pierwszy i drugi kontakt" w widoku szczegółów staje się „Komunikacja/konwersacja z kontaktem".
- Jeśli kontakt ma wpisy w `team_contact_conversations` → renderuj listę (data, kanał + podkanał, wynik, adnotacja, data kolejnego).
- Jeśli nie ma wpisów ale ma legacy pola → renderuj jak dziś (kompatybilność wstecz).

## Tłumaczenia
Dodać klucze w PL/EN/innych językach: `conversationHistory`, `addConversation`, `channelOffline`, `channelOnline`, `subFaceToFace`, `subPhone`, `subZoom`, `subWhatsApp`, `subMessenger`, `subOtherMessenger`, `subSocialMedia`, `phoneAnswered`, `phoneNoAnswer`, `phoneWrongNumber`, `phoneOutOfRange`, `legacyContactData`.

## Pliki do zmiany / utworzenia
- **Migracja**: nowa tabela `team_contact_conversations` + RLS + GRANT + index.
- **Nowy plik**: `src/components/team-contacts/ConversationHistoryEditor.tsx`
- **Nowy hook**: `src/hooks/useContactConversations.ts` (load/save/delete).
- **Edycja**: `src/components/team-contacts/PrivateContactForm.tsx` — zamiana sekcji + integracja zapisu.
- **Edycja**: `src/components/team-contacts/TeamContactAccordion.tsx` — render historii w podglądzie.
- **Edycja**: `src/components/team-contacts/types.ts` — typ `ContactConversation`.

## Co NIE zmienia się
- Schemat `team_contacts` (kolumny legacy zostają, nie kasujemy danych).
- Logika filtrów, eksportu, przypomnień (`reminder_date`, `next_contact_date` na kontakcie). Ewentualne podpięcie przypomnień do najnowszego wpisu — w osobnym kroku, po akceptacji tego planu.
