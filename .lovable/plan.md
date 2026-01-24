
# Dodanie opcji "Admin" do sekcji Dostęp do funkcji

## Problem
W sekcji "Dostęp do funkcji" panelu struktury organizacji brakuje pozycji dla administratora. Widoczne są tylko:
- Klienci
- Partnerzy
- Specjaliści

## Rozwiązanie

### Podejście A: Dodać nieaktywny switch dla admina (informacyjny)
Admin zawsze ma dostęp (zgodnie z logiką w `canAccessTree()`), więc switch będzie zawsze włączony i zablokowany (disabled). Służy jako informacja wizualna dla admina.

### Podejście B: Dodać aktywny switch z nową kolumną w bazie
Dodanie kolumny `visible_to_admin` do tabeli i pozwolenie na wyłączenie dostępu adminom (co wydaje się niepraktyczne).

**Rekomendacja**: Podejście A - informacyjny switch z wyjaśnieniem

## Zmiany do wykonania

### Plik: `src/components/admin/OrganizationTreeManagement.tsx`

Dodanie nowej pozycji na początku listy w sekcji "Dostęp do funkcji" (przed linią 104):

```tsx
<div className="flex items-center justify-between py-2">
  <div>
    <Label className="flex items-center gap-2">
      Administratorzy
      <Badge variant="outline" className="text-xs">zawsze aktywne</Badge>
    </Label>
    <p className="text-sm text-muted-foreground">
      Administratorzy zawsze mają pełny dostęp do struktury
    </p>
  </div>
  <Switch
    checked={true}
    disabled={true}
    className="opacity-50"
  />
</div>
<Separator />
```

### Opcjonalnie: Dodać też w parametrach drzewa

W sekcji "Maksymalna głębokość per rola" (linia 254) dodać badge dla admina:

```tsx
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <Badge className="bg-red-500">Admin</Badge>
    <span className="text-xs text-muted-foreground">(pełna głębokość)</span>
  </div>
  <Input
    type="number"
    value={localSettings.max_depth ?? 10}
    disabled={true}
    className="opacity-50"
  />
</div>
```

## Efekt wizualny

```
▼ Dostęp do funkcji
┌──────────────────────────────────────────────────────────────────┐
│  Administratorzy    [zawsze aktywne]                       [ON] │  ← NOWE
│  Administratorzy zawsze mają pełny dostęp do struktury          │
├──────────────────────────────────────────────────────────────────┤
│  Klienci                                                  [OFF] │
│  Czy klienci mogą widzieć swoją strukturę                       │
├──────────────────────────────────────────────────────────────────┤
│  Partnerzy                                                 [ON] │
│  Czy partnerzy mogą widzieć swoją organizację                   │
├──────────────────────────────────────────────────────────────────┤
│  Specjaliści                                               [ON] │
│  Czy specjaliści mogą widzieć strukturę                         │
└──────────────────────────────────────────────────────────────────┘
```

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/OrganizationTreeManagement.tsx` | Dodanie wiersza "Administratorzy" z disabled switch + badge informacyjny |
