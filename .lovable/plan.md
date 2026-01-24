
# Plan: Połączenie widżetów OTP w jeden spójny komponent

## Analiza obecnego stanu

### Obecne widżety na dashboardzie (widoczne na zrzucie)
Na ekranie widać dwa osobne kafelki:
1. **"Aktywne kody OTP"** - dla InfoLinks (kody PL-XXXX-XX)
2. **"Aktywne kody ZW"** - dla Zdrowa Wiedza (kody ZW-XXXX-XX)

### Problem
- Za dużo kafelków na dashboardzie
- Różny wygląd obu widżetów (niespójny design)
- Nazewnictwo nie jest jasne ("OTP" vs "ZW")

---

## Proponowane rozwiązanie

### Nowy połączony widżet: **"Kody dostępu OTP"**

Jeden widżet z **zakładkami** (Tabs) pozwalający przełączać między:
- **InfoLinki** (kody PL-XXXX-XX)  
- **Zdrowa Wiedza** (kody ZW-XXXX-XX)

Każda zakładka pokazuje liczbę aktywnych kodów w badge.

```text
┌─────────────────────────────────────────────┐
│ 🔑 Kody dostępu OTP                         │
├─────────────────────────────────────────────┤
│  [InfoLinki (3)]    [Zdrowa Wiedza (2)]     │
├─────────────────────────────────────────────┤
│ PL-79TW-9J                    ⬜ Oczekuje   │
│ SZANSA BIZNESOWA DLA PARTNERA               │
│ 🕐 Oczekuje na użycie    👥 0/2 sesji       │
├─────────────────────────────────────────────┤
│ PL-7MQV-NV                    🟢 Użyty      │
│ SZANSA BIZNESOWA DLA PARTNERA               │
│ 🕐 3:24:46               👥 1/2 sesji       │
└─────────────────────────────────────────────┘
```

---

## Szczegóły implementacji

### 1. Nowy plik: `CombinedOtpCodesWidget.tsx`

Zastąpi oba istniejące widżety jednym komponentem.

**Struktura komponentu:**
```text
CombinedOtpCodesWidget
├── SharedLiveCountdown (wspólny komponent countdown)
├── Tabs (Radix UI)
│   ├── TabsList
│   │   ├── TabsTrigger "InfoLinki" + Badge(count)
│   │   └── TabsTrigger "Zdrowa Wiedza" + Badge(count)
│   ├── TabsContent "infolinks"
│   │   └── CodesList (lista kodów InfoLink)
│   └── TabsContent "zdrowa-wiedza"
│       └── CodesList (lista kodów HK)
└── EmptyState (gdy brak kodów w obu kategoriach)
```

### 2. Ujednolicony wygląd każdego kodu

Oba typy kodów będą miały identyczny layout:
- Kod w font-mono (np. PL-79TW-9J lub ZW-4AV7-6J)
- Tytuł materiału/linku
- Status badge: Oczekuje / Użyty (X/Y) / Wyczerpany
- Timer: "Oczekuje na użycie" lub countdown
- Sesje: X/Y sesji
- Przycisk kopiowania

### 3. Zmiany w Dashboard.tsx

```typescript
// PRZED:
const ActiveOtpCodesWidget = lazy(() => ...);
const ActiveHkCodesWidget = lazy(() => ...);

// Renderowanie w dwóch miejscach

// PO:
const CombinedOtpCodesWidget = lazy(() => 
  import('@/components/dashboard/widgets/CombinedOtpCodesWidget')
);

// Jedno renderowanie
```

### 4. Usunięcie starych widżetów

Pliki do usunięcia:
- `ActiveOtpCodesWidget.tsx`
- `ActiveHkCodesWidget.tsx`

---

## Szczegółowa specyfikacja UI

### Nazewnictwo zakładek
| Obecne | Nowe |
|--------|------|
| "Aktywne kody OTP" | Tab: "InfoLinki" |
| "Aktywne kody ZW" | Tab: "Zdrowa Wiedza" |

### Wspólny header widżetu
```text
🔑 Kody dostępu OTP
```
Prosty tytuł bez opisu (opis niepotrzebny przy zakładkach).

### Statusy kodów (ujednolicone)
| Status | Badge | Kolor |
|--------|-------|-------|
| Nieużyty | "Oczekuje" | outline (szary) |
| Użyty (aktywny) | "Użyty (1/3)" | green-500 |
| Wyczerpany sesje | "Wyczerpany" | secondary (szary) |

### Countdown timer
- **Przed użyciem:** "Oczekuje na użycie" (tekst italic)
- **Po użyciu:** "3:24:46" (countdown z tabular-nums)

---

## Lista plików do modyfikacji

| Plik | Akcja | Opis |
|------|-------|------|
| `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx` | Utworzenie | Nowy połączony widżet |
| `src/pages/Dashboard.tsx` | Modyfikacja | Zamiana dwóch widżetów na jeden |
| `src/components/dashboard/widgets/ActiveOtpCodesWidget.tsx` | Usunięcie | Zastąpiony nowym |
| `src/components/dashboard/widgets/ActiveHkCodesWidget.tsx` | Usunięcie | Zastąpiony nowym |

---

## Korzyści

1. **Mniej kafelków** - jeden widżet zamiast dwóch
2. **Spójny design** - identyczny wygląd dla obu typów kodów
3. **Lepsze nazewnictwo** - "InfoLinki" i "Zdrowa Wiedza" zamiast "OTP" i "ZW"
4. **Widoczność** - badge na zakładkach pokazuje ile kodów jest aktywnych
5. **Zachowana funkcjonalność** - kopiowanie, countdown, statusy działają jak wcześniej

---

## Detale techniczne

### Shared LiveCountdown
Jeden komponent countdown używany dla obu typów kodów:
- Visibility API (pause gdy tab niewidoczny)
- tabular-nums dla stabilnych wymiarów
- Format: `H:MM:SS` lub `MM:SS`

### Fetching danych
- Oba zapytania wykonywane równolegle przy mount
- Polling co 60s (tylko gdy tab widoczny)
- Realtime subscription dla zmian
- Event listeners: `otpCodeGenerated`, `hkOtpCodeGenerated`

### Stan gdy brak kodów
- Jeśli brak kodów w obu kategoriach → widżet się nie renderuje (return null)
- Jeśli brak w jednej kategorii → pusta lista z komunikatem w tej zakładce

---

## Podsumowanie zmian

Po implementacji:
- Dashboard będzie miał **o jeden kafelek mniej**
- Kody OTP dla InfoLinków i Zdrowa Wiedza będą w **jednym spójnym widżecie**
- Nazewnictwo będzie **czytelniejsze** (zakładki "InfoLinki" i "Zdrowa Wiedza")
- Design będzie **ujednolicony** i zgodny z resztą aplikacji
