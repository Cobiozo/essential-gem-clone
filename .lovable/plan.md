
# Plan: Kompleksowa ochrona przed przeładowaniem przy zmianie karty przeglądarki

## Diagnoza problemu

Po przeanalizowaniu kodu zidentyfikowałem **główne źródła problemu**:

### 1. AuthContext nie integruje się z EditingContext
- `AuthContext.tsx` (linie 93-100) śledzi `isPageHiddenRef` dla zdarzeń auth
- Jednak **nie sprawdza globalnej flagi `isEditing`** z `EditingContext`
- Problem: AuthContext jest poza EditingProvider, więc nie może bezpośrednio używać hooka

### 2. Brakująca ochrona w komponentach admin
Wiele komponentów z formularzami **NIE używa `useFormProtection`**:
- `CertificateEditor.tsx` - `showCreateDialog`, `selectedTemplate` (edycja)
- `TemplateDndEditor.tsx` - cały komponent to formularz edycji
- `HtmlPagesManagement.tsx` - `isDialogOpen`
- `IndividualMeetingsManagement.tsx` - brak dialogów ale dane w trakcie edycji
- `NotificationSystemManagement.tsx` - dialogi
- `CookieConsentManagement.tsx`, `DailySignalManagement.tsx`, i inne

### 3. useNotifications reaguje na visibility change
- `useNotifications.ts` (linie 170-182) przy powrocie do karty od razu wywołuje `fetchUnreadCount()`
- To może triggerować re-render całego drzewa komponentów jeśli powiadomienia się zmienią
- **Brak sprawdzenia `isEditing`** przed aktualizacją

### 4. React Query może odświeżać dane
- Mimo `refetchOnWindowFocus: false` w globalnej konfiguracji, indywidualne query mogą to nadpisywać
- Niektóre mutacje mogą invalidować cache i triggerować re-fetch

---

## Rozwiązanie

### Krok 1: Rozszerzenie EditingContext o globalną ekspozycję

**Problem**: AuthContext jest renderowany PRZED EditingProvider, więc nie może używać useEditing().

**Rozwiązanie**: Eksponujemy stan edycji przez globalny ref dostępny bez hooka.

**Plik: `src/contexts/EditingContext.tsx`**

Dodanie eksportu globalnego ref:
```tsx
// Globalny ref dostępny dla komponentów poza Providerem (np. AuthContext)
export const globalEditingStateRef = { current: false };

// W EditingProvider - synchronizacja z globalnym ref:
useEffect(() => {
  globalEditingStateRef.current = isEditing;
}, [isEditing]);
```

---

### Krok 2: Integracja AuthContext z globalnym stanem edycji

**Plik: `src/contexts/AuthContext.tsx`**

Import i sprawdzenie globalnego ref:
```tsx
import { globalEditingStateRef } from './EditingContext';

// W onAuthStateChange callback (linia ~151):
if ((isPageHiddenRef.current || globalEditingStateRef.current) && event !== 'SIGNED_OUT') {
  // Cicho zaktualizuj sesję bez resetowania UI
  setSession(newSession);
  setUser(newSession?.user ?? null);
  return;
}
```

---

### Krok 3: Ochrona useNotifications przed aktualizacjami podczas edycji

**Plik: `src/hooks/useNotifications.ts`**

Dodanie sprawdzenia stanu edycji:
```tsx
import { globalEditingStateRef } from '@/contexts/EditingContext';

// W handleVisibilityChange (linia ~170):
const handleVisibilityChange = () => {
  if (document.hidden) {
    stopPolling();
  } else {
    // NIE aktualizuj gdy użytkownik jest w trybie edycji
    if (globalEditingStateRef.current) return;
    
    setTimeout(() => {
      if (!document.hidden && !globalEditingStateRef.current) {
        fetchUnreadCount();
        startPolling();
      }
    }, 500);
  }
};
```

---

### Krok 4: Dodanie useFormProtection do brakujących komponentów

| Komponent | Dialogi/stany do ochrony |
|-----------|--------------------------|
| `CertificateEditor.tsx` | `showCreateDialog`, `selectedTemplate !== null` |
| `TemplateDndEditor.tsx` | Zawsze true (cały komponent to edycja) |
| `HtmlPagesManagement.tsx` | `isDialogOpen` |
| `OtpCodesManagement.tsx` | `deleteDialogOpen`, `detailsDialogOpen` |
| `NotificationSystemManagement.tsx` | dialogi |
| `SupportTicketsManagement.tsx` | `!!selectedTicket` |
| `TeamTrainingList.tsx` | `participantsDialogOpen` |
| `WebinarList.tsx` (jeśli ma dialogi) | dialogi |

**Przykład dla CertificateEditor.tsx:**
```tsx
import { useMultiFormProtection } from '@/hooks/useFormProtection';

// W komponencie:
useMultiFormProtection(showCreateDialog, selectedTemplate !== null);
```

---

## Lista plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/contexts/EditingContext.tsx` | Dodanie `globalEditingStateRef` |
| `src/contexts/AuthContext.tsx` | Sprawdzanie globalnego ref edycji |
| `src/hooks/useNotifications.ts` | Blokada aktualizacji podczas edycji |
| `src/components/admin/CertificateEditor.tsx` | Dodanie `useMultiFormProtection` |
| `src/components/admin/TemplateDndEditor.tsx` | Dodanie `useFormProtection(true)` |
| `src/components/admin/HtmlPagesManagement.tsx` | Dodanie `useFormProtection` |
| `src/components/admin/OtpCodesManagement.tsx` | Dodanie `useMultiFormProtection` |
| `src/components/admin/NotificationSystemManagement.tsx` | Dodanie `useFormProtection` |
| `src/components/admin/SupportTicketsManagement.tsx` | Dodanie `useFormProtection` |
| `src/components/admin/TeamTrainingList.tsx` | Dodanie `useFormProtection` |

---

## Oczekiwany rezultat

- Przełączanie kart przeglądarki **NIE przeładowuje strony** gdy otwarty jest jakikolwiek dialog/formularz
- Edycja certyfikatów, szablonów HTML, powiadomień itp. **pozostaje nietknięta** po powrocie
- AuthContext **nie resetuje stanu UI** podczas edycji
- useNotifications **nie aktualizuje się** gdy użytkownik edytuje dane
- Rozwiązanie działa **globalnie** dla całej aplikacji
