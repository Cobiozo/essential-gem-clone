
# Status: logo NIE zostało dodane — wymaga ponownej implementacji

## Co sprawdziłem
- `src/pages/EventGuestRegistration.tsx`, linie 703–717 (`CardHeader`): **brak importu i brak renderu logo**. Kod nadal wygląda dokładnie tak jak przed planem.
- `src/assets/`: **brak pliku** `eqology-ibp-logo.png` (ani żadnego z „eqology"/„ibp" w nazwie).
- Zmienne `isAutoWebinar` (linia 457) i `autoWebinarCategory` (linia 247) **istnieją** i są gotowe do użycia w warunku.
- W poprzedniej turze faktycznie zmieniony został tylko `.lovable/plan.md` i `bun.lock` — sam komponent rejestracji nie został tknięty, a plik obrazu nigdy nie trafił do `src/assets/`.

## Wniosek
**Logo nie wyświetla się w oknie rejestracji** ani dla Business Opportunity, ani dla Health Conversation. Trzeba wykonać implementację od nowa.

## Plan naprawy

### 1. Dodanie pliku logo
Skopiować przesłany wcześniej obraz (`Zrzut_ekranu_2025-12-11_173311.png` z „EQOLOGY Independent Business Partner") do:
```
src/assets/eqology-ibp-logo.png
```

### 2. `src/pages/EventGuestRegistration.tsx` — import
Dodać przy pozostałych importach:
```tsx
import eqologyIbpLogo from '@/assets/eqology-ibp-logo.png';
```

### 3. `src/pages/EventGuestRegistration.tsx` — `CardHeader` (linie 703–717)
Zamienić obecny układ na flexbox z tytułem po lewej i logo po prawej (warunek BO **lub** HC):
```tsx
<CardHeader>
  <div className="flex items-center gap-2 mb-2">
    <Badge variant="outline">
      <Video className="h-3 w-3 mr-1" />
      {labels.webinarBadge}
    </Badge>
  </div>
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1 min-w-0">
      <CardTitle className="text-2xl">{displayTitle}</CardTitle>
      {event.description && (
        <CardDescription
          className="text-base mt-2"
          dangerouslySetInnerHTML={{ __html: event.description }}
        />
      )}
    </div>
    {isAutoWebinar &&
      (autoWebinarCategory === 'business_opportunity' ||
       autoWebinarCategory === 'health_conversation') && (
      <img
        src={eqologyIbpLogo}
        alt="Eqology Independent Business Partner"
        className="h-12 md:h-14 w-auto shrink-0 object-contain"
      />
    )}
  </div>
</CardHeader>
```

### 4. Weryfikacja po wdrożeniu
Sprawdzić że logo pojawia się w obu przypadkach:
- `/events/register/:id?slot=...` dla auto-webinaru kategorii **Business Opportunity**
- `/events/register/:id?slot=...` dla auto-webinaru kategorii **Health Conversation**
- NIE pojawia się dla zwykłych wydarzeń (`event_type !== 'auto_webinar'`)

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/assets/eqology-ibp-logo.png` | Nowy plik (kopia uploadu) |
| `src/pages/EventGuestRegistration.tsx` | Import logo + warunkowy render w `CardHeader` (BO + HC) |

## Efekt
W oknie rejestracji gościa na auto-webinar (BO i HC) po prawej stronie tytułu pojawi się logo „EQOLOGY Independent Business Partner". Dla pozostałych typów wydarzeń logo nie będzie renderowane.
