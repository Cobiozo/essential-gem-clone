## Problem

1. W `TaskCard.tsx` (linia 212) zadanie "Dodaj kontakty do CRM" nawiguje do `/kontakty-prywatne` — taka trasa **nie istnieje** w `App.tsx`, więc pojawia się 404. Moduł kontaktów prywatnych jest w `/my-account?tab=n` (komponent `TeamContactsTab`).
2. Na stronie `/wyzwanie-90` (`ChallengeDashboard`) nie ma przycisku powrotu do pulpitu.

## Plan

### 1. Naprawić nawigację do kontaktów CRM
Plik: `src/components/challenge/TaskCard.tsx` (linia 212)

```ts
if (check === "team_contacts_added") { navigate("/my-account?tab=n"); return; }
```

Sprawdzę przy okazji inne `navigate(...)` w tym pliku pod kątem nieistniejących tras (`/training/...#lesson-...`, `/knowledge?resource=...`, `/zdrowa-wiedza?share=...`) i zostawię je bez zmian (są to istniejące strony, tylko z query/hash).

### 2. Dodać przycisk powrotu do pulpitu
Plik: `src/components/challenge/ChallengeDashboard.tsx`

Nad kafelkiem hero dodać pasek z przyciskiem w lewym górnym rogu:

```tsx
<div className="flex items-center justify-between">
  <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
    <ArrowLeft className="w-4 h-4 mr-1.5" /> Pulpit
  </Button>
</div>
```

Import `useNavigate` z `react-router-dom`, `ArrowLeft` z `lucide-react`, `Button` z `@/components/ui/button`.

### Weryfikacja
- Otworzyć `/wyzwanie-90`, kliknąć "Dodaj kontakty (5)" → powinien otworzyć się `/my-account` z aktywną zakładką kontaktów CRM (zamiast 404).
- Sprawdzić obecność przycisku „← Pulpit" w lewym górnym rogu i jego działanie.
