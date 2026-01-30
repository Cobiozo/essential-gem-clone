
# Plan: Naprawa błędu i weryfikacja strony publicznej wydarzeń

## Problem

Na stronie `/admin?tab=paid-events` występuje błąd:
```
A <Select.Item /> must have a value prop that is not an empty string
```

### Źródło błędu

W pliku `ContentSectionEditor.tsx` (linia 43) zdefiniowano:
```typescript
const ICON_OPTIONS = [
  { value: '', label: 'Brak ikony' },  // <-- BŁĄD: pusty string
  ...
];
```

Radix UI Select wymaga, aby wszystkie `SelectItem` miały wartość niepustą. Wartość `''` powoduje crash komponentu.

---

## Rozwiązanie

### 1. Napraw ICON_OPTIONS w ContentSectionEditor.tsx

Zmień pusty string na specjalną wartość `none`:

```typescript
const ICON_OPTIONS = [
  { value: 'none', label: 'Brak ikony' },  // Zamiast ''
  { value: 'BookOpen', label: 'Książka' },
  // ...pozostałe opcje
];
```

Zaktualizuj logikę zapisu/odczytu aby `none` było konwertowane na `null`:

```typescript
// Przy zapisie
icon_name: data.icon_name === 'none' ? null : data.icon_name

// Przy odczycie w formData
value={formData.icon_name || 'none'}
```

### 2. Weryfikuj poprawność strony publicznej

Upewnij się że trasa `/events/:slug` jest prawidłowo skonfigurowana (routing jest OK - linia 338 w App.tsx).

---

## Szczegóły techniczne

### Plik: `src/components/admin/paid-events/ContentSectionEditor.tsx`

**Zmiana 1** - Linia 43 (ICON_OPTIONS):
```typescript
// PRZED
{ value: '', label: 'Brak ikony' },

// PO
{ value: 'none', label: 'Brak ikony' },
```

**Zmiana 2** - Linia 107 (createMutation):
```typescript
// PRZED
icon_name: data.icon_name || null,

// PO
icon_name: data.icon_name === 'none' ? null : (data.icon_name || null),
```

**Zmiana 3** - Linia 343-344 (Select value):
```typescript
// PRZED
value={formData.icon_name || ''}
onValueChange={(value) => setFormData({ ...formData, icon_name: value || null })}

// PO
value={formData.icon_name || 'none'}
onValueChange={(value) => setFormData({ ...formData, icon_name: value === 'none' ? null : value })}
```

---

## Pliki do modyfikacji

| Plik | Rodzaj zmiany |
|------|---------------|
| `src/components/admin/paid-events/ContentSectionEditor.tsx` | Naprawa ICON_OPTIONS i logiki Select |

---

## Efekt

Po zastosowaniu poprawek:
1. Panel admina "Płatne wydarzenia" załaduje się bez błędów
2. Edytor sekcji treści będzie działał poprawnie
3. Strona publiczna `/events/:slug` będzie dostępna
