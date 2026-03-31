

# Zmiana layoutu kafelków komunikatów na układ pionowy

## Problem
Obecnie komunikat wyświetla się w układzie poziomym: tekst po lewej (ucięty `truncate`), przyciski po prawej. Użytkownik chce pełny widok kafelka: treść widoczna w całości, pod nią dane (badge, role), a na dole przyciski edycji.

## Rozwiązanie

### Plik: `src/components/admin/NewsTickerManagement.tsx` (linie 1104-1156)

Zmiana layoutu z `flex items-start justify-between` (poziomy) na układ pionowy:

```tsx
<Card key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
  <CardContent className="py-4 space-y-3">
    {/* 1. Badge'e na górze */}
    <div className="flex items-center gap-2 flex-wrap">
      {item.is_important && <Badge variant="destructive">Ważny</Badge>}
      {!item.is_active && <Badge variant="secondary">Nieaktywny</Badge>}
      <Badge variant="outline">Priorytet: {item.priority}</Badge>
      {/* ... pozostałe badge'e */}
    </div>

    {/* 2. Pełna treść komunikatu - bez truncate */}
    <p className="text-sm font-medium whitespace-pre-wrap break-words">
      {item.content}
    </p>

    {/* 3. Role widoczności */}
    <div className="flex gap-2 text-xs text-muted-foreground">
      {item.visible_to_clients && <span>Klienci</span>}
      {item.visible_to_partners && <span>Partnerzy</span>}
      {item.visible_to_specjalista && <span>Specjaliści</span>}
    </div>

    {/* 4. Przyciski na dole */}
    <div className="flex items-center gap-2 pt-2 border-t border-border/40">
      <Switch checked={item.is_active} ... />
      <Button variant="ghost" size="icon"><Pencil /></Button>
      <Button variant="ghost" size="icon"><Trash2 /></Button>
    </div>
  </CardContent>
</Card>
```

Kluczowe zmiany:
- Usunięcie `truncate` z treści — tekst wyświetla się w pełni z `whitespace-pre-wrap break-words`
- Zamiana layoutu z poziomego na pionowy (`space-y-3`)
- Przyciski przeniesione na dół karty, oddzielone cienką linią (`border-t`)

