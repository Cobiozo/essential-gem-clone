
# Plan: Naprawa dwóch problemów - nawigacja do zasobu i timer OTP InfoLink

## Problem 1: ResourcesWidget nie pokazuje konkretnego zasobu

### Diagnoza
W `ResourcesWidget.tsx` (linie 136, 142):
```tsx
onClick={() => navigate('/knowledge')}
```

Nawigacja kieruje tylko do strony `/knowledge` bez parametru identyfikującego zasób. Strona `KnowledgeCenter.tsx` nie obsługuje żadnych query params do podświetlenia konkretnego zasobu.

### Rozwiązanie

**Krok 1: Zmiana ResourcesWidget.tsx**

Dodać przekazywanie ID zasobu jako query param:
```tsx
onClick={() => navigate(`/knowledge?highlight=${resource.id}`)}
```

**Krok 2: Zmiana KnowledgeCenter.tsx**

Dodać obsługę query param `highlight`:
- Import `useSearchParams` z react-router-dom
- Odczytać parametr `highlight` z URL
- Po załadowaniu zasobów, automatycznie przewinąć do podświetlonego zasobu
- Dodać efekt wizualny (animacja ring/pulse) dla podświetlonego zasobu

Kod do dodania:
```tsx
import { useSearchParams } from 'react-router-dom';

// W komponencie:
const [searchParams] = useSearchParams();
const highlightedResourceId = searchParams.get('highlight');

// useEffect do scrollowania:
useEffect(() => {
  if (highlightedResourceId && !loading) {
    const element = document.getElementById(`resource-${highlightedResourceId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
}, [highlightedResourceId, loading]);

// W renderResourceCard dodać id i podświetlenie:
<Card 
  key={resource.id} 
  id={`resource-${resource.id}`}
  className={`hover:shadow-md transition-shadow ${
    highlightedResourceId === resource.id 
      ? 'ring-2 ring-primary animate-pulse' 
      : ''
  }`}
>
```

---

## Problem 2: Timer OTP w InfoLink liczy od momentu generacji zamiast od pierwszego użycia

### Diagnoza

**Obecny stan:**
- Tabela `infolink_otp_codes` NIE MA kolumny `first_used_at` (jest tylko w `hk_otp_codes`)
- Kolumny: `id, reflink_id, partner_id, code, expires_at, is_invalidated, used_sessions, created_at`
- Timer w `CombinedOtpCodesWidget` liczy czas do `expires_at` (który jest obliczany przy generacji: created_at + validity hours)

**Różnica z Zdrowa Wiedza:**
- `hk_otp_codes` MA kolumnę `first_used_at` 
- Timer liczy: `first_used_at + validity hours`
- Kod może czekać 7 dni na użycie, a potem dostęp trwa 24h

**Wymagane zachowanie dla InfoLink:**
- Kod powinien mieć okres oczekiwania (np. 7 dni na aktywację)
- Timer dostępu startuje od pierwszego użycia kodu (pierwsza sesja)

### Rozwiązanie

**Krok 1: Migracja bazy danych**

Dodać kolumnę `first_used_at` do tabeli `infolink_otp_codes`:
```sql
ALTER TABLE infolink_otp_codes 
ADD COLUMN first_used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
```

**Krok 2: Zmiana validate-infolink-otp Edge Function**

Przy pierwszym użyciu kodu (gdy `used_sessions = 0`), ustawić `first_used_at`:
```typescript
// Po walidacji kodu, przed incrementem used_sessions:
const isFirstUse = otpRecord.used_sessions === 0;

// Przy update:
await supabase
  .from('infolink_otp_codes')
  .update({ 
    used_sessions: otpRecord.used_sessions + 1,
    ...(isFirstUse && { first_used_at: new Date().toISOString() })
  })
  .eq('id', otpRecord.id);

// Obliczanie expiry sesji - od pierwszego użycia:
const firstUseTime = isFirstUse 
  ? new Date() 
  : new Date(otpRecord.first_used_at);
const sessionExpiresAt = new Date(firstUseTime.getTime() + validityHours * 60 * 60 * 1000);
```

**Krok 3: Zmiana generate-infolink-otp Edge Function**

Zmienić `expires_at` na dłuższy okres oczekiwania (7 dni):
```typescript
// PRZED (linia 134):
const expiresAt = new Date(Date.now() + validityHours * 60 * 60 * 1000);

// PO - 7 dni na aktywację kodu:
const activationPeriodDays = 7;
const expiresAt = new Date(Date.now() + activationPeriodDays * 24 * 60 * 60 * 1000);
```

**Krok 4: Zmiana CombinedOtpCodesWidget**

Zmienić komponent `InfoLinkLiveCountdown` aby liczył od `first_used_at`:
```tsx
const InfoLinkLiveCountdown: React.FC<{ 
  firstUsedAt: string | null;
  validityHours: number;
}> = ({ firstUsedAt, validityHours }) => {
  // Logika identyczna jak HkLiveCountdown
  // Jeśli firstUsedAt === null -> "Oczekuje na użycie"
  // Jeśli jest firstUsedAt -> liczyć first_used_at + validityHours
};
```

Zmienić zapytanie w `fetchInfoLinkCodes` aby pobierać `first_used_at`:
```tsx
.select(`
  id, code, expires_at, used_sessions, created_at, first_used_at,
  reflink:reflinks(id, title, otp_max_sessions, otp_validity_hours),
  infolink_sessions(expires_at)
`)
```

---

## Szczegóły techniczne zmian

| Plik | Typ zmiany | Opis |
|------|------------|------|
| `src/components/dashboard/widgets/ResourcesWidget.tsx` | Modyfikacja | Dodanie `?highlight=ID` do nawigacji |
| `src/pages/KnowledgeCenter.tsx` | Modyfikacja | Obsługa query param, scroll i podświetlenie |
| `infolink_otp_codes` (baza) | Migracja | Dodanie kolumny `first_used_at` |
| `supabase/functions/generate-infolink-otp/index.ts` | Modyfikacja | expires_at = 7 dni |
| `supabase/functions/validate-infolink-otp/index.ts` | Modyfikacja | Ustawianie first_used_at przy pierwszym użyciu |
| `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx` | Modyfikacja | Timer z first_used_at zamiast expires_at |

---

## Wpływ na istniejące dane

- Istniejące kody OTP InfoLink będą miały `first_used_at = NULL`
- Dla kodów gdzie `used_sessions > 0`, można opcjonalnie ustawić `first_used_at = created_at` (migracja danych)
- Nowe kody będą działać poprawnie z nową logiką
