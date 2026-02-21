
# Naprawa systemu emaili dla spotkan indywidualnych

## Zidentyfikowane problemy

### Problem 1: BookMeetingDialog uzywa blednego event_type
Plik `BookMeetingDialog.tsx` (linia 201) tworzy wydarzenia z `event_type: 'private_meeting'` zamiast `'meeting_private'`. To powoduje, ze spotkania te nie sa widoczne w zadnym filtrze ani w systemie przypomnien.

### Problem 2: Brak wysylki emaili po rezerwacji (oba dialogi)
- `BookMeetingDialog.tsx` — po zarezerwowaniu spotkania NIE wywoluje `send-notification-email`. Brak jakiegokolwiek powiadomienia email.
- `useLeaderAvailability.ts` `bookMeeting()` — ten sam problem, brak emaili po rezerwacji.

### Problem 3: send-meeting-reminders pomija meeting_private
Edge Function `send-meeting-reminders` filtruje tylko `tripartite_meeting` i `partner_consultation` (linia 189). Spotkania indywidualne (`meeting_private`) sa calkowicie pominiete.

### Problem 4: Brak przypomnienia 24h
Szablon `meeting_reminder_24h` istnieje w bazie, ale nigdzie nie jest uzywany. Przypomnienia sa wysylane tylko 1h i 15min przed spotkaniem.

### Problem 5: BookMeetingDialog nie rejestruje hosta
`useLeaderAvailability.ts` rejestruje tylko uzytkownika rezerwujacego, ale nie hosta. Host nie pojawi sie w `event_registrations`, wiec nie dostanie przypomnien.

## Plan napraw

### 1. Naprawic event_type w BookMeetingDialog.tsx
Zmienic `'private_meeting'` na `'meeting_private'` (linia 201).

### 2. Dodac wysylke emaili po rezerwacji w BookMeetingDialog.tsx
Po utworzeniu wydarzenia i rejestracji, dodac wywolania `send-notification-email`:
- Do hosta (lidera): szablon `meeting_booked` z danymi rezerwujacego
- Do rezerwujacego: szablon `meeting_confirmed` z danymi lidera

### 3. Dodac wysylke emaili w useLeaderAvailability.ts bookMeeting()
Analogicznie — po utworzeniu eventu i rejestracji, wyslac emaile do obu stron. Dodatkowo zarejestrowac hosta w `event_registrations`.

### 4. Rozszerzyc send-meeting-reminders o meeting_private
Dodac `'meeting_private'` do filtra `event_type` w zapytaniu (linia 189). Dodac okno czasowe 24h (23h-25h przed spotkaniem) i uzyc szablonu `meeting_reminder_24h`.

### 5. Dodac rejestracje hosta w BookMeetingDialog.tsx
Po rejestracji uzytkownika dodac insert do `event_registrations` dla hosta (lidera), aby system przypomnien go uwzglednial.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/components/events/BookMeetingDialog.tsx` | Naprawic event_type na `meeting_private`, dodac rejestracje hosta, dodac wysylke 2 emaili (meeting_booked + meeting_confirmed) |
| `src/hooks/useLeaderAvailability.ts` | Dodac rejestracje hosta w event_registrations, dodac wysylke 2 emaili po rezerwacji |
| `supabase/functions/send-meeting-reminders/index.ts` | Dodac `meeting_private` do filtra event_type, dodac okno 24h z szablonem `meeting_reminder_24h` |

## Szczegoly techniczne

### BookMeetingDialog.tsx — zmiany

```text
// Linia 201: naprawic event_type
event_type: 'meeting_private',  // bylo: 'private_meeting'

// Po rejestracji uzytkownika (po linii 228): dodac rejestracje hosta
await supabase.from('event_registrations').insert({
  event_id: event.id,
  user_id: selectedTopic.leader_user_id,
  status: 'registered',
});

// Dodac wysylke emaili:
// 1. Email do hosta (meeting_booked)
supabase.functions.invoke('send-notification-email', {
  body: {
    event_type_id: '1a6d6530-c93e-4486-83b8-6f875a989d0b',
    recipient_user_id: selectedTopic.leader_user_id,
    payload: {
      temat: selectedTopic.title,
      data_spotkania: format(selectedDate, 'dd.MM.yyyy'),
      godzina_spotkania: selectedTime,
      imie_rezerwujacego: userProfile.first_name,
      nazwisko_rezerwujacego: userProfile.last_name,
    },
  },
}).catch(err => console.log('Email to leader failed:', err));

