

# Plan: Naprawa emaila z zaproszenia partnera + logo w emailach webinarowych

## Zdiagnozowane problemy

1. **"undefined" w emailu** — `InviteToEventDialog.tsx` nie przekazuje `eventTitle`, `eventDate`, `eventTime`, `eventHost` do edge function. Wysyła tylko `email, firstName, lastName, phoneNumber, eventId, invitedByUserId`.

2. **Brak logo** — `send-webinar-confirmation` nie zawiera logo w żadnym szablonie HTML. Inne edge functions (np. `send-meeting-reminders`, `generate-meeting-guest-token`) używają `logoUrl = 'https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png'` — ten URL trzeba dodać.

3. **Treść emaila z zaproszenia partnera** — obecny email brzmi jak potwierdzenie samodzielnej rejestracji. Powinien informować, że gość został zaproszony przez partnera (imię, nazwisko, email, telefon partnera).

## Zmiany

### 1. `src/components/team-contacts/InviteToEventDialog.tsx`

- Rozszerzyć zapytanie do `events` o pola: `host_name`, `image_url`, `start_time`
- Pobrać profil zapraszającego partnera z `profiles` (first_name, last_name, email, phone_number)
- Przekazać do edge function: `eventTitle`, `eventDate`, `eventTime`, `eventHost`, `imageUrl`, plus nowe pole `inviterName`, `inviterEmail`, `inviterPhone`, `source: 'partner_invite'`

### 2. `supabase/functions/send-webinar-confirmation/index.ts`

**a) Dodać logo Pure Life** do WSZYSTKICH hardcoded szablonów HTML (confirmation, reminder, auto-webinar) — ten sam `logoUrl` co w innych edge functions, w złotym headerze.

**b) Nowy szablon emaila dla `source === 'partner_invite'`:**
- Nagłówek: złoty z logo Pure Life
- Treść: "Zostałeś/aś zaproszony/a na wydarzenie przez [imię nazwisko partnera]"
- Grafika wydarzenia (jeśli jest `image_url`)
- Tytuł, data, godzina, prowadzący
- Dane kontaktowe partnera (email, telefon)
- Stopka: "Jeżeli nie chcesz otrzymywać informacji o nowych wydarzeniach, prosimy o kontakt z osobą, która Cię zaprosiła — dane kontaktowe powyżej."

**c) Przyjąć nowe pola** w interfejsie: `inviterName`, `inviterEmail`, `inviterPhone`, `source`, `imageUrl`

### Podsumowanie plików

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/InviteToEventDialog.tsx` | Pobranie profilu partnera + pełnych danych wydarzenia, przekazanie do edge function |
| `supabase/functions/send-webinar-confirmation/index.ts` | Logo w headerze wszystkich szablonów + osobny szablon HTML dla zaproszeń od partnera z danymi zapraszającego |

