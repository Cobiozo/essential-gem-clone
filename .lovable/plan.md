

# Plan: Naprawa modalu powiadomien + diagnostyka Brave

## Problem 1: Modal nie zamyka sie po wyrazeniu zgody

**Plik:** `src/components/notifications/PushNotificationModal.tsx`

Aktualnie `handleEnable` zamyka modal tylko gdy `subscribe()` zwroci `true`. Jesli subskrypcja sie nie powiedzie (np. blad zapisu do bazy), modal pozostaje otwarty mimo ze uzytkownik wyrazil zgode w przegladarce.

### Rozwiazanie:

1. Zamykac modal po kazdej probie (uzytkownik juz podjal decyzje)
2. Dodac reaktywny `useEffect` zamykajacy modal gdy `isSubscribed` zmieni sie na `true`

```tsx
// Zmiana handleEnable - zawsze zamykaj
const handleEnable = async () => {
  await subscribe();
  setShowModal(false); // zawsze zamknij, niezaleznie od wyniku
};

// Dodatkowy useEffect - reaktywne zamkniecie
useEffect(() => {
  if (isSubscribed && showModal) {
    setShowModal(false);
  }
}, [isSubscribed, showModal]);
```

---

## Problem 2: Brave nie otrzymuje powiadomien push

### Analiza

Subskrypcja Brave w bazie (user `818aef5e`, urzadzenie mobilne) posiada prawidlowy endpoint FCM (`fcm.googleapis.com`), ale:
- `last_success_at` = null (zadne powiadomienie nigdy nie dotarlo)
- Brak wpisow w `push_notification_logs` dla tego uzytkownika
- Oznacza to, ze **zadne powiadomienie nie bylo nigdy wyslane** do tego uzytkownika

### Mozliwe przyczyny na Brave:
1. **Brave Shields** blokuja Service Worker lub push events
2. Brave moze wymagac wylaczenia "Block cross-site trackers" dla powiadomien push
3. Na Androidzie Brave moze wymagac dodatkowych uprawnien systemowych

### Rozwiazanie - diagnostyka i lepsze logowanie:

Dodanie w `usePushNotifications.ts` dodatkowego logowania po subskrypcji, aby zweryfikowac czy subskrypcja Brave jest prawidlowa:

```tsx
console.log('[usePushNotifications] Subscription details:', {
  endpoint: subscription.endpoint,
  hasP256dh: !!subscriptionJSON.keys?.p256dh,
  hasAuth: !!subscriptionJSON.keys?.auth,
  browser: browserInfo.name,
});
```

Oraz wyslanie testowego powiadomienia natychmiast po subskrypcji, aby zweryfikowac dzialanie:

```tsx
// Po zapisaniu subskrypcji do bazy, wyslij testowe powiadomienie
try {
  await supabase.functions.invoke('send-push-notification', {
    body: {
      userId: user.id,
      title: 'Powiadomienia wlaczone!',
      body: 'Bedziesz otrzymywac powiadomienia o nowych wiadomosciach.',
      url: '/dashboard',
      tag: 'subscription-confirmed',
    },
  });
  console.log('[usePushNotifications] Test notification sent after subscription');
} catch (testErr) {
  console.warn('[usePushNotifications] Failed to send test notification:', testErr);
}
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/notifications/PushNotificationModal.tsx` | Zamykanie modalu po kazdej probie + reaktywny useEffect |
| `src/hooks/usePushNotifications.ts` | Dodatkowe logowanie + automatyczne testowe powiadomienie po subskrypcji |

## Oczekiwane rezultaty

1. Modal zamyka sie natychmiast po kliknieciu "Wlacz powiadomienia"
2. Po subskrypcji uzytkownik otrzymuje testowe powiadomienie potwierdzajace dzialanie
3. Lepsze logowanie pozwoli zdiagnozowac problemy z Brave

