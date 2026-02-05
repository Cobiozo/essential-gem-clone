
# Plan: Naprawa systemu powiadomień czatu

## Zidentyfikowane problemy

### Problem 1: Edge Function nie jest wdrożona
Funkcja `send-chat-notification-email` istnieje w kodzie, ale **NIE została wdrożona** do Supabase. Logi sieciowe pokazują błędy "Failed to fetch".

### Problem 2: Browser notifications nie działają
- Prośba o uprawnienia jest wywoływana automatycznie w `useEffect` - **przeglądarki blokują to**
- Dodatkowo flaga `enableBrowserNotifications: true` **nie jest nigdzie ustawiona** w `useNotifications`

### Problem 3: Brak subskrypcji real-time dla wiadomości czatu
System powiadomień bazuje na tabeli `user_notifications`, ale w tle (gdy bell zamknięty) subskrypcja real-time jest **nieaktywna**.

---

## Rozwiązanie

| Plik | Zmiana |
|------|--------|
| `supabase/functions/send-chat-notification-email/` | Deploy Edge Function |
| `src/pages/MessagesPage.tsx` | Dodanie przycisku "Włącz powiadomienia" zamiast auto-prompt |
| `src/components/messages/NotificationPermissionBanner.tsx` | Nowy komponent - banner z prośbą o uprawnienia |
| `src/hooks/useNotifications.ts` | Oddzielna subskrypcja real-time dla `role_chat_messages` |

---

## Szczegóły implementacji

### 1. Deploy Edge Function
Muszę uruchomić deploy funkcji `send-chat-notification-email`.

### 2. NotificationPermissionBanner.tsx (nowy komponent)
Zamiast automatycznego promptu (blokowanego przez przeglądarki), wyświetlimy banner na stronie `/messages`:

```tsx
const NotificationPermissionBanner = () => {
  const { permission, requestPermission, isSupported } = useBrowserNotifications();
  
  if (!isSupported || permission !== 'default') return null;
  
  const handleEnable = async () => {
    // User gesture → przeglądarka zezwoli
    await requestPermission();
  };
  
  return (
    <Alert>
      <Bell className="h-4 w-4" />
      <AlertTitle>Włącz powiadomienia</AlertTitle>
      <AlertDescription>
        Otrzymuj powiadomienia o nowych wiadomościach gdy aplikacja jest w tle.
      </AlertDescription>
      <Button onClick={handleEnable}>
        Włącz powiadomienia
      </Button>
    </Alert>
  );
};
```

### 3. MessagesPage.tsx - usunięcie auto-promptu
Usunięcie `useEffect` z automatycznym `requestPermission()` i zastąpienie go bannerem.

### 4. Subskrypcja real-time wiadomości czatu
Dodanie dedykowanej subskrypcji w `MessagesPage.tsx` na nowe wiadomości w tabeli `role_chat_messages`:

```tsx
useEffect(() => {
  if (!user) return;
  
  const channel = supabase
    .channel('chat-notifications')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'role_chat_messages',
      filter: `recipient_id=eq.${user.id}`,
    }, (payload) => {
      // Pokaż browser notification gdy tab w tle
      if (document.hidden && permission === 'granted') {
        showNotification(`Nowa wiadomość`, {
          body: payload.new.content?.substring(0, 100) || 'Otrzymałeś nową wiadomość',
          tag: payload.new.id,
          data: { link: '/messages' },
        });
      }
    })
    .subscribe();
    
  return () => supabase.removeChannel(channel);
}, [user, permission]);
```

---

## Priorytetyzacja

| Krok | Akcja | Wpływ |
|------|-------|-------|
| 1 | Deploy Edge Function | Naprawia emaile offline |
| 2 | Dodanie banneru z przyciskiem | Naprawia browser notifications |
| 3 | Subskrypcja real-time wiadomości | Naprawia natychmiastowe powiadomienia |

---

## Pliki do utworzenia/modyfikacji

| Plik | Typ |
|------|-----|
| `src/components/messages/NotificationPermissionBanner.tsx` | Nowy |
| `src/pages/MessagesPage.tsx` | Modyfikacja |
| Deploy: `send-chat-notification-email` | Nowy deploy |
