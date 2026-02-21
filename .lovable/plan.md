
# Web Push dla szkolen, wydarzen i spotkan + naprawa problemow

## Aktualny stan

Push notifications sa skonfigurowane (VAPID, Service Worker, `send-push-notification` Edge Function), ale wywolywane **tylko z panelu testowego admina**. Zadne realne zdarzenia (szkolenia, webinary, spotkania, czat) nie wysylaja Push. System `useEventSystem` (przetwarzanie eventow po stronie klienta) nie jest nigdzie uzywany w komponentach.

## Problemy do rozwiazania

1. **Push nigdzie nie wywolywany** - Edge Function `send-push-notification` istnieje, ale nie jest wywolywana z zadnego flow produkcyjnego
2. **useEventSystem dziala client-side** - jesli uzytkownik zamknie przegladarke przed przetworzeniem, powiadomienia nie powstana
3. **Brak Push w szkoleniach, webinarach i spotkaniach** - tylko email

## Rozwiazanie

Dodac wywolania `send-push-notification` do istniejacych Edge Functions serwerowych, ktore juz przetwarzaja powiadomienia. Dzieki temu Push bedzie wysylany **obok emaila**, niezaleznie od stanu przegladarki uzytkownika.

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `supabase/functions/process-pending-notifications/index.ts` | Dodac wywolania `send-push-notification` przy: (1) przypisaniu szkolenia, (2) przypomnieniu o szkoleniu, (3) przypomnieniu webinarowym 24h i 1h |
| `supabase/functions/send-meeting-reminders/index.ts` | Dodac wywolanie `send-push-notification` dla kazdego uczestnika spotkania indywidualnego przy przypomnieniu 1h i 15min |
| `supabase/functions/send-chat-notification-email/index.ts` | Dodac wywolanie `send-push-notification` gdy uzytkownik jest offline (razem z emailem lub zamiast jesli nie ma emaila) |

## Szczegoly techniczne

### 1. Szkolenia - nowe przypisanie (`process-pending-notifications`)

Po wyslaniu emaila o nowym szkoleniu, dodac:

```text
await supabase.functions.invoke("send-push-notification", {
  body: {
    userId: assignment.user_id,
    title: "Nowe szkolenie",
    body: `Przypisano Ci modul: ${assignment.module_title}`,
    url: "/training",
    tag: `training-new-${assignment.module_id}`
  }
});
```

### 2. Szkolenia - przypomnienie o nieaktywnosci (`process-pending-notifications`)

Po wyslaniu emaila z przypomnieniem, dodac:

```text
await supabase.functions.invoke("send-push-notification", {
  body: {
    userId: reminder.user_id,
    title: "Przypomnienie o szkoleniu",
    body: `Modul "${reminder.module_title}" czeka - ukonczyles ${reminder.progress_percent}%`,
    url: "/training",
    tag: `training-reminder-${reminder.module_id}`
  }
});
```

### 3. Webinary - przypomnienie 24h (`process-pending-notifications`)

Webinary maja tylko gosci (guest_event_registrations) z emailem, bez user_id. Trzeba sprawdzic, czy goscie sa powiazani z profilami uzytkownikow. Jesli tak - wyslac Push. Jesli nie (goscie zewnetrzni) - tylko email.

```text
// Sprawdz czy gosc ma konto w systemie
const { data: userProfile } = await supabase
  .from("profiles")
  .select("user_id")
  .eq("email", guest.email)
  .maybeSingle();

if (userProfile) {
  await supabase.functions.invoke("send-push-notification", {
    body: {
      userId: userProfile.user_id,
      title: `Webinar jutro: ${webinar.title}`,
      body: `Jutro o ${formattedTime}`,
      url: "/events",
      tag: `webinar-24h-${webinar.id}`
    }
  });
}
```

### 4. Webinary - przypomnienie 1h

Analogicznie jak 24h, z innym tytlem:

```text
title: `Webinar za godzine: ${webinar.title}`
```

### 5. Spotkania indywidualne (`send-meeting-reminders`)

Po wyslaniu emaila z przypomnieniem, dodac Push dla kazdego uczestnika:

```text
await supabase.functions.invoke("send-push-notification", {
  body: {
    userId: participant.user_id,
    title: reminderType === "1h" 
      ? "Spotkanie za godzine" 
      : "Spotkanie za 15 minut",
    body: `${meeting.title || "Spotkanie indywidualne"} - ${formattedTime}`,
    url: "/meetings",
    tag: `meeting-${reminderType}-${meeting.id}`
  }
});
```

### 6. Czat - offline fallback (`send-chat-notification-email`)

Gdy uzytkownik jest offline (last_seen_at > 5 min), przed wyslaniem emaila dodac Push:

```text
// Najpierw probuj Push (szybszy kanal)
try {
  await supabase.functions.invoke("send-push-notification", {
    body: {
      userId: recipient_id,
      title: `Wiadomosc od ${sender_name}`,
      body: message_content.substring(0, 100),
      url: "/messages",
      tag: `chat-${Date.now()}`
    }
  });
} catch (pushErr) {
  console.warn("Push failed, falling back to email only");
}

// Potem email jako fallback
```

### 7. Przeniesienie logiki useEventSystem na serwer

`useEventSystem` (przetwarzanie eventow client-side) nie jest uzywany nigdzie w komponentach, wiec nie wymaga migracji - jest martwym kodem. Realne powiadomienia sa tworzone przez:
- Triggery SQL (rejestracja, zatwierdzanie)
- Edge Functions CRON (szkolenia, webinary, spotkania)
- Bezposrednie inserty do `user_notifications`

Nie ma potrzeby tworzenia nowej Edge Function - wystarczy dodac wywolania `send-push-notification` do istniejacych Edge Functions.

## Obsluga bledow

Kazde wywolanie Push bedzie opakowane w try/catch, aby blad Push nie przerwal wysylki emaila. Push traktowany jako "best effort" - jesli sie nie powiedzie (np. brak subskrypcji), email nadal zostanie wyslany.

## Wplyw na istniejacy kod

- Brak zmian w bazie danych
- Brak nowych Edge Functions
- Brak zmian w kodzie frontendu
- Jedynie dodanie wywolan `send-push-notification` wewnatrz istniejacych Edge Functions