// 2. Email do rezerwujacego (meeting_confirmed)
supabase.functions.invoke('send-notification-email', {
  body: {
    event_type_id: '8f25b35a-1fb9-41e6-a6f2-d7b4863d092e',
    recipient_user_id: user.id,
    payload: {
      temat: selectedTopic.title,
      data_spotkania: format(selectedDate, 'dd.MM.yyyy'),
      godzina_spotkania: selectedTime,
      imie_lidera: selectedTopic.leader.first_name,
      nazwisko_lidera: selectedTopic.leader.last_name,
    },
  },
}).catch(err => console.log('Email to booker failed:', err));
```

### useLeaderAvailability.ts — zmiany

```text
// Po rejestracji uzytkownika (po linii 414): dodac rejestracje hosta
await supabase.from('event_registrations').insert({
  event_id: event.id,
  user_id: leaderUserId,
  status: 'registered',
});

// Pobrac profil uzytkownika
const { data: userProfile } = await supabase
  .from('profiles')
  .select('first_name, last_name')
  .eq('user_id', user.id)
  .single();

// Pobrac profil lidera
const { data: leaderProfile } = await supabase
  .from('profiles')
  .select('first_name, last_name')
  .eq('user_id', leaderUserId)
  .single();

// Email do hosta
supabase.functions.invoke('send-notification-email', {
  body: {
    event_type_id: '1a6d6530-c93e-4486-83b8-6f875a989d0b',
    recipient_user_id: leaderUserId,
    payload: {
      temat: topic.data?.title || 'Spotkanie prywatne',
      data_spotkania: format(new Date(startTime), 'dd.MM.yyyy'),
      godzina_spotkania: format(new Date(startTime), 'HH:mm'),
      imie_rezerwujacego: userProfile?.first_name || '',
      nazwisko_rezerwujacego: userProfile?.last_name || '',
    },
  },
}).catch(err => console.log('Email to leader failed:', err));

// Email do rezerwujacego
supabase.functions.invoke('send-notification-email', {
  body: {
    event_type_id: '8f25b35a-1fb9-41e6-a6f2-d7b4863d092e',
    recipient_user_id: user.id,
    payload: {
      temat: topic.data?.title || 'Spotkanie prywatne',
      data_spotkania: format(new Date(startTime), 'dd.MM.yyyy'),
      godzina_spotkania: format(new Date(startTime), 'HH:mm'),
      imie_lidera: leaderProfile?.first_name || '',
      nazwisko_lidera: leaderProfile?.last_name || '',
    },
  },
}).catch(err => console.log('Email to booker failed:', err));
```

### send-meeting-reminders — zmiany

1. Dodac `'meeting_private'` do filtra event_type (linia 189):
```text
.in('event_type', ['meeting_private', 'tripartite_meeting', 'partner_consultation'])
```

2. Dodac okno czasowe 24h:
```text
const reminder24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
const reminder24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);
```

3. Rozszerzyc zapytanie OR o okno 24h.

4. Pobrac szablon `meeting_reminder_24h` obok istniejacych szablonow.

5. Dodac logike `reminderType = '24h'` i uzyc szablonu `meeting_reminder_24h`.

## Analiza ostatnich 7 dni

Zapytanie do bazy pokazalo, ze w ciagu ostatnich 7 dni NIE BYLO zadnych spotkan indywidualnych (`meeting_private`). Moga jednak istniec spotkania z blednym typem `private_meeting` (z BookMeetingDialog). Te nie beda widoczne w zadnym systemie.

## Wplyw na istniejacy kod

- Nie narusza istniejacych flow dla `tripartite_meeting` i `partner_consultation` — te dzialaja poprawnie
- Nie zmienia logiki anulowania — `cancel-individual-meeting` juz dziala prawidlowo
- Nie wymaga zmian w bazie danych — szablony i typy juz istnieja
- Dodaje brakujaca funkcjonalnosc bez usuwania istniejacego kodu
