
# Plan: Globalna ochrona wszystkich formularzy przed resetem przy zmianie karty

## Zweryfikowane komponenty i stany dialogów

Po szczegółowej analizie kodu potwierdzam, że poniższe komponenty wymagają dodania `useFormProtection` z dokładnie określonymi nazwami stanów:

### Komponenty do modyfikacji

| Komponent | Stany do ochrony | Uwagi |
|-----------|------------------|-------|
| `ImportantInfoManagement.tsx` | `isDialogOpen` | Linia 60 - dialog tworzenia/edycji banera |
| `LivePreviewEditor.tsx` | `editMode`, `isItemEditorOpen`, `isSectionEditorOpen` | Linie 85, 101, 108 - tryb edycji i panele |
| `DailySignalManagement.tsx` | `showAddDialog`, `showGenerateDialog`, `!!editingSignal` | Linie 82-83, 81 |
| `CookieConsentManagement.tsx` | `true` (formularz zawsze aktywny) | Cały komponent to edycja ustawień |
| `MaintenanceModeManagement.tsx` | `showPreview`, `showEnableWarning` | Linie 39-40 |
| `NewsTickerManagement.tsx` | `showAddDialog`, `!!editingItem` | Linie 129, 128 |
| `KnowledgeResourcesManagement.tsx` | `dialogOpen`, `bulkUploadOpen` | Linie 65, 77 |
| `EmailTemplatesManagement.tsx` | `showTemplateDialog`, `showEventDialog`, `showPreviewDialog`, `showForceSendDialog` | Linie 90-91, 97, 107 |
| `BulkUserActions.tsx` | `showEmailDialog` | Linia 44 |
| `SidebarFooterIconsManagement.tsx` | `dialogOpen` | Linia 116 |
| `WebinarList.tsx` | `participantsDialogOpen` | Linia 79 |

---

## Szczegółowe zmiany

### 1. `ImportantInfoManagement.tsx`

**Import (dodać na górze pliku):**
```tsx
import { useFormProtection } from '@/hooks/useFormProtection';
```

**Hook (po useState declarations, około linii 92):**
```tsx
useFormProtection(isDialogOpen);
```

### 2. `LivePreviewEditor.tsx`

**Import:**
```tsx
import { useMultiFormProtection } from '@/hooks/useFormProtection';
```

**Hook (po deklaracjach stanu, około linii 120):**
```tsx
useMultiFormProtection(editMode, isItemEditorOpen, isSectionEditorOpen);
```

### 3. `DailySignalManagement.tsx`

**Import:**
```tsx
import { useMultiFormProtection } from '@/hooks/useFormProtection';
```

**Hook (po useState declarations, około linii 101):**
```tsx
useMultiFormProtection(showAddDialog, showGenerateDialog, !!editingSignal);
```

### 4. `CookieConsentManagement.tsx`

**Import:**
```tsx
import { useFormProtection } from '@/hooks/useFormProtection';
```

**Hook (po useState declarations, około linii 44):**
```tsx
useFormProtection(true); // Cały formularz jest aktywny gdy komponent jest widoczny
```

### 5. `MaintenanceModeManagement.tsx`

**Import:**
```tsx
import { useMultiFormProtection } from '@/hooks/useFormProtection';
```

**Hook (po useState declarations, około linii 49):**
```tsx
useMultiFormProtection(showPreview, showEnableWarning);
```

### 6. `NewsTickerManagement.tsx`

**Import:**
```tsx
import { useMultiFormProtection } from '@/hooks/useFormProtection';
```

**Hook (po useState declarations, około linii 165):**
```tsx
useMultiFormProtection(showAddDialog, !!editingItem);
```

### 7. `KnowledgeResourcesManagement.tsx`

**Import:**
```tsx
import { useMultiFormProtection } from '@/hooks/useFormProtection';
```

**Hook (po useState declarations, około linii 107):**
```tsx
useMultiFormProtection(dialogOpen, bulkUploadOpen);
```

### 8. `EmailTemplatesManagement.tsx`

**Import:**
```tsx
import { useMultiFormProtection } from '@/hooks/useFormProtection';
```

**Hook (po useState declarations, około linii 134):**
```tsx
useMultiFormProtection(showTemplateDialog, showEventDialog, showPreviewDialog, showForceSendDialog);
```

### 9. `BulkUserActions.tsx`

**Import:**
```tsx
import { useFormProtection } from '@/hooks/useFormProtection';
```

**Hook (wewnątrz komponentu, po useState, około linii 46):**
```tsx
useFormProtection(showEmailDialog);
```

### 10. `SidebarFooterIconsManagement.tsx`

**Import:**
```tsx
import { useFormProtection } from '@/hooks/useFormProtection';
```

**Hook (po useState declarations, około linii 136):**
```tsx
useFormProtection(dialogOpen);
```

### 11. `WebinarList.tsx`

**Import:**
```tsx
import { useFormProtection } from '@/hooks/useFormProtection';
```

**Hook (po useState declarations, około linii 83):**
```tsx
useFormProtection(participantsDialogOpen);
```

---

## Weryfikacja bezpieczeństwa zmian

Wszystkie zmiany są bezpieczne ponieważ:

1. **Hook `useFormProtection` już istnieje** - został utworzony w poprzedniej implementacji i działa poprawnie
2. **Nazwy stanów są zweryfikowane** - wszystkie nazwy zmiennych zostały sprawdzone bezpośrednio w kodzie źródłowym
3. **Brak zmian logiki biznesowej** - jedyna zmiana to wywołanie hooka, który ustawia globalną flagę edycji
4. **Hook jest idempotentny** - wielokrotne wywołanie nie powoduje problemów
5. **Cleanup jest automatyczny** - hook zawiera cleanup w useEffect

---

## Lista plików do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/ImportantInfoManagement.tsx` | +import, +useFormProtection(isDialogOpen) |
| `src/components/dnd/LivePreviewEditor.tsx` | +import, +useMultiFormProtection(...) |
| `src/components/admin/DailySignalManagement.tsx` | +import, +useMultiFormProtection(...) |
| `src/components/admin/CookieConsentManagement.tsx` | +import, +useFormProtection(true) |
| `src/components/admin/MaintenanceModeManagement.tsx` | +import, +useMultiFormProtection(...) |
| `src/components/admin/NewsTickerManagement.tsx` | +import, +useMultiFormProtection(...) |
| `src/components/admin/KnowledgeResourcesManagement.tsx` | +import, +useMultiFormProtection(...) |
| `src/components/admin/EmailTemplatesManagement.tsx` | +import, +useMultiFormProtection(...) |
| `src/components/admin/BulkUserActions.tsx` | +import, +useFormProtection(showEmailDialog) |
| `src/components/admin/SidebarFooterIconsManagement.tsx` | +import, +useFormProtection(dialogOpen) |
| `src/components/admin/WebinarList.tsx` | +import, +useFormProtection(participantsDialogOpen) |

---

## Oczekiwany rezultat

Po implementacji:
- **Tworzenie banera** w "Ważne informacje" - wyjście na inną kartę i powrót NIE resetuje formularza
- **Edycja w Layout Editor** - przełączenie karty NIE wyrzuca z trybu edycji
- **Daily Signal, Cookies, Maintenance** - formularze pozostają nietknięte
- **News Ticker, Knowledge Resources** - dialogi nie są zamykane/resetowane
- **Email Templates** - edycja szablonów zachowana
- **Wszystkie inne dialogi** - stabilne działanie bez nieoczekiwanych odświeżeń
