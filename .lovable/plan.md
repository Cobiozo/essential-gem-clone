
# Plan: Efekt 3D dla widżetów + Modal powiadomień push

## Zakres zmian

### Zadanie 1: Efekt głębi 3D dla wszystkich kafelków widżetów

Na podstawie screena i analizy kodu, widżety powinny mieć jednolity efekt trójwymiarowości podobny do obecnego wariantu "premium" w Card, ale stosowany konsekwentnie.

**Pliki do zmiany:**

| Widżet | Plik | Obecny styl | Zmiana |
|--------|------|------------|--------|
| CalendarWidget | `CalendarWidget.tsx` | `shadow-sm` | `variant="premium"` |
| NotificationsWidget | `NotificationsWidget.tsx` | `shadow-sm` | `variant="premium"` |
| ResourcesWidget | `ResourcesWidget.tsx` | `shadow-sm` | `variant="premium"` |
| ReflinksWidget | `ReflinksWidget.tsx` | `shadow-sm` | `variant="premium"` |
| QuickStatsWidget | `QuickStatsWidget.tsx` | `shadow-sm` | `variant="premium"` |
| TeamContactsWidget | `TeamContactsWidget.tsx` | `shadow-sm` | `variant="premium"` |
| InfoLinksWidget | `InfoLinksWidget.tsx` | `shadow-sm` | `variant="premium"` |
| MyMeetingsWidget | `MyMeetingsWidget.tsx` | `shadow-sm` | `variant="premium"` |
| HealthyKnowledgeWidget | `HealthyKnowledgeWidget.tsx` | `shadow-sm` | `variant="premium"` |
| CombinedOtpCodesWidget | `CombinedOtpCodesWidget.tsx` | `shadow-sm` | `variant="premium"` |

**TrainingProgressWidget** i **WelcomeWidget** już używają `variant="premium"`.

---

### Zadanie 2: Nowy modal powiadomień push (na wzór screena)

Utworzenie nowego komponentu dialogowego, który pojawi się:
- Po zalogowaniu (na dashboardzie)
- Gdy użytkownik nie ma jeszcze subskrypcji push
- Gdy nie odrzucił prośby na 7 dni

**Nowy plik:** `src/components/notifications/PushNotificationModal.tsx`

**Design wzorowany na screenie:**
- Ikona dzwonka w kółku (niebieski gradient)
- Tytuł: "Włącz powiadomienia"
- Opis: "Otrzymuj powiadomienia o nowych wiadomościach, webinarach i ważnych wydarzeniach."
- Lista korzyści z ikonami check (niebieski):
  - "Natychmiastowe powiadomienia" - "Bądź na bieżąco z nowymi wiadomościami"
  - "Przypomnienia o webinarach" - "Nie przegap żadnego wydarzenia"
- Przycisk główny: niebieski "Włącz powiadomienia" z ikoną dzwonka
- Przycisk drugorzędny: biały z obramowaniem "Później"

**Struktura komponentu:**

```tsx
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle2 } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

// Local storage key + 7-day dismissal logic
const DISMISS_KEY = 'push_notification_modal_dismissed';
const DISMISS_DURATION_DAYS = 7;

export const PushNotificationModal = () => {
  // Logika wyświetlania:
  // - isSupported && pushConfig?.enabled
  // - !isSubscribed
  // - !dismissed (7 dni)
  // - permission !== 'denied'

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
        {/* Ikona z gradientem */}
        <div className="pt-8 pb-4 flex justify-center">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center shadow-lg">
            <Bell className="h-7 w-7 text-white" />
          </div>
        </div>
        
        {/* Tytuł i opis */}
        <div className="text-center px-6 pb-4">
          <h2 className="text-xl font-semibold text-foreground">
            Włącz powiadomienia
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            Otrzymuj powiadomienia o nowych wiadomościach, webinarach i ważnych wydarzeniach.
          </p>
        </div>
        
        {/* Lista korzyści */}
        <div className="px-6 pb-6 space-y-3">
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-sky-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Natychmiastowe powiadomienia</p>
              <p className="text-xs text-muted-foreground">Bądź na bieżąco z nowymi wiadomościami</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-sky-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium">Przypomnienia o webinarach</p>
              <p className="text-xs text-muted-foreground">Nie przegap żadnego wydarzenia</p>
            </div>
          </div>
        </div>
        
        {/* Przyciski */}
        <div className="px-6 pb-6 space-y-2">
          <Button 
            className="w-full bg-sky-500 hover:bg-sky-600" 
            onClick={handleEnable}
            disabled={isLoading}
          >
            <Bell className="h-4 w-4 mr-2" />
            {isLoading ? 'Włączanie...' : 'Włącz powiadomienia'}
          </Button>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleDismiss}
          >
            Później
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

---

### Zadanie 3: Integracja modalu w Dashboard

**Plik:** `src/pages/Dashboard.tsx`

Dodanie importu i renderowania `PushNotificationModal`:

```tsx
// Import
const PushNotificationModal = lazy(() => import('@/components/notifications/PushNotificationModal').then(m => ({ default: m.PushNotificationModal })));

// W komponencie, przed </DashboardLayout>:
<Suspense fallback={null}>
  <PushNotificationModal />
</Suspense>
```

---

### Zadanie 4: Usunięcie lub zachowanie starego bannera

Komponent `NotificationPermissionBanner` w `/messages` może pozostać jako alternatywna forma prośby, ale można go również zastąpić nowym modalem. 

**Rekomendacja:** Zachować stary banner na stronie wiadomości jako dodatkowe przypomnienie, a modal wyświetlać tylko na dashboardzie po zalogowaniu.

---

## Podsumowanie zmian plików

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/widgets/CalendarWidget.tsx` | `variant="premium"` |
| `src/components/dashboard/widgets/NotificationsWidget.tsx` | `variant="premium"` |
| `src/components/dashboard/widgets/ResourcesWidget.tsx` | `variant="premium"` |
| `src/components/dashboard/widgets/ReflinksWidget.tsx` | `variant="premium"` |
| `src/components/dashboard/widgets/QuickStatsWidget.tsx` | `variant="premium"` |
| `src/components/dashboard/widgets/TeamContactsWidget.tsx` | `variant="premium"` |
| `src/components/dashboard/widgets/InfoLinksWidget.tsx` | `variant="premium"` |
| `src/components/dashboard/widgets/MyMeetingsWidget.tsx` | `variant="premium"` |
| `src/components/dashboard/widgets/HealthyKnowledgeWidget.tsx` | `variant="premium"` |
| `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx` | `variant="premium"` |
| `src/components/notifications/PushNotificationModal.tsx` | **NOWY** - modal powiadomień push |
| `src/pages/Dashboard.tsx` | Import i renderowanie modalu |

---

## Oczekiwane rezultaty

1. Wszystkie widżety na dashboardzie będą miały jednolity efekt 3D/głębi
2. Modal powiadomień push pojawi się automatycznie po zalogowaniu (jeśli użytkownik nie ma jeszcze subskrypcji)
3. Użytkownik może odłożyć decyzję na 7 dni (przycisk "Później")
4. Design modalu zgodny z wizualizacją na screenie - nowoczesny, z listą korzyści
