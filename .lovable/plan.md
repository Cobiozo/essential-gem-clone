
# Plan: Bezpieczne usunięcie widżetu Aktywnych Użytkowników i optymalizacja wydajności

## Analiza bezpieczeństwa zmian

Przed usunięciem przeanalizowałem wszystkie zależności:

### ✅ Pliki używające `useUserPresence` i `ActiveUsersWidget`:

| Plik | Użycie | Status po usunięciu |
|------|--------|---------------------|
| `src/pages/Dashboard.tsx` | Import + render widżetu | ✅ Usunę odniesienie |
| `src/components/dashboard/widgets/ActiveUsersWidget.tsx` | Główny plik widżetu | ✅ Do usunięcia |
| `src/hooks/useUserPresence.ts` | Hook presence | ✅ Do usunięcia |
| `src/components/onboarding/tourSteps.ts` | Krok w onboardingu | ✅ Usunę krok |

### ✅ Niezależne systemy (pozostają bez zmian):

| System | Plik | Opis |
|--------|------|------|
| Admin Presence | `useAdminPresence.ts` | Osobny hook dla panelu admina - **NIE DOTYKAM** |
| Floating Admin | `FloatingAdminPresence.tsx` | Widget dla adminów w CMS - **NIE DOTYKAM** |

Te dwa systemy używają **innego kanału** (`admin-presence-shared`) i **innego hooka** (`useAdminPresence`) - są całkowicie niezależne.

---

## Sekcja techniczna

### Zmiana 1: Usunięcie z Dashboard.tsx

**Plik:** `src/pages/Dashboard.tsx`

**Linia 20 - usunięcie importu:**
```tsx
// USUNĄĆ:
const ActiveUsersWidget = lazy(() => import('@/components/dashboard/widgets/ActiveUsersWidget'));
```

**Linie 136-139 - usunięcie renderowania:**
```tsx
// USUNĄĆ:
{/* Active Users Widget - only visible to admins */}
<Suspense fallback={<WidgetSkeleton />}>
  <ActiveUsersWidget />
</Suspense>
```

### Zmiana 2: Usunięcie kroku onboardingu

**Plik:** `src/components/onboarding/tourSteps.ts`

**Linie 111-118 - usunięcie kroku:**
```typescript
// USUNĄĆ cały obiekt:
{
  id: 'active-users-widget',
  targetSelector: '[data-tour="active-users-widget"]',
  title: 'Aktywni Użytkownicy',
  description: 'Statystyki aktywności użytkowników platformy. Widoczne tylko dla administratorów.',
  position: 'bottom',
  visibleFor: ['admin'],
},
```

### Zmiana 3: Usunięcie plików

**Pliki do usunięcia:**
- `src/components/dashboard/widgets/ActiveUsersWidget.tsx`
- `src/hooks/useUserPresence.ts`

---

## Optymalizacje wydajności (bez zmian struktury)

### Zmiana 4: Zwiększenie interwału sprawdzania "stuck" wideo

**Plik:** `src/lib/videoBufferConfig.ts`

**Linia 39:**
```typescript
// PRZED:
stuckDetectionIntervalMs: 10000,  // Check every 10s

// PO:
stuckDetectionIntervalMs: 20000,  // Check every 20s - mniej inwazyjne
```

### Zmiana 5: Zmniejszenie częstotliwości OTP countdown

**Plik:** `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx`

**Linia 73:**
```typescript
// PRZED:
const interval = setInterval(updateCountdown, 1000);

// PO:
const interval = setInterval(updateCountdown, 5000); // Co 5 sekund zamiast co 1
```

### Zmiana 6: Lazy loading dla miniaturek Zdrowa Wiedza

**Plik:** `src/pages/HealthyKnowledge.tsx`

**Linia ~260 - dodanie atrybutów lazy loading:**
```tsx
// PRZED:
<img
  src={material.thumbnail_url}
  alt={material.title}
  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
/>

// PO:
<img
  src={material.thumbnail_url}
  alt={material.title}
  loading="lazy"
  decoding="async"
  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
/>
```

---

## Podsumowanie zmian

| Plik | Akcja | Wpływ na wydajność |
|------|-------|-------------------|
| `Dashboard.tsx` | Usunięcie importu i renderowania | Eliminacja WebSocket dla wszystkich użytkowników |
| `tourSteps.ts` | Usunięcie kroku onboardingu | Żaden |
| `ActiveUsersWidget.tsx` | **USUNIĘCIE PLIKU** | Eliminacja widżetu |
| `useUserPresence.ts` | **USUNIĘCIE PLIKU** | Eliminacja heartbeatów i połączeń Realtime |
| `videoBufferConfig.ts` | 10s → 20s stuck detection | -50% sprawdzeń wideo |
| `CombinedOtpCodesWidget.tsx` | 1s → 5s countdown | -80% re-renderów OTP |
| `HealthyKnowledge.tsx` | lazy loading obrazów | Szybsze ładowanie listy materiałów |

---

## Szacowane oszczędności

**Przed optymalizacją (20 aktywnych użytkowników):**
- ~40 WebSocket połączeń/minutę (presence sync)
- ~40 zapisów heartbeat/minutę do Supabase
- ~80 odświeżeń listy użytkowników/minutę

**Po optymalizacji:**
- 0 WebSocket połączeń presence dla zwykłych użytkowników
- 0 heartbeatów dla zwykłych użytkowników
- Mniej re-renderów dashboardu

---

## Co pozostanie nienaruszone

- `FloatingAdminPresence` - widget w panelu admina (używa `useAdminPresence`)
- `AdminPresenceWidget` - lista innych adminów w CMS
- Kanał `admin-presence-shared` - dla adminów w CMS
- Wszystkie funkcje rezerwacji spotkań
- Wszystkie funkcje szkoleń
- Wszystkie funkcje Zdrowej Wiedzy
- Wszystkie OTP kody
