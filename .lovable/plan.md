

# Plan: Uzupełnienie brakujących funkcji Push Notifications

## Podsumowanie analizy

Po porównaniu screenshotów z EQApp z obecną implementacją zidentyfikowałem następujące braki:

### Brakujące funkcje o wysokim priorytecie:
1. **Sekcja "Twoje urządzenie"** - widok dla admina z możliwością włączenia powiadomień na własnym urządzeniu
2. **Test powiadomień** - formularz z polami tytuł/treść i przyciskami "Wyślij do siebie" / "Wyślij do wszystkich"

### Brakujące funkcje o średnim priorytecie:
3. **Zaawansowane ustawienia powiadomień**:
   - Wzorzec wibracji (5 opcji: Krótka, Standardowa, Długa, Pilna, Wyłączona)
   - Czas życia powiadomienia TTL (dropdown)
   - Toggle "Wymagaj interakcji"
   - Toggle "Ciche powiadomienia"

### Brakujące funkcje o niskim priorytecie:
4. Przycisk "Wyczyść nieaktywne subskrypcje"
5. Przycisk "Przywróć domyślne" ikony
6. Przycisk "Zapisz wszystko" globalny

---

## Faza 1: Rozszerzenie bazy danych

Dodanie nowych pól do tabeli `push_notification_config`:

```sql
ALTER TABLE public.push_notification_config
ADD COLUMN IF NOT EXISTS vibration_pattern text DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS ttl_seconds integer DEFAULT 86400,
ADD COLUMN IF NOT EXISTS require_interaction boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS silent boolean DEFAULT false;

COMMENT ON COLUMN push_notification_config.vibration_pattern IS 'short, standard, long, urgent, off';
COMMENT ON COLUMN push_notification_config.ttl_seconds IS 'Time to live in seconds (default 24h)';
```

---

## Faza 2: Nowy komponent "Twoje urządzenie"

Sekcja wyświetlana na górze panelu Push, pokazująca:
- Status powiadomień push na urządzeniu admina
- Informacje o przeglądarce i systemie (np. "Edge • Windows PC")
- Przycisk "Włącz powiadomienia" lub status "Powiadomienia aktywne"
- Rozwijane szczegóły urządzenia

```typescript
// src/components/admin/push-notifications/CurrentDevicePanel.tsx
export const CurrentDevicePanel = () => {
  const { isSubscribed, subscribe, browserInfo, osInfo, isPWA } = usePushNotifications();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Twoje urządzenie
        </CardTitle>
        <CardDescription>
          Zarządzaj powiadomieniami push na tym urządzeniu
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Status Alert */}
        <Alert variant={isSubscribed ? "default" : "secondary"}>
          <Bell className="w-4 h-4" />
          <AlertDescription>
            {isSubscribed 
              ? "Powiadomienia push są włączone" 
              : "Powiadomienia push są wyłączone"}
          </AlertDescription>
        </Alert>
        
        {/* Device info */}
        <p className="text-sm text-muted-foreground mt-2">
          {browserInfo?.name} • {osInfo?.name} {isPWA && "(PWA)"}
        </p>
        
        {/* Action button */}
        <Button onClick={subscribe} disabled={isSubscribed}>
          <Bell className="w-4 h-4 mr-2" />
          Włącz powiadomienia
        </Button>
        
        {/* Collapsible device details */}
        <Collapsible>...</Collapsible>
      </CardContent>
    </Card>
  );
};
```

---

## Faza 3: Panel testowania powiadomień

Nowy komponent z formularzem do wysyłania testowych powiadomień:

```typescript
// src/components/admin/push-notifications/TestNotificationPanel.tsx
export const TestNotificationPanel = () => {
  const [title, setTitle] = useState('Test powiadomienia');
  const [body, setBody] = useState('To jest testowe powiadomienie push!');
  const [sending, setSending] = useState(false);
  
  const sendToSelf = async () => {
    // Wywołaj Edge Function send-push-notification z target: 'self'
  };
  
  const sendToAll = async () => {
    // Potwierdź dialogiem, następnie wyślij do wszystkich
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="w-5 h-5" />
          Test powiadomień
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tytuł powiadomienia</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Treść powiadomienia</Label>
            <Input value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={sendToSelf}>
            <Bell className="w-4 h-4 mr-2" />
            Wyślij do siebie
          </Button>
          <Button onClick={sendToAll}>
            <Send className="w-4 h-4 mr-2" />
            Wyślij do wszystkich
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Faza 4: Panel zaawansowanych ustawień

Nowy komponent z konfiguracją wzorca wibracji, TTL i innych opcji:

```typescript
// src/components/admin/push-notifications/AdvancedSettingsPanel.tsx
const vibrationPatterns = [
  { id: 'short', name: 'Krótka', pattern: '100ms', description: '100ms' },
  { id: 'standard', name: 'Standardowa', pattern: '100-50-100ms', description: '100-50-100ms', default: true },
  { id: 'long', name: 'Długa', pattern: '200-100-200-100-200ms', description: '200-100-200-100-200ms' },
  { id: 'urgent', name: 'Pilna', pattern: '100-30-100-30-100-30-100ms', description: '100-30-100-30-100-30-100ms' },
  { id: 'off', name: 'Wyłączona', pattern: null, description: 'Brak wibracji' },
];

