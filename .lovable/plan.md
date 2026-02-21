

# Dropdown z flagami + naprawa przycisku "Strona glowna"

## Dwa problemy do rozwiazania

### 1. Przycisk "Strona glowna" nie dziala na ekranie wyboru jezyka

Zmienna `homeUrl` jest zadeklarowana w linii 502, ale ekran wyboru jezyka (linie 473-498) zwraca komponent wczesniej (early return) -- przed deklaracja `homeUrl`. Klikniecie przycisku powoduje blad, poniewaz `homeUrl` nie istnieje w tym kontekscie.

**Naprawa:** Przeniesc deklaracje `homeUrl` (linia 501-503) przed pierwszy early return (przed linie 461).

### 2. Selektor katalogu jezykowego -- dropdown z flagami

Obecny natywny `<select>` (linie 672-687) zostanie zastapiony komponentem `Select` z Radix UI (ten sam co w selektorze jezyka aplikacji), z flagami i nazwami jezykow.

## Szczegoly techniczne

### Plik: `src/pages/Training.tsx`

**A. Przeniesc `homeUrl` wyzej (przed early returns):**

```text
// PRZENIESC z linii 501-503 do okolic linii 460 (przed if loading/if null):
const dashboardPreference = localStorage.getItem('dashboard_view_preference') || 'modern';
const homeUrl = dashboardPreference === 'modern' ? '/dashboard' : '/';
```

**B. Dodac importy Select:**

```text
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
```

**C. Zastapic natywny select (linie 672-687) komponentem Radix Select z flagami:**

Trigger bedzie wyswietlal flage + nazwe jezyka, a lista rozwijana bedzie zawierac flagi i nazwy jezykow (native_name + name), identycznie jak w `LanguageSelector`.

**D. Usunac nieuzywane importy** (`Globe`, `ChevronDown` -- jesli nie sa uzywane w innych miejscach).
