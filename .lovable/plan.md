

# Ujednolicona nawigacja "Wstecz" w całej aplikacji

## Obecny stan

Nawigacja wstecz jest niespójna:
- **Training** (standalone): ArrowLeft → "Wróć do strony głównej" → `/dashboard`
- **TrainingModule** (standalone): ArrowLeft → "Powrót do szkoleń" → `/training`
- **DashboardLayout pages** (12 stron): SidebarTrigger (hamburger), brak strzałki wstecz
- **Standalone pages** (OmegaBase, Messages, MyAccount, KnowledgeCenter): własne headery, różne wzorce

## Wzorzec docelowy (jak w Akademii)

Na **desktopie**: strzałka wstecz + tekst (np. "Wróć do strony głównej") w topbarze, obok SidebarTrigger.
Na **mobile**: strzałka wstecz **zamiast** SidebarTrigger.

Hierarchia nawigacji:
- **Dashboard** (`/dashboard`): brak wstecz (to jest strona główna)
- **Strony 1-poziomu** (Zdrowa Wiedza, Kalkulatory, Webinary, itp.): wstecz → `/dashboard` ("Strona główna")
- **Strony 2-poziomu** (Player Zdrowa Wiedza, moduł szkolenia): wstecz → strona rodzica

## Rozwiązanie

### 1. Rozszerzyć `DashboardLayout` i `DashboardTopbar` o prop `backTo`

Dodać nowy prop:
```ts
interface DashboardTopbarProps {
  title?: string;
  backTo?: { label: string; path: string } | null;
  // ...existing
}
```

W `DashboardTopbar.tsx`:
- Gdy `backTo` jest podane: na mobile pokazać ArrowLeft (zamiast SidebarTrigger), na desktop ArrowLeft + tekst + separator + SidebarTrigger
- Gdy `backTo` jest `null`/undefined (Dashboard): standardowy SidebarTrigger na obu rozdzielczościach

### 2. Plik: `src/components/dashboard/DashboardTopbar.tsx`

Sekcja "Left side" (linie 73-81) — zmienić na:
```tsx
<div className="flex items-center gap-2 sm:gap-4">
  {backTo ? (
    <>
      {/* Mobile: back arrow replaces sidebar trigger */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(backTo.path)}
        className="sm:hidden h-9 w-9 -ml-1"
      >
        <ArrowLeft className="h-5 w-5" />
      </Button>
      {/* Desktop: back arrow + label + sidebar trigger */}
      <div className="hidden sm:flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(backTo.path)}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {backTo.label}
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <SidebarTrigger />
      </div>
    </>
  ) : (
    <SidebarTrigger className="-ml-1" />
  )}
  {title && (
    <h1 className="text-lg font-semibold hidden sm:block">{title}</h1>
  )}
</div>
```

Import: dodać `ArrowLeft` z lucide-react, `Separator` z components/ui.

### 3. Plik: `src/components/dashboard/DashboardLayout.tsx`

Przekazać nowy prop `backTo` z layoutu do topbara:
```ts
interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  backTo?: { label: string; path: string } | null;
  // ...existing
}
```

### 4. Aktualizacja wszystkich stron używających DashboardLayout

Dodać prop `backTo` do każdego wywołania `<DashboardLayout>`:

| Strona | Route | backTo.path | backTo.label |
|---|---|---|---|
| Dashboard | `/dashboard` | brak (strona główna) | — |
| HealthyKnowledge | `/zdrowa-wiedza` | `/dashboard` | "Strona główna" |
| HealthyKnowledgePlayer | `/zdrowa-wiedza/player/:id` | `/zdrowa-wiedza` | "Zdrowa Wiedza" |
| CommissionCalculator | `/calculator/influencer` | `/dashboard` | "Strona główna" |
| SpecialistCalculator | `/calculator/specialist` | `/dashboard` | "Strona główna" |
| IndividualMeetingsPage | `/events/individual-meetings` | `/dashboard` | "Strona główna" |
| WebinarsPage | `/events/webinars` | `/dashboard` | "Strona główna" |
| TeamMeetingsPage | `/events/team-meetings` | `/dashboard` | "Strona główna" |
| PaidEventsListPage | `/paid-events` | `/dashboard` | "Strona główna" |
| OmegaTests | `/omega-tests` | `/dashboard` | "Strona główna" |
| MyPartnerPage | `/my-partner-page` | `/dashboard` | "Strona główna" |
| LeaderPanel | `/leader` | `/dashboard` | "Strona główna" |

### Pliki do edycji

1. `src/components/dashboard/DashboardTopbar.tsx` — logika backTo w topbarze
2. `src/components/dashboard/DashboardLayout.tsx` — przekazanie prop backTo
3. 12 stron w `src/pages/` — dodanie prop `backTo` do `<DashboardLayout>`

### Strony standalone (Training, TrainingModule)

Te strony już mają prawidłowy wzorzec — nie wymagają zmian.

