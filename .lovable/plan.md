

# Plan: Podwójny zegar ze strefą czasową użytkownika i Polski

## Cel

Wyświetlić zegar zgodny ze strefą czasową użytkownika jako główny, a gdy użytkownik jest w innej strefie niż Polska - pokazać pod spodem mniejszy zegar z czasem warszawskim.

---

## Wizualizacja

### Scenariusz 1: Użytkownik w Polsce (Europe/Warsaw)
```text
┌──────────────────────────────────────────────────────┐
│  Dzień dobry, Sebastian! 👋                          │
│  Piątek, 6 Lutego 2026                               │
│                                                      │
│                    ⏰ 14:28:18      [Polska (CET) ▼] │
│                                                      │
└──────────────────────────────────────────────────────┘
```
→ Bez zmian, jak obecnie.

### Scenariusz 2: Użytkownik w USA (America/New_York)
```text
┌──────────────────────────────────────────────────────┐
│  Good morning, Sebastian! 👋                         │
│  Friday, February 6, 2026                            │
│                                                      │
│                    ⏰ 08:28:18      [Nowy Jork (EST) ▼]│
│                       🇵🇱 14:28 (Polska)             │
│                                                      │
└──────────────────────────────────────────────────────┘
```
→ Główny zegar: czas lokalny użytkownika (duże cyfry)  
→ Pod spodem: mały zegar z czasem polskim (z flagą 🇵🇱 lub ikoną)

---

## Szczegóły UI

### Główny zegar (bez zmian)
- Rozmiar: `text-2xl md:text-3xl`
- Czcionka: `font-mono font-bold text-primary`
- Ikona: `Clock` z lucide-react

### Dodatkowy zegar polskiego czasu (nowy)
- Rozmiar: `text-xs`
- Kolor: `text-muted-foreground`
- Format: `HH:mm` (bez sekund, bo to tylko orientacyjne)
- Prefiks: flaga 🇵🇱 lub tekst "PL:"
- Widoczność: **tylko gdy `selectedTimezone !== 'Europe/Warsaw'`**

---

## Implementacja techniczna

### Plik: `src/components/dashboard/widgets/WelcomeWidget.tsx`

#### 1. Dodać formatowanie czasu polskiego:

```tsx
// Linia ~100: Formatowanie głównego czasu (istniejące)
const formattedTime = formatInTimeZone(currentTime, selectedTimezone, 'HH:mm:ss');

// Nowe: Formatowanie czasu polskiego
const polishTime = formatInTimeZone(currentTime, 'Europe/Warsaw', 'HH:mm');

// Sprawdzenie czy strefa jest inna niż polska
const isNonPolishTimezone = selectedTimezone !== 'Europe/Warsaw';
```

#### 2. Zaktualizować JSX sekcji zegara (linia ~121-138):

```tsx
{/* Digital clock with timezone selector */}
<div className="flex flex-col items-end gap-0.5">
  {/* Główny zegar - czas użytkownika */}
  <div className="flex items-center gap-3">
    <div className="flex items-center gap-2 text-2xl md:text-3xl font-mono font-bold text-primary tabular-nums">
      <Clock className="h-5 w-5 md:h-6 md:w-6 text-primary/70" />
      {formattedTime}
    </div>
    <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
      <SelectTrigger className="w-[160px] h-8 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {timezones.map(tz => (
          <SelectItem key={tz.value} value={tz.value} className="text-xs">
            {tz.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
  
  {/* Mniejszy zegar polskiego czasu - widoczny tylko gdy strefa inna niż polska */}
  {isNonPolishTimezone && (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground pr-[168px]">
      <span className="text-base">🇵🇱</span>
      <span className="font-mono tabular-nums">{polishTime}</span>
      <span className="text-[10px]">(Polska)</span>
    </div>
  )}
</div>
```

---

## Alternatywna wersja wizualna

Jeśli preferujesz bardziej kompaktowy styl:

```tsx
{/* Alternatywa: inline z separatorem */}
{isNonPolishTimezone && (
  <div className="text-xs text-muted-foreground font-mono tabular-nums">
    czas w Polsce: {polishTime}
  </div>
)}
```

Lub z ikoną flagi jako obrazek:

```tsx
{isNonPolishTimezone && (
  <div className="flex items-center gap-1 text-xs text-muted-foreground">
    <img 
      src="https://flagcdn.com/w20/pl.png" 
      alt="PL" 
      className="h-3 w-auto rounded-sm"
    />
    <span className="font-mono tabular-nums">{polishTime}</span>
  </div>
)}
```

---

## Plik do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/widgets/WelcomeWidget.tsx` | Dodanie polskiego czasu pod głównym zegarem |

---

## Brak wpływu na istniejące funkcje

Ta zmiana jest **czysto wizualna** i nie wpływa na:
- ❌ Logikę wydarzeń (nadal używają `Europe/Warsaw` jako domyślnej strefy)
- ❌ Formularze rejestracji
- ❌ Wyświetlanie czasu wydarzeń (polityka "fixed-timezone display")
- ❌ Powiadomienia czy przypomnienia

---

## Rezultat

Użytkownicy spoza Polski będą widzieć:
1. **Główny duży zegar** z ich lokalnym czasem
2. **Mały zegar pod spodem** pokazujący aktualny czas w Polsce

To pomoże im szybko zorientować się w różnicy czasowej względem platformy (która operuje głównie w strefie polskiej).

