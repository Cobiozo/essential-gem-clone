
# Plan: Naprawa szerokości News Ticker + UX dla zewnętrznych webinarów

## Część 1: Naprawa szerokości paska informacyjnego

### Problem
NewsTicker nadal rozciąga się poza widoczny obszar. Problem wynika z kombinacji czynników:

1. `WelcomeWidget` ma `col-span-full` ale brak `overflow-hidden`
2. Kontener `CardContent` nie ogranicza szerokości dzieci
3. Animacja marquee z `whitespace-nowrap` + duplikacja elementów może rozciągać parent

### Rozwiązanie

**Plik: `src/components/dashboard/widgets/WelcomeWidget.tsx`**

Dodanie `overflow-hidden` do kontenera CardContent i dodatkowych ograniczeń dla NewsTicker:

```tsx
// Linia 106: CardContent
<CardContent className="p-6 overflow-hidden">

// Linia 139: NewsTicker kontener
<div className="mt-4 overflow-hidden w-full max-w-full">
  <NewsTicker />
</div>
```

**Plik: `src/components/news-ticker/NewsTicker.tsx`**

Dodanie `overflow-x-hidden` jako dodatkowe zabezpieczenie:

```tsx
// Linia 114-116: główny kontener
className={cn(
  "relative overflow-hidden overflow-x-hidden",
  "min-w-0 max-w-full w-full",
  ...
)}
```

---

## Część 2: UX dla zewnętrznych webinarów

### Obecny problem
Partner widzi przycisk "Zapisz się" ale nie jest jasne:
- Że rejestracja w PureLife służy tylko do otrzymania przypomnienia/wpisu w kalendarzu
- Że musi RÓWNIEŻ zapisać się na zewnętrznej platformie aby uzyskać dostęp

### Proponowane rozwiązanie: Tryb "Zewnętrzna platforma"

Dodanie wyraźnego oznaczenia i dwuetapowego procesu dla webinarów zewnętrznych:

#### A) Nowe pole w formularzu webinaru

**Plik: `src/components/admin/WebinarForm.tsx`**

Nowy przełącznik i pole tekstowe:
```
✅ Zewnętrzna platforma (webinar odbywa się poza PureLife)

Gdy włączony:
└─ Pokaże się pole: "Komunikat dla uczestników"
   Domyślny tekst: "Ten webinar odbywa się na zewnętrznej platformie. 
   Zapisz się tutaj, aby otrzymać przypomnienie, a następnie 
   użyj przycisku poniżej, aby zarejestrować się na platformie docelowej."
```

#### B) Wyświetlanie komunikatu na karcie wydarzenia

**Plik: `src/components/events/EventCardCompact.tsx`**

Gdy `is_external_platform = true`:
1. Wyświetl żółty banner/alert z komunikatem
2. Przycisk "Zapisz się" zmieni tekst na "📅 Dodaj do kalendarza"
3. Przyciski akcji (zewnętrzne linki) będą wyraźnie wyróżnione

```
┌────────────────────────────────────────────┐
│ 🌐 WEBINAR NA ZEWNĘTRZNEJ PLATFORMIE       │
│ ─────────────────────────────────────────  │
│ Zapisz się tutaj, aby otrzymać            │
│ przypomnienie w kalendarzu.               │
│ Dostęp do webinaru uzyskasz po kliknięciu │
│ przycisku poniżej.                        │
├────────────────────────────────────────────┤
│ [📅 Dodaj do kalendarza]                   │
│ [▶️ Przejdź do rejestracji] ← Primary      │
└────────────────────────────────────────────┘
```

#### C) Zmiany w EventDetailsDialog

**Plik: `src/components/events/EventDetailsDialog.tsx`**

Podobna logika - wyświetlenie jasnego komunikatu o zewnętrznej platformie.

### Schemat bazy danych

Nowe pole w tabeli `events`:
- `is_external_platform` (boolean, default: false)
- `external_platform_message` (text, nullable) - opcjonalny niestandardowy komunikat

### Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/widgets/WelcomeWidget.tsx` | Dodanie `overflow-hidden` |
| `src/components/news-ticker/NewsTicker.tsx` | Dodanie `overflow-x-hidden` |
| `src/components/admin/WebinarForm.tsx` | Nowy przełącznik "Zewnętrzna platforma" + pole komunikatu |
| `src/components/events/EventCardCompact.tsx` | Banner informacyjny + zmiana tekstu przycisku |
| `src/components/events/EventDetailsDialog.tsx` | Banner informacyjny dla zewnętrznych webinarów |
| Baza danych (migracja) | Nowe pola `is_external_platform` i `external_platform_message` |

### Oczekiwany rezultat

1. **News Ticker** - pasek nie będzie rozciągał się poza widoczny obszar
2. **Zewnętrzne webinary** - Partner widzi:
   - Wyraźny komunikat że webinar jest na zewnętrznej platformie
   - Przycisk "Dodaj do kalendarza" (zapis w PureLife)
   - Wyróżniony przycisk przekierowujący do zewnętrznej rejestracji
   - Jasna informacja o dwóch krokach procesu
