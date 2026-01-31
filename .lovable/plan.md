

# Plan: Widoczność Eventów według ról + przycisk powrotu

## Zidentyfikowane problemy

### Problem 1: "Eventy" widoczne dla wszystkich ról
Element `paid-events` w sidebarze jest wyświetlany wszystkim użytkownikom, mimo że w tabeli `paid_events_settings` administrator ustawił:
- `visible_to_admin: true` ✓
- `visible_to_partner: false` ✗
- `visible_to_specjalista: false` ✗
- `visible_to_client: false` ✗

**Przyczyna:** W `DashboardSidebar.tsx` (linia 308) element jest dodany bez żadnego sprawdzenia widoczności - brak analogicznego mechanizmu jak dla `chat` (hook `useChatSidebarVisibility`).

### Problem 2: Brak przycisku powrotu na stronie wydarzenia
Na stronie szczegółów wydarzenia (`/paid-events/:slug`) brakuje przycisku powrotu w lewym górnym rogu, który pozwoliłby wrócić na stronę główną.

---

## Rozwiązanie

### Część 1: Hook widoczności dla paid-events

Utworzyć nowy hook `usePaidEventsVisibility.ts` wzorowany na istniejącym `useChatSidebarVisibility.ts`:

| Plik | Opis |
|------|------|
| `src/hooks/usePaidEventsVisibility.ts` | **Nowy plik** - pobiera ustawienia z `paid_events_settings` |

**Struktura hooka:**
```typescript
interface PaidEventsVisibility {
  is_enabled: boolean;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_specjalista: boolean;
  visible_to_client: boolean;
}

export const usePaidEventsVisibility = () => {
  return useQuery({
    queryKey: ['paid-events-visibility'],
    queryFn: async () => {
      // Pobiera z paid_events_settings
    },
    staleTime: 1000 * 60 * 5, // 5 minut cache
  });
};

export const isRoleVisibleForPaidEvents = (
  visibility: PaidEventsVisibility | undefined,
  role: string | undefined
): boolean => {
  // Sprawdza czy dana rola ma dostęp
};
```

### Część 2: Filtrowanie w sidebarze

W pliku `src/components/dashboard/DashboardSidebar.tsx`:

1. **Import hooka** (linia ~59):
```typescript
import { usePaidEventsVisibility, isRoleVisibleForPaidEvents } from '@/hooks/usePaidEventsVisibility';
```

2. **Wywołanie hooka** (po linii ~131):
```typescript
const { data: paidEventsVisibility } = usePaidEventsVisibility();
```

3. **Dodanie warunku filtrowania** (w `visibleMenuItems`, po linii ~422):
```typescript
// Check paid-events visibility based on role settings
if (item.id === 'paid-events') {
  if (!isRoleVisibleForPaidEvents(paidEventsVisibility, userRole?.role)) {
    return false;
  }
}
```

### Część 3: Przycisk powrotu na stronie wydarzenia

W pliku `src/components/paid-events/public/PaidEventHero.tsx`:

Dodać przycisk powrotu w lewym górnym rogu, nad badge'ami:

```tsx
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

// W komponencie:
const navigate = useNavigate();

// W JSX (przed badges, linia ~59):
<div className="mb-4">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => navigate('/')}
    className="gap-2 text-muted-foreground hover:text-foreground"
  >
    <ArrowLeft className="w-4 h-4" />
    Strona główna
  </Button>
</div>
```

---

## Zmiany w plikach

| Plik | Zmiana |
|------|--------|
| `src/hooks/usePaidEventsVisibility.ts` | **Nowy** - hook pobierający ustawienia widoczności |
| `src/components/dashboard/DashboardSidebar.tsx` | Import + wywołanie hooka + warunek filtrowania |
| `src/components/paid-events/public/PaidEventHero.tsx` | Dodanie przycisku powrotu w lewym górnym rogu |

---

## Rezultat

### Sidebar:
- Element "Eventy" widoczny **tylko** dla ról z flagą `visible_to_[rola] = true`
- Zmiana ustawień przez admina natychmiast (po 5 min lub odświeżeniu) aktualizuje sidebar
- Partner/Specjalista/Klient nie widzą elementu jeśli admin wyłączył widoczność

### Strona wydarzenia:
- W lewym górnym rogu widoczny przycisk "Strona główna" z ikoną strzałki
- Kliknięcie przekierowuje na `/` (stronę główną)
- Przycisk jest subtelny (ghost variant), nie przeszkadza w odbiorze treści

