
# Klikalne adnotacje uprawnień — przekierowanie do miejsca zarządzania

## Cel

Każdy badge "Dodatkowych opcji" na karcie użytkownika ma stać się kliknięty link, który przenosi administratora bezpośrednio do odpowiedniego panelu zarządzania tym uprawnieniem.

## Analiza tras (URL mapping)

Na podstawie analizy kodu:

| Uprawnienie | Sekcja admin | URL docelowy |
|-------------|-------------|--------------|
| Spotkania indywidualne | `/admin → Events → zakładka "individual-meetings"` | `/admin?tab=events&subTab=individual-meetings` |
| Spotkania trójstronne | `/admin → Events → zakładka "individual-meetings"` | `/admin?tab=events&subTab=individual-meetings` |
| Konsultacje partnerskie | `/admin → Events → zakładka "individual-meetings"` | `/admin?tab=events&subTab=individual-meetings` |
| Nadawanie (Broadcast) | `/admin → Events → zakładka "individual-meetings"` | `/admin?tab=events&subTab=individual-meetings` |
| Strony partnerskie | `/admin → PartnerPages → zakładka "access"` | `/admin?tab=partner-pages` |
| Kalkulator | `/admin → Calculator` | `/admin?tab=calculator` |
| Kalkulator specjalisty | `/admin → SpecialistCalculator` | `/admin?tab=specialist-calculator` |

Wszystkie 4 uprawnienia spotkań/broadcast są zarządzane w **jednym miejscu** — `IndividualMeetingsManagement` wewnątrz `EventsManagement`, zakładka `individual-meetings`.

## Problem z głębokimi linkami dla EventsManagement

`EventsManagement` używa lokalnego stanu `useState('webinars')` zamiast URL params. Dlatego link `/admin?tab=events` zawsze otworzy zakładkę "Webinary", nie "Spotkania indywidualne".

**Rozwiązanie:** Dodanie obsługi `subTab` z URL do `EventsManagement` — komponent będzie czytać `?subTab=` przy inicjalizacji (jeden `useEffect`).

## Zmiany w plikach

### 1. `src/hooks/useUserPermissions.ts`

Rozszerzenie interfejsu `PermissionItem` o pole `adminUrl: string` — adres URL do panelu zarządzania:

```typescript
export interface PermissionItem {
  key: string;
  label: string;
  enabled: boolean;
  adminUrl: string;  // NOWE: URL do panelu zarządzania
}
```

Każde uprawnienie dostaje swój URL:
- `individual_meetings_enabled`, `tripartite_meeting_enabled`, `partner_consultation_enabled`, `can_broadcast` → `/admin?tab=events&subTab=individual-meetings`
- `partner_page_access` → `/admin?tab=partner-pages`
- `calculator_access` → `/admin?tab=calculator`
- `specialist_calculator_access` → `/admin?tab=specialist-calculator`

### 2. `src/components/admin/CompactUserCard.tsx`

Zamiana statycznych `<span>` badgy na klikalne elementy `<a>` (lub `<button>` z `useNavigate`):

**Aktywne uprawnienie (zielony badge):**
```tsx
<a href={perm.adminUrl} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full 
  bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 
  border border-green-200 dark:border-green-800
  hover:bg-green-200 dark:hover:bg-green-900 
  cursor-pointer transition-colors group"
  title={`Zarządzaj: ${perm.label}`}
>
  <CheckCircle className="w-3 h-3" />
  {perm.label}
  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-70 transition-opacity" />
</a>
```

**Wyłączone uprawnienie (szary badge):**
```tsx
<a href={perm.adminUrl} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full 
  bg-muted text-muted-foreground border border-border
  hover:bg-muted/80 hover:text-foreground 
  cursor-pointer transition-colors group"
  title={`Włącz: ${perm.label}`}
>
  <span className="line-through opacity-60">{perm.label}</span>
  <span className="opacity-60 ml-0.5">— wyłączone</span>
  <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-50 transition-opacity" />
</a>
```

Używamy `<a href>` zamiast `useNavigate`, bo chcemy zachować możliwość otwarcia w nowej karcie (Ctrl+Click).

### 3. `src/components/admin/EventsManagement.tsx`

Dodanie odczytu `?subTab=` z URL params przy inicjalizacji komponentu (2 linijki):

```typescript
const [searchParams] = useSearchParams();
const [activeTab, setActiveTab] = useState(
  searchParams.get('subTab') || 'webinars'
);
```

Dzięki temu URL `/admin?tab=events&subTab=individual-meetings` automatycznie otworzy właściwą zakładkę.

## Zachowanie przy kliknięciu

1. Admin widzi kartę użytkownika Sebastian Snopek rozwinięta
2. Klika badge "Spotkania indywidualne" (zielony) lub "Nadawanie (Broadcast) — wyłączone" (szary)
3. Przeglądarka przechodzi do `/admin?tab=events&subTab=individual-meetings`
4. `EventsManagement` otwiera się bezpośrednio na zakładce "Spotkania indywidualne"
5. Admin widzi tabelę partnerów i może włączyć/wyłączyć uprawnienia

Hover na badgu pokazuje ikonę `ExternalLink` (dyskretna, pojawia się tylko przy najechaniu).

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/hooks/useUserPermissions.ts` | Dodanie pola `adminUrl` do `PermissionItem` i każdego uprawnienia |
| `src/components/admin/CompactUserCard.tsx` | Zamiana `<span>` na `<a href>` z hover efektem i ikoną `ExternalLink` |
| `src/components/admin/EventsManagement.tsx` | Dodanie `useSearchParams` i inicjalizacja `activeTab` z URL |

Nie są potrzebne zmiany w bazie danych ani nowe migracje.
