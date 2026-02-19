
# Problem z kluczami VAPID i automatycznym odnowieniem subskrypcji

## Diagnoza rzeczywistego problemu

Klucze VAPID (wygenerowane 6 lutego) **same w sobie NIE wygasają** — są to trwałe klucze kryptograficzne. "14 dni" które widzisz w panelu to data wygenerowania, nie termin ważności.

**Prawdziwy problem to brakujące obsługa `pushsubscriptionchange` po stronie klienta.**

### Co się dzieje w praktyce

Przeglądarki (szczególnie Safari/iOS) **automatycznie odnawiają** subskrypcje push bez wiedzy użytkownika — zmienia się endpoint URL. Gdy to nastąpi:

1. Service Worker w `sw-push.js` odbiera zdarzenie `pushsubscriptionchange` ✅
2. Wysyła wiadomość `PUSH_SUBSCRIPTION_CHANGED` do React apki
3. React **NIE nasłuchuje** tej wiadomości — nowy endpoint NIE jest zapisywany do bazy ❌
4. Przy następnym wysłaniu powiadomienia — stary endpoint zwraca błąd 410/404
5. System usuwa subskrypcję jako "expired" i użytkownik traci powiadomienia

### Kiedy subskrypcje wygasają (poza zmianą kluczy VAPID)

- Safari/iOS — Apple Push odnawia tokeny po reinstalacji PWA, aktualizacji iOS
- FCM (Chrome, Brave, Edge, Opera) — wygasają po 270 dniach nieaktywności lub czyszczeniu danych przeglądarki
- Firefox — podobne zachowanie jak FCM
- **Zmiana kluczy VAPID = natychmiastowe unieważnienie WSZYSTKICH subskrypcji** (dlatego NIE należy ich regenerować bez potrzeby)

### Co widać w bazie danych

Aktualnie: 43 subskrypcje (26 Chrome, 11 Safari, 3 Edge, 1 Brave, 1 Opera, 1 Firefox).
Subskrypcje Safari z datą tworzenia sięgają 6 lutego — te mogą już mieć odnawiany endpoint przez Apple Push.

---

## Rozwiązanie — automatyczna obsługa odnowień

### Część 1: Service Worker — automatyczne ponowne subskrybowanie

Rozbudować `pushsubscriptionchange` w `public/sw-push.js` tak, żeby po odnowieniu subskrypcji przez przeglądarkę **Service Worker sam zapisał nową subskrypcję do bazy** (bez potrzeby działania użytkownika).

```javascript
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    // 1. Pobierz nową subskrypcję z nowym endpointem
    self.registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
    })
    .then(async (newSubscription) => {
      // 2. Wyślij nową subskrypcję do edge function
      const subJSON = newSubscription.toJSON();
      await fetch('https://xzlhssqqbajqhnsmbucf.supabase.co/functions/v1/renew-push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oldEndpoint: event.oldSubscription?.endpoint,
          newEndpoint: newSubscription.endpoint,
          p256dh: subJSON.keys?.p256dh,
          auth: subJSON.keys?.auth,
        }),
      });
    })
    .catch(err => console.error('[SW] pushsubscriptionchange failed:', err))
  );
});
```

### Część 2: Nowa Edge Function `renew-push-subscription`

Przyjmuje stary endpoint i nową subskrypcję, aktualizuje rekord w bazie `user_push_subscriptions` — **bez wymagania tokenu użytkownika** (Service Worker nie ma dostępu do JWT):

- Wyszukuje rekord po `oldEndpoint`
- Aktualizuje `endpoint`, `p256dh`, `auth`, `last_used_at`
- Resetuje `failure_count` do 0
- Loguje zdarzenie odnowienia

### Część 3: Nasłuch w React — backup dla gdy użytkownik ma otwartą aplikację

W `usePushNotifications.ts` dodać listener na wiadomość `PUSH_SUBSCRIPTION_CHANGED` z Service Workera i wywołać `checkSubscription()` + ponowne zapisanie endpointu do bazy.

### Część 4: Proaktywne odświeżanie w `usePushNotifications.ts`

Przy każdym zalogowaniu użytkownika — sprawdzić, czy endpoint w przeglądarce (`pushManager.getSubscription()`) zgadza się z tym w bazie danych. Jeśli nie — zaktualizować bazę. To obsługuje przypadek gdy SW nie zdążył zareagować (np. przeglądarka była zamknięta w momencie odnowienia).

---

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `public/sw-push.js` | Rozbudowa obsługi `pushsubscriptionchange` — automatyczne pobieranie nowej subskrypcji i wywołanie edge function |
| `supabase/functions/renew-push-subscription/index.ts` | Nowa edge function aktualizująca endpoint w bazie na podstawie starego endpointu (bez auth JWT) |
| `src/hooks/usePushNotifications.ts` | Listener na `PUSH_SUBSCRIPTION_CHANGED`, proaktywna weryfikacja endpointu przy logowaniu |

## Co NIE wymaga zmian

- Klucze VAPID **nie wymagają rotacji** — istniejące klucze z 6 lutego są ważne bezterminowo
- Nie trzeba prosić użytkowników o ponowną zgodę — cały proces jest transparentny
- Brak zmian w bazie danych — tabela `user_push_subscriptions` ma już wszystkie potrzebne kolumny

## Efekt końcowy

Gdy przeglądarka automatycznie odnowi subskrypcję (zmieni endpoint):
1. Service Worker natychmiast wywoła `renew-push-subscription` z nowym endpointem
2. Baza danych zostanie zaktualizowana bez wiedzy użytkownika
3. Użytkownik nadal otrzymuje powiadomienia bez przerwy
4. Przy kolejnym otwarciu aplikacji — dodatkowa weryfikacja spójności endpointu
