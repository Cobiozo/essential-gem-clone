

# Naprawa widoczności linii łączących - problem z z-index

## Problem

Linie SVG są zasłaniane przez kafelki węzłów. Na screenshocie widać, że linia od "Sebastian Snopek (Partner)" do "Sebastian Snopek (Klient)" jest ucięta/zasłonięta przez kafelek dziecka.

**Przyczyna:** SVG jest renderowane z `top: -24` ale nie ma ustawionego `z-index`, więc węzły dzieci (renderowane później w DOM) przykrywają linie.

---

## Rozwiązanie

Dodanie odpowiedniego `z-index` do elementu SVG, aby linie były renderowane NAD węzłami dzieci.

### Plik: `OrganizationChart.tsx`

**Zmiana w linii 137:**

```typescript
// PRZED:
<svg 
  className="absolute pointer-events-none overflow-visible"
  style={{ 
    width: totalWidth,
    height: 48,
    left: '50%',
    transform: 'translateX(-50%)',
    top: -24,
  }}
>

// PO:
<svg 
  className="absolute pointer-events-none overflow-visible z-10"
  style={{ 
    width: totalWidth,
    height: 48,
    left: '50%',
    transform: 'translateX(-50%)',
    top: -24,
  }}
>
```

Dodanie `z-10` (z-index: 10) sprawi, że linie SVG będą zawsze widoczne ponad węzłami.

---

## Plik do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/organization/OrganizationChart.tsx` | Dodanie `z-10` do SVG overlay |

---

## Oczekiwany rezultat

Linia łącząca węzeł rodzica z węzłem dziecka będzie w pełni widoczna, nie będzie zasłaniana przez kafelki węzłów.

