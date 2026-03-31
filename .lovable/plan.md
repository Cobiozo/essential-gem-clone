

# Naprawa: widżet renderuje kartę nawet gdy obie kategorie są ukryte

## Problem
Outer `Card` z nagłówkiem "Zaproś Swojego Gościa na Live Webinar" renderuje się **zawsze** gdy `masterVisible === true`. Wewnętrzne `CategoryColumn` mogą zwracać `null` (bo `is_enabled = false` lub rola nie ma dostępu), ale karta z tytułem i tak jest widoczna. Dodatkowo — loading state kategorii (linia 170-175) renderuje placeholder (szare paski), więc widżet wygląda jakby się ładował mimo że nic nie pokaże.

## Rozwiązanie

### Plik: `src/components/dashboard/widgets/WebinarInviteWidget.tsx`

**Podejście**: Przenieść logikę widoczności kategorii z `CategoryColumn` do `WebinarInviteWidget`, aby wiedzieć **przed renderowaniem karty** czy cokolwiek się pokaże.

1. **Dodać hook `useAutoWebinarConfig` dla obu kategorii** w `WebinarInviteWidget` (obok istniejącego master toggle).

2. **Sprawdzić widoczność obu kategorii** przed renderowaniem:
   - Czy `config.is_enabled === true`?
   - Czy rola użytkownika ma dostęp (`visible_to_partners` / `visible_to_specjalista` / `visible_to_clients`)?
   - Admin widzi zawsze.

3. **Jeśli żadna kategoria nie jest widoczna → `return null`** (cała karta się nie renderuje).

4. **Przekazać do `CategoryColumn` tylko widoczne kategorie** — nie renderować `CategoryColumn` dla kategorii, do której rola nie ma dostępu.

```tsx
const WebinarInviteWidget: React.FC = () => {
  const { isAdmin, isPartner, isSpecjalista, isClient } = useAuth();
  const { config: boConfig, loading: boLoading } = useAutoWebinarConfig('business_opportunity');
  const { config: hcConfig, loading: hcLoading } = useAutoWebinarConfig('health_conversation');
  // ... masterVisible logic ...

  if (masterVisible !== true) return null;
  if (boLoading || hcLoading) return null; // nie pokazuj placeholdera

  const canSee = (cfg: typeof boConfig) => {
    if (!cfg?.is_enabled) return false;
    if (isAdmin) return true;
    return (isPartner && cfg.visible_to_partners) ||
           (isSpecjalista && cfg.visible_to_specjalista) ||
           (isClient && cfg.visible_to_clients);
  };

  const showBO = canSee(boConfig);
  const showHC = canSee(hcConfig);
  if (!showBO && !showHC) return null;

  return (
    <Card>
      {/* header */}
      <div className="grid ...">
        {showBO && <CategoryColumn category="business_opportunity" ... />}
        {showHC && <CategoryColumn category="health_conversation" ... />}
      </div>
    </Card>
  );
};
```

5. **Usunąć duplikowaną logikę widoczności z `CategoryColumn`** — nie potrzebuje już sprawdzać `is_enabled` ani ról, bo parent to już zrobił.

