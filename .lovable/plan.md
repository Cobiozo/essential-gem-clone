

# Fix: Widżet auto-webinar ma działać niezależnie od roli

## Problem

Widżet jest blokowany w **trzech miejscach** przez sprawdzanie roli użytkownika:

1. **Linia 314** — `if (!isPartner && !isSpecjalista)` → odrzuca klientów i inne role, nawet jeśli mają `can_access_auto_webinar = true`
2. **Linia 326** — `masterVisible` sprawdza `feature_visibility` per rola → jeśli admin nie włączył widżeta dla roli "partner", partner go nie widzi
3. **Linia 330-336** — `canSee()` sprawdza `visible_to_partners`/`visible_to_specjalista` per kategoria → blokuje nawet z indywidualnym dostępem

## Rozwiązanie

Zasada: **jeśli `can_access_auto_webinar = true` w `leader_permissions`, użytkownik widzi widżet i obie kategorie, niezależnie od roli i globalnych ustawień widoczności.**

### Zmiany w `src/components/dashboard/widgets/WebinarInviteWidget.tsx`

**1. useEffect dla `hasAutoWebinarAccess` (linia 312-324)** — usunąć bramkę `isPartner && isSpecjalista`:
```typescript
useEffect(() => {
  if (isAdmin) { setHasAutoWebinarAccess(true); return; }
  if (!user?.id) { setHasAutoWebinarAccess(false); return; }
  const checkAccess = async () => {
    const { data } = await supabase
      .from('leader_permissions')
      .select('can_access_auto_webinar')
      .eq('user_id', user.id)
      .maybeSingle();
    setHasAutoWebinarAccess((data as any)?.can_access_auto_webinar === true);
  };
  checkAccess();
}, [user?.id, isAdmin]);
```

**2. Warunek renderowania (linia 326)** — `masterVisible` nie blokuje użytkowników z indywidualnym dostępem:
```typescript
if (masterVisible !== true && hasAutoWebinarAccess !== true) return null;
if (hasAutoWebinarAccess !== true) return null;
```

**3. Funkcja `canSee` (linia 330-336)** — użytkownik z `hasAutoWebinarAccess` widzi każdą włączoną kategorię:
```typescript
const canSee = (cfg: typeof boConfig) => {
  if (!cfg?.is_enabled) return false;
  if (isAdmin || hasAutoWebinarAccess) return true;
  return (isPartner && cfg.visible_to_partners) ||
         (isSpecjalista && cfg.visible_to_specjalista) ||
         (isClient && cfg.visible_to_clients);
};
```

| Zmiana | Efekt |
|--------|-------|
| Usunięcie bramki ról w checkAccess | Każdy user (nie tylko partner/specjalista) może mieć dostęp |
| `masterVisible` OR `hasAutoWebinarAccess` | Indywidualny dostęp omija globalny toggle roli |
| `hasAutoWebinarAccess` w `canSee` | Użytkownik z dostępem widzi obie włączone kategorie |

Jeden plik, trzy drobne zmiany.

