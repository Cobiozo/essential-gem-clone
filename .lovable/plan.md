
# Plan: Przeniesienie ikony cookie do stopki

## Problem
Pływająca ikona "Ustawienia cookies" (niebieski przycisk z tarczą) przeszkadza użytkownikom - nachodzi na listę kontaktów i inne elementy interfejsu.

## Rozwiązanie
Po akceptacji zgody cookie, zamiast wyświetlać pływającą ikonę, dodamy link "Ustawienia cookie" do stopki strony głównej i pulpitu.

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/cookies/CookieConsentBanner.tsx` | Usunięcie renderowania `CookieRevisitButton` |
| `src/components/homepage/Footer.tsx` | Dodanie linku "Ustawienia cookie" |
| `src/components/dashboard/widgets/DashboardFooterSection.tsx` | Dodanie linku "Ustawienia cookie" |
| `src/hooks/useTranslations.ts` | Dodanie tłumaczenia `footer.cookieSettings` |

---

## Szczegóły implementacji

### 1. CookieConsentBanner.tsx
Usunięcie warunkowego renderowania `CookieRevisitButton` (linie ~241-247):
```tsx
// PRZED:
{hasConsented && !showBanner && <CookieRevisitButton onClick={reopenBanner} />}

// PO:
// Usunięte - przycisk przeniesiony do stopek
```

### 2. Footer.tsx (strona główna)
Dodanie przycisku obok linków "Polityka prywatności" i "Regulamin":
```tsx
import { useCookieConsent } from '@/hooks/useCookieConsent';

// W komponencie:
const { reopenBanner } = useCookieConsent();

// W sekcji linków:
<button onClick={reopenBanner} className="hover:text-primary transition-colors">
  Ustawienia cookie
</button>
```

### 3. DashboardFooterSection.tsx (pulpit)
Analogiczna zmiana - dodanie linku w stopce dashboardu:
```tsx
<button onClick={reopenBanner}>
  Ustawienia cookie
</button>
```

### 4. Tłumaczenia
Dodanie klucza do `useTranslations.ts`:
```tsx
'footer.cookieSettings': 'Ustawienia cookie'
```

---

## Rezultat
- Czysta nawigacja bez pływających elementów
- Dostęp do ustawień cookie zachowany w stopce
- Spójny wygląd z innymi linkami prawnymi (Regulamin, Polityka prywatności)
