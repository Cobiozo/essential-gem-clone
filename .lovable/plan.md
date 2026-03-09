

# Poukładanie widoczności ról — lepszy layout + rola Administrator

## Zmiana

W sekcji "Widoczność dla ról" w `AutoWebinarManagement.tsx`:

1. **Layout**: Zamienić `grid-cols-3` na pionową listę — każdy wiersz to `flex items-center justify-between` z etykietą po lewej i Switch po prawej (jak sekcja "Widoczne w kalendarzu" poniżej). Dzięki temu przełącznik jest blisko napisu.

2. **Dodać rolę Administrator** jako pierwszy wiersz (domyślnie włączony, zawsze widoczny dla admina).

3. **Kolejność**: Administrator → Partnerzy → Specjaliści → Klienci

## Plik: `src/components/admin/AutoWebinarManagement.tsx` (linie 575-601)

Nowy układ:
```tsx
<div className="border-t pt-4 space-y-3">
  <Label className="text-sm font-semibold">Widoczność dla ról</Label>
  <div className="space-y-3">
    {/* Administrator */}
    <div className="flex items-center justify-between">
      <Label className="text-sm">Administrator</Label>
      <Switch checked={true} disabled />
    </div>
    {/* Partnerzy */}
    <div className="flex items-center justify-between">
      <Label className="text-sm">Partnerzy</Label>
      <Switch checked={...} onCheckedChange={...} />
    </div>
    {/* Specjaliści */}
    <div className="flex items-center justify-between">
      <Label className="text-sm">Specjaliści</Label>
      <Switch checked={...} onCheckedChange={...} />
    </div>
    {/* Klienci */}
    <div className="flex items-center justify-between">
      <Label className="text-sm">Klienci</Label>
      <Switch checked={...} onCheckedChange={...} />
    </div>
  </div>
</div>
```

Administrator Switch jest zawsze włączony i disabled — admin zawsze widzi auto-webinary.

