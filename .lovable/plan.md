

# Plan: Naprawa dialogu podglądu PureLink

## Diagnoza problemu

Dialog z podglądem ("okienko oko") otwiera się, ale natychmiast mruga i znika. Problem nie dotyczy zawartości iframe, ale samego mechanizmu dialogu.

### Przyczyny:

1. **Focus Trap w Radix Dialog**: Kiedy iframe wewnątrz DialogContent zaczyna się ładować, focus może przejść do dokumentu w iframe. Radix Dialog interpretuje to jako "interact outside" i automatycznie zamyka dialog.

2. **Potencjalny re-render**: AuthContext może reagować na ładowanie iframe (cookies sesji są współdzielone), co może powodować re-render komponentu.

---

## Rozwiązanie

### Zmiana w `ReflinkPreviewDialog.tsx`

Należy dodać właściwości do `DialogContent` zapobiegające automatycznemu zamknięciu:

```tsx
<DialogContent 
  className="max-w-4xl h-[85vh] flex flex-col"
  onInteractOutside={(e) => e.preventDefault()}
  onPointerDownOutside={(e) => e.preventDefault()}
>
```

**Wyjaśnienie:**
- `onInteractOutside={(e) => e.preventDefault()}` - zapobiega zamknięciu dialogu gdy użytkownik kliknie w iframe lub poza dialog
- `onPointerDownOutside={(e) => e.preventDefault()}` - dodatkowe zabezpieczenie przed zamknięciem przy kliknięciu

### Plik do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/user-reflinks/ReflinkPreviewDialog.tsx` | Dodanie `onInteractOutside` i `onPointerDownOutside` do DialogContent |

---

## Szczegóły implementacji

### Przed (linie 22-25):
```tsx
return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
```

### Po:
```tsx
return (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent 
      className="max-w-4xl h-[85vh] flex flex-col"
      onInteractOutside={(e) => e.preventDefault()}
      onPointerDownOutside={(e) => e.preventDefault()}
    >
```

---

## Oczekiwany efekt

1. Kliknięcie ikony oka otwiera dialog z podglądem
2. Dialog pozostaje otwarty podczas ładowania iframe
3. Iframe pokazuje stronę `/auth?ref=KOD&preview=true`
4. Dialog zamyka się tylko przez:
   - Kliknięcie X w prawym górnym rogu
   - Naciśnięcie Escape
5. Użytkownik może zobaczyć formularz rejestracji z danymi z reflinka
