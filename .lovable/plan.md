

# Dodanie widoczności i dat do dialogu edycji komunikatu

## Problem
Dialog edycji komunikatu (`Edytuj komunikat`) nie ma sekcji widoczności (role/użytkownik), ani pól daty rozpoczęcia/zakończenia. Te opcje istnieją tylko w dialogu dodawania. Przez to nie można zmienić komu komunikat jest wyświetlany ani ustawić dat ważności po utworzeniu.

## Rozwiązanie

### Plik: `src/components/admin/NewsTickerManagement.tsx`

Do dialogu edycji (linie 1204-1260, przed `DialogFooter`) dodać:

1. **Sekcja widoczności** — checkboxy ról (Klienci, Partnerzy, Specjaliści) identyczne jak w dialogu dodawania:
```tsx
<div className="space-y-3 p-4 border rounded-lg">
  <Label>Widoczność dla</Label>
  <div className="flex gap-4 pt-2">
    <Checkbox checked={editingItem.visible_to_clients} ... /> Klienci
    <Checkbox checked={editingItem.visible_to_partners} ... /> Partnerzy  
    <Checkbox checked={editingItem.visible_to_specjalista} ... /> Specjaliści
  </div>
</div>
```

2. **Daty ważności** — pola start_date i end_date:
```tsx
<div className="grid grid-cols-2 gap-4">
  <div><Label>Data od</Label><Input type="date" value={editingItem.start_date} /></div>
  <div><Label>Data do</Label><Input type="date" value={editingItem.end_date} /></div>
</div>
```

Funkcja `updateItem` już zapisuje te pola do bazy — wystarczy dodać UI do dialogu.

