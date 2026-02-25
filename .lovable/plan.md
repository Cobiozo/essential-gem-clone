

## Naprawa linkow powiadomien o spotkaniach + diagnostyka Push

### Problem 1: Link `/meetings` prowadzi do 404

Wszystkie powiadomienia o spotkaniach (in-app, push, remindery) ustawiaja link na `/meetings`, ale taka trasa nie istnieje. Poprawna trasa to **`/events/individual-meetings`**.

Dotyczy to 3 plikow:

1. **`src/components/events/PartnerMeetingBooking.tsx`** (4 miejsca):
   - linia 675: in-app dla lidera `link: '/meetings'` --> `'/events/individual-meetings'`
   - linia 686: in-app dla rezerwujacego `link: '/meetings'` --> `'/events/individual-meetings'`
   - linia 696: push dla lidera `url: '/meetings'` --> `'/events/individual-meetings'`
   - linia 706: push dla rezerwujacego `url: '/meetings'` --> `'/events/individual-meetings'`

2. **`supabase/functions/send-meeting-reminders/index.ts`** (linia 453):
   - `link: '/meetings'` --> `'/events/individual-meetings'`

3. **`supabase/functions/cancel-individual-meeting/index.ts`** (linia 226):
   - `link: '/meetings'` --> `'/events/individual-meetings'`

### Problem 2: Push notification nie dotarlo

Logi edge function `send-push-notification` z 00:14:57 pokazuja:
- Wysylka do uzytkownika 629a2d9a: **4 wysłane, 1 nieudany**
- Nieudany to Safari (mobile) z bledem `VapidPkHashMismatch` -- klucz VAPID nie pasuje do subskrypcji Safari
- Pozostale 4 (Chrome desktop, Edge desktop, Opera desktop, Safari mobile) -- oznaczone jako wyslane

Mozliwe przyczyny braku powiadomienia push:
- Przegladarka mogla je zablokowac (tryb focus/DND)
- Subskrypcje moga byc nieaktualne
- Safari ma znany problem z `VapidPkHashMismatch`

Zalecenie: po naprawie linkow, ponowna rejestracja subskrypcji push (wylogowanie/zalogowanie lub reset uprawnien powiadomien w przegladarce).

### Zmiany do wykonania

- 4 edycje w `PartnerMeetingBooking.tsx`: zamiana `/meetings` na `/events/individual-meetings`
- 1 edycja w `send-meeting-reminders/index.ts`: zamiana linku
- 1 edycja w `cancel-individual-meeting/index.ts`: zamiana linku
- Deploy obu edge functions po zmianach
