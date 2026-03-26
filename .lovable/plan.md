

# Dwa zadania: Naprawa modalu powiadomień + Podzakładki Auto-Webinar

## Problem 1: Modal powiadomień wyskakuje mimo udzielonej zgody (Brave)

**Przyczyna**: `PushNotificationModal` sprawdza `isSubscribed`, ale nie `permission === 'granted'`. W Brave użytkownik może udzielić zgody (`granted`), ale subskrypcja push (`PushManager.subscribe`) może nie powieść się (Brave blokuje niektóre push features). Efekt: `isSubscribed = false`, `permission = 'granted'` → modal pokazuje się ponownie.

**Rozwiązanie**: Dodać warunek `permission === 'granted'` do `checkShouldShow()` w `PushNotificationModal.tsx`. Jeśli użytkownik już udzielił zgody, modal nie powinien się pokazywać — niezależnie od statusu subskrypcji. To samo dotyczy `NotificationPermissionBanner.tsx`.

### Zmiany
| Plik | Zmiana |
|---|---|
| `src/components/notifications/PushNotificationModal.tsx` | Dodać `if (permission === 'granted') return false;` w `checkShouldShow()` |
| `src/components/messages/NotificationPermissionBanner.tsx` | Dodać `permission === 'granted'` do warunku ukrywania banera |

---

## Problem 2: Dwie podzakładki w Auto-Webinar

**Cel**: Na stronie `/auto-webinar` dodać dwie zakładki (Tabs): **Business Opportunity** i **Health Conversation**. Cała istniejąca funkcjonalność trafia do zakładki "Business Opportunity". Zakładka "Health Conversation" na razie pusta (placeholder).

### Zmiany
| Plik | Zmiana |
|---|---|
| `src/components/auto-webinar/AutoWebinarRoom.tsx` | Dodać `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` z dwoma zakładkami. W "Business Opportunity" renderować `AutoWebinarEmbed`. W "Health Conversation" renderować placeholder. |

### Struktura UI
```text
┌─────────────────────────────────────────┐
│  [Business Opportunity] [Health Conv.]  │  ← TabsList
├─────────────────────────────────────────┤
│                                         │
│   <AutoWebinarEmbed />                  │  ← TabsContent (domyślna)
│   (dotychczasowa funkcjonalność)        │
│                                         │
└─────────────────────────────────────────┘
```

Żadne inne pliki nie wymagają zmian — routing, hooki i komponenty auto-webinar pozostają bez zmian.