const ttlOptions = [
  { value: 3600, label: '1 godzina' },
  { value: 14400, label: '4 godziny' },
  { value: 43200, label: '12 godzin' },
  { value: 86400, label: '24 godziny (Domyślny)' },
  { value: 172800, label: '48 godzin' },
  { value: 604800, label: '7 dni' },
];

export const AdvancedSettingsPanel = ({ config, onUpdate }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Zaawansowane ustawienia powiadomień
        </CardTitle>
        <CardDescription>
          Konfiguruj wzorzec wibracji, czas życia powiadomień i inne opcje
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Vibration Pattern - Radio cards */}
        <div className="space-y-3">
          <Label>Wzorzec wibracji</Label>
          <div className="grid grid-cols-3 gap-3">
            {vibrationPatterns.map(pattern => (
              <Card 
                key={pattern.id}
                className={cn("cursor-pointer", selected === pattern.id && "border-primary")}
              >
                <RadioGroupItem value={pattern.id} />
                <span>{pattern.name}</span>
                <span className="text-xs text-muted-foreground">{pattern.description}</span>
              </Card>
            ))}
          </div>
        </div>
        
        {/* TTL Dropdown */}
        <div className="space-y-2">
          <Label>Czas życia powiadomienia (TTL)</Label>
          <Select value={config.ttl_seconds} onValueChange={...}>
            {ttlOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Jak długo powiadomienie będzie próbować dotrzeć do urządzenia offline
          </p>
        </div>
        
        {/* Require Interaction Toggle */}
        <div className="flex items-center justify-between border rounded-lg p-4">
          <div>
            <p className="font-medium">Wymagaj interakcji</p>
            <p className="text-sm text-muted-foreground">
              Powiadomienie pozostanie widoczne do momentu kliknięcia lub zamknięcia
            </p>
          </div>
          <Switch checked={config.require_interaction} onCheckedChange={...} />
        </div>
        
        {/* Silent Toggle */}
        <div className="flex items-center justify-between border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <VolumeX className="w-5 h-5" />
            <div>
              <p className="font-medium">Ciche powiadomienia</p>
              <p className="text-sm text-muted-foreground">
                Powiadomienia bez dźwięku (nadal z wibracją jeśli włączona)
              </p>
            </div>
          </div>
          <Switch checked={config.silent} onCheckedChange={...} />
        </div>
        
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" />
          Zapisz ustawienia
        </Button>
      </CardContent>
    </Card>
  );
};
```

---

## Faza 5: Rozszerzenie Edge Function send-push-notification

Aktualizacja funkcji o:
- Obsługę `target: 'self' | 'all' | 'user_id'`
- Pobieranie ustawień wibracji/TTL/require_interaction z bazy
- Konwersja wzorca wibracji na tablicę liczb

```typescript
// Rozszerzenie supabase/functions/send-push-notification/index.ts

// Mapowanie wzorców wibracji
const vibrationPatterns: Record<string, number[]> = {
  short: [100],
  standard: [100, 50, 100],
  long: [200, 100, 200, 100, 200],
  urgent: [100, 30, 100, 30, 100, 30, 100],
  off: [],
};

// Obsługa targetu
if (target === 'self') {
  // Wyślij tylko do current user
  subscriptions = await getSubscriptionsForUser(userId);
} else if (target === 'all') {
  // Broadcast do wszystkich
  subscriptions = await getAllActiveSubscriptions();
}

// Ustawienia z configu
const options = {
  TTL: config.ttl_seconds,
  vapidDetails: { ... },
};

