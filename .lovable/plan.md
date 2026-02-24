

## Dodanie powiadomień in-app, Push i ulepszenie e-maili dla spotkań indywidualnych

### Zakres zmian

Trzy pliki wymagają modyfikacji:

1. **`src/components/events/PartnerMeetingBooking.tsx`** -- dodanie powiadomień in-app i Push przy rezerwacji
2. **`supabase/functions/send-meeting-reminders/index.ts`** -- dodanie powiadomień in-app przy przypomnieniach + naprawa Push 24h + dodanie info o uczestnikach w e-mailach
3. **`supabase/functions/cancel-individual-meeting/index.ts`** -- dodanie powiadomień in-app i Push przy anulowaniu + dodanie info o uczestnikach w e-mailach

---

### 1. Rezerwacja spotkania (`PartnerMeetingBooking.tsx`)

Po utworzeniu wydarzenia i wysłaniu e-maili, dodać:

**a) Powiadomienie in-app dla lidera (host):**
```
Tytuł: "Nowa rezerwacja spotkania"
Treść: "{imię_rezerwującego} {nazwisko} zarezerwował(a) spotkanie {typ} na {data} o {godzina}"
Link: /meetings
```

**b) Powiadomienie in-app dla partnera (booker):**
```
Tytuł: "Spotkanie potwierdzone"
Treść: "Twoje spotkanie z {imię_lidera} {nazwisko} ({typ}) zostało potwierdzone na {data} o {godzina}"
Link: /meetings
```

**c) Push notification dla lidera:**
```
Tytuł: "Nowa rezerwacja spotkania"
Body: "{imię_rezerwującego} zarezerwował(a) {typ} na {data} {godzina}"
```

**d) Push notification dla partnera (booker):**
```
Tytuł: "Spotkanie potwierdzone"
Body: "Spotkanie z {imię_lidera} potwierdzone na {data} {godzina}"
```

**e) Rozszerzenie e-maili o dane uczestników:**
- E-mail do lidera: dodać imię i nazwisko rezerwującego (już jest)
- E-mail do bookera: dodać imię i nazwisko lidera (już jest)
- OK, e-maile przy rezerwacji już zawierają dane uczestników.

---

### 2. Przypomnienia CRON (`send-meeting-reminders/index.ts`)

**a) Naprawa Push 24h:**
Obecny kod:
```typescript
title: reminderType === '1h' 
  ? "Spotkanie za godzinę" 
  : "Spotkanie za 15 minut"
```
Zmiana na:
```typescript
title: reminderType === '24h' 
  ? "Spotkanie jutro"
  : reminderType === '1h' 
    ? "Spotkanie za godzinę" 
    : "Spotkanie za 15 minut"
```

**b) Dodanie powiadomień in-app przy każdym przypomnieniu (24h, 1h, 15min):**
Po wysłaniu e-maila i Push, wstawić `user_notifications` z:
```
Tytuł: "Przypomnienie: {tytuł_spotkania}"
Treść: "Spotkanie z {druga_strona} — {data} o {godzina} ({typ_przypomnienia})"
Link: /meetings
```

**c) Dodanie danych uczestników do zmiennych e-maila:**
Dodać zmienne `imie_rezerwujacego`, `nazwisko_rezerwujacego`, `imie_lidera`, `nazwisko_lidera` do templatek, aby każdy e-mail zawierał informację kto jest uczestnikiem spotkania i kto je zarezerwował.

---

### 3. Anulowanie spotkania (`cancel-individual-meeting/index.ts`)

**a) Dodanie powiadomień in-app dla wszystkich uczestników:**
Po anulowaniu, przed wysyłką e-maili, wstawić `user_notifications`:
```
Tytuł: "Spotkanie anulowane"
Treść: "{kto_anulował} anulował(a) spotkanie {tytuł} ({data} {godzina})"
Link: /meetings
```

**b) Dodanie Push notification dla wszystkich uczestników:**
```
Tytuł: "Spotkanie anulowane"
Body: "{kto_anulował} anulował(a) {tytuł} — {data} {godzina}"
```

**c) Rozszerzenie e-maili o dane uczestników:**
Dodać do payload e-maila:
- `imie_lidera`, `nazwisko_lidera` (prowadzący)
- `imie_rezerwujacego`, `nazwisko_rezerwujacego` (osoba rezerwująca)
- `kto_odwolal` (już jest)

Pobrać profile wszystkich uczestników i wzbogacić payload.

---

### Szczegoly techniczne

| Plik | Zmiana |
|------|--------|
| `src/components/events/PartnerMeetingBooking.tsx` | Dodanie 2x insert `user_notifications` + 2x invoke `send-push-notification` po rezerwacji |
| `supabase/functions/send-meeting-reminders/index.ts` | Naprawa ternary Push title dla 24h, dodanie insert `user_notifications` w petli, dodanie zmiennych uczestników |
| `supabase/functions/cancel-individual-meeting/index.ts` | Dodanie insert `user_notifications` + invoke `send-push-notification` w pętli po anulowaniu, dodanie danych uczestników do e-maila |

### Bez zmian w bazie danych
Wszystkie tabele (`user_notifications`, `meeting_reminders_sent`) już istnieją. Nie trzeba migracji.

