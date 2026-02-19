
# Adnotacje dodatkowych uprawnień przy użytkownikach w panelu admina

## Cel

W rozwiniętym widoku karty użytkownika (po kliknięciu "Więcej") administrator ma widzieć sekcję "Dodatkowe opcje" zawierającą adnotacje o wszystkich specjalnych uprawnieniach danego użytkownika — zarówno aktywnych (zielony badge), jak i wyłączonych (szary badge z napisem "wyłączone").

## Co to są "dodatkowe opcje" w systemie

Na podstawie analizy bazy danych, dla partnera Sebastian Snopek (EQ: 121118999) dostępne są:

Tabela `leader_permissions` (uprawnienia liderskie):
- `individual_meetings_enabled` — spotkania indywidualne
- `tripartite_meeting_enabled` — spotkania trójstronne
- `partner_consultation_enabled` — konsultacje partnerskie
- `can_broadcast` — możliwość nadawania (broadcast)

Tabela `partner_page_user_access`:
- `is_enabled` — dostęp do stron partnerskich

Tabela `calculator_user_access`:
- `has_access` — dostęp do kalkulatora

Tabela `specialist_calculator_user_access`:
- `has_access` — dostęp do kalkulatora specjalisty

## Architektura rozwiązania

Dane o uprawnieniach będą pobierane **w Admin.tsx** jako osobny fetch po stronie serwera i przekazywane do `CompactUserCard` jako prop. Nie modyfikujemy istniejącego RPC — robimy dodatkowe zapytanie po rozwinięciu karty lub przy loadzie listy użytkowników.

**Podejście: leniwe ładowanie per użytkownik** — gdy admin kliknie "Więcej" na karcie użytkownika, komponent pobiera uprawnienia tego konkretnego użytkownika. Nie ma sensu ładować uprawnień dla wszystkich 100+ użytkowników jednocześnie.

## Zmiany w plikach

### 1. Nowy hook `src/hooks/useUserPermissions.ts`

```typescript
// Pobiera wszystkie dodatkowe uprawnienia dla konkretnego user_id
const useUserPermissions = (userId: string | null) => {
  // Parallel fetch:
  // - leader_permissions (individual_meetings_enabled, tripartite_meeting_enabled, 
  //   partner_consultation_enabled, can_broadcast)
  // - partner_page_user_access (is_enabled)
  // - calculator_user_access (has_access)
  // - specialist_calculator_user_access (has_access)
  
  // Returns: { permissions, loading }
}
```

Zwraca gotowy zestaw etykiet z nazwami i statusami.

### 2. `src/components/admin/CompactUserCard.tsx`

**Zmiana triggera rozwijania:** Karta będzie zawsze miała przycisk "Więcej/Mniej" (nie tylko gdy `hasExpandableContent`), ponieważ sekcja uprawnień zawsze może być pokazana.

**Nowa sekcja w `CollapsibleContent`** — "Dodatkowe opcje":

```
┌─────────────────────────────────────────────┐
│  🔑 Dodatkowe opcje                         │
│                                             │
│  [✓ Spotkania indywidualne]                 │
│  [✓ Spotkania trójstronne]                  │
│  [✓ Konsultacje partnerskie]                │
│  [✗ Broadcast  wyłączone]                   │
│  [✓ Strony partnerskie]                     │
│  [✓ Kalkulator]                             │
│  [✓ Kalkulator specjalisty]                 │
└─────────────────────────────────────────────┘
```

Każda pozycja to badge:
- **Aktywna**: zielone tło, ikona `CheckCircle`, np. `"Spotkania indywidualne"`
- **Wyłączona**: szare tło ze strikethrough lub etykieta "wyłączone", np. `"Broadcast — wyłączone"`
- **Brak rekordu** w tabeli: traktujemy jako wyłączone (permission nie istnieje = brak dostępu)

Podczas ładowania: mini spinner `Loader2` obok tytułu sekcji.

**Import hook** w komponencie i wywołanie gdy `isExpanded = true`:
```typescript
// Permissions loaded lazily when card is expanded
const { permissions, loading: permissionsLoading } = useUserPermissions(
  isExpanded ? userProfile.user_id : null
);
```

### 3. Widoczność sekcji

Sekcja "Dodatkowe opcje" jest widoczna dla **wszystkich ról** (admin, partner, specjalista, klient) — ale dane faktycznie mają sens tylko dla partnerów i specjalistów. Dla klientów sekcja może być pusta (wyświetlamy wtedy "Brak przydzielonych dodatkowych opcji").

## Etykiety uprawnień (PL)

| Klucz | Etykieta polska |
|-------|----------------|
| `individual_meetings_enabled` | Spotkania indywidualne |
| `tripartite_meeting_enabled` | Spotkania trójstronne |
| `partner_consultation_enabled` | Konsultacje partnerskie |
| `can_broadcast` | Nadawanie (Broadcast) |
| `partner_page_access` | Strony partnerskie |
| `calculator_access` | Kalkulator |
| `specialist_calculator_access` | Kalkulator specjalisty |

## Pliki do zmiany

| Plik | Zakres |
|------|--------|
| `src/hooks/useUserPermissions.ts` | Nowy hook — 4 zapytania równolegle do tabel uprawnień |
| `src/components/admin/CompactUserCard.tsx` | Użycie hooka, nowa sekcja "Dodatkowe opcje" w CollapsibleContent, przycisk "Więcej" zawsze widoczny |

Nie są potrzebne zmiany w `Admin.tsx`, bazie danych ani nowe migracje.
