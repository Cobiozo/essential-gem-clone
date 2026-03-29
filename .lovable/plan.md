

## Plan: Rozwijane dane kontaktu + wiadomości z fikcyjnego czatu

### Problem
1. Kliknięcie w kontakt na liście nie rozwija żadnych szczegółów
2. Wiadomości pisane przez gości na fikcyjnym czacie nie są nigdzie zapisywane (żyją tylko w React state) — nie ma jak je później wyświetlić

### Rozwiązanie

#### 1. Nowa tabela: `auto_webinar_guest_messages`
Migracja SQL tworząca tabelę do persystencji wiadomości gości:
```sql
create table public.auto_webinar_guest_messages (
  id uuid primary key default gen_random_uuid(),
  guest_registration_id uuid references guest_event_registrations(id) on delete cascade,
  guest_email text not null,
  guest_name text,
  config_id uuid references auto_webinar_config(id) on delete cascade,
  video_id uuid references auto_webinar_videos(id) on delete set null,
  content text not null,
  sent_at_second integer not null,  -- sekunda nagrania w momencie wysłania
  created_at timestamptz default now()
);
alter table auto_webinar_guest_messages enable row level security;
-- Goście mogą wstawiać
create policy "guests_insert" on auto_webinar_guest_messages for insert with check (true);
-- Zalogowani użytkownicy mogą czytać (partnerzy widzą wiadomości swoich gości)
create policy "authenticated_select" on auto_webinar_guest_messages for select to authenticated using (true);
```

#### 2. Persystencja wiadomości gości — `AutoWebinarFakeChat.tsx`
- Przekazać nowe propsy: `guestRegistrationId`, `guestEmail`, `guestName`, `videoId`
- W `sendMessage` (lub nowej funkcji) po dodaniu do state, INSERT do `auto_webinar_guest_messages` z `sent_at_second = Math.floor(startOffset)`
- Fire-and-forget (nie blokuje UI czatu)

#### 3. Propagacja propsów — `AutoWebinarEmbed.tsx`
- Przekazać do `AutoWebinarFakeChat` dodatkowe propsy z kontekstu rejestracji gościa (już dostępne w komponencie)

#### 4. Rozwijane dane kontaktu — `EventGroupedContacts.tsx`
Po kliknięciu w wiersz kontaktu, rozwijają się pełne dane:
- **Dane osobowe**: email, telefon, notatki, data rejestracji, status
- **Dane oglądania**: czas dołączenia, czas oglądania (z istniejącego popovera, ale inline)
- **Wiadomości z czatu**: lista wiadomości gościa z minutą nagrania

Techniczne szczegóły:
- Dodać stan `expandedContactId` (string | null)
- Kliknięcie w wiersz kontaktu toggle'uje rozwinięcie
- Przy rozwinięciu fetch z `auto_webinar_guest_messages` po `guest_registration_id` lub `guest_email + config_id`
- Wyświetlenie listy: `💬 [12:34] "treść wiadomości"` (minuta:sekunda nagrania)

#### 5. Pliki do modyfikacji
1. **Migracja SQL** — nowa tabela `auto_webinar_guest_messages`
2. **`src/components/auto-webinar/AutoWebinarFakeChat.tsx`** — zapis wiadomości do DB
3. **`src/hooks/useAutoWebinarFakeChat.ts`** — dodanie logiki INSERT
4. **`src/components/auto-webinar/AutoWebinarEmbed.tsx`** — przekazanie propsów rejestracji
5. **`src/components/team-contacts/EventGroupedContacts.tsx`** — rozwijane szczegóły kontaktu z wiadomościami czatu