const payload = {
  title,
  body,
  vibrate: vibrationPatterns[config.vibration_pattern] || [100, 50, 100],
  requireInteraction: config.require_interaction,
  silent: config.silent,
  ...
};
```

---

## Faza 6: Dodatkowe usprawnienia

### 6.1 Przycisk "Wyczyść nieaktywne subskrypcje"

Dodanie w panelu statystyk:
```typescript
const cleanupInactive = async () => {
  // Usuń subskrypcje z failure_count > 3
  await supabase
    .from('user_push_subscriptions')
    .delete()
    .gt('failure_count', 3);
};
```

### 6.2 Przycisk "Przywróć domyślne" ikony

W panelu ikon:
```typescript
const resetToDefaults = () => {
  onUpdate({
    icon_192_url: null,
    icon_512_url: null,
    badge_icon_url: null,
  });
};
```

### 6.3 Lepsze statystyki iOS/PWA vs Android

Rozszerzenie SubscriptionStatsPanel o podział:
- iOS/PWA (standalone)
- Android
- Desktop

---

## Nowy układ UI po zmianach

Panel Push Notifications będzie miał następującą strukturę (single page z sekcjami zamiast tabów):

```text
┌─────────────────────────────────────────────────────────────────┐
│ 🔔 Powiadomienia Push                    [Zapisz wszystko]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ┌─ Twoje urządzenie ──────────────────────────────────────────┐ │
│ │ ⚠️ Powiadomienia push są wyłączone                         │ │
│ │ Edge • Windows PC                                           │ │
│ │ [Włącz powiadomienia]    ▼ Szczegóły urządzenia            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Powiadomienia Web Push ────────────────────────────────────┐ │
│ │ Włącz Web Push                                      [ON]    │ │
│ │ Klucze VAPID                         [Skonfigurowane]      │ │
│ │ Klucz publiczny: BKVgd_WW51_RXdm...           [Kopiuj]     │ │
│ │ Klucz prywatny: ••••••••••••                  [Pokaż]      │ │
│ │ Email kontaktowy: mailto:support@...                       │ │
│ │ ⚠️ Generowanie nowych kluczy unieważni wszystkie subskr.  │ │
│ │ [Generuj nowe klucze VAPID]                                │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Ikony powiadomień ─────────────────────────────────────────┐ │
│ │ Główna (192x192) [Domyślna]    Badge (72x72) [Domyślna]    │ │
│ │ [🔔] Zmień ikonę               [🔔] Zmień ikonę            │ │
│ │                                       [Przywróć domyślne]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Zaawansowane ustawienia ───────────────────────────────────┐ │
│ │ Wzorzec wibracji:                                          │ │
│ │ ○ Krótka  ● Standardowa  ○ Długa  ○ Pilna  ○ Wyłączona    │ │
│ │                                                            │ │
│ │ Czas życia (TTL): [24 godziny (Domyślny) ▼]               │ │
│ │                                                            │ │
│ │ Wymagaj interakcji                                  [ON]   │ │
│ │ Ciche powiadomienia                                 [OFF]  │ │
│ │                                                            │ │
│ │ [Zapisz ustawienia]                                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Statystyki subskrypcji ────────────────────────────────────┐ │
│ │ [0] Łącznie  [0] iOS/PWA  [0] Android  [0] Desktop         │ │
│ │ 🗑️ Wyczyść nieaktywne subskrypcje                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─ Test powiadomień ──────────────────────────────────────────┐ │
│ │ Tytuł: [Test powiadomienia    ]                            │ │
│ │ Treść: [To jest testowe powiadomienie push!]               │ │
│ │ [🔔 Wyślij do siebie]  [✈️ Wyślij do wszystkich]          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Podsumowanie zmian

| Plik | Akcja | Opis |
|------|-------|------|
| `supabase/migrations/xxx_push_advanced_settings.sql` | Nowy | Dodanie pól: vibration_pattern, ttl_seconds, require_interaction, silent |
| `src/components/admin/push-notifications/CurrentDevicePanel.tsx` | Nowy | Sekcja "Twoje urządzenie" |
| `src/components/admin/push-notifications/TestNotificationPanel.tsx` | Nowy | Formularz testowania powiadomień |
| `src/components/admin/push-notifications/AdvancedSettingsPanel.tsx` | Nowy | Wzorzec wibracji, TTL, opcje |
| `src/components/admin/PushNotificationsManagement.tsx` | Modyfikacja | Nowy układ z sekcjami zamiast tabów |
| `src/components/admin/push-notifications/SubscriptionStatsPanel.tsx` | Modyfikacja | Dodanie przycisku czyszczenia + podział iOS/Android |
| `src/components/admin/push-notifications/IconsManagementPanel.tsx` | Modyfikacja | Przycisk "Przywróć domyślne" |
| `supabase/functions/send-push-notification/index.ts` | Modyfikacja | Obsługa target, wibracji, TTL |
| `src/integrations/supabase/types.ts` | Automatyczna | Nowe pola w typach |
| `public/sw-push.js` | Modyfikacja | Obsługa vibrate, silent, requireInteraction |

