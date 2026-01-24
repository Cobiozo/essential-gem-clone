
# Naprawa linii wchodzących na kafelki węzłów

## Problem

Linie SVG są renderowane z `z-10`, co powoduje że przechodzą PRZEZ kafelki węzłów zamiast kończyć się NA GÓRZE kafelków. Na screenshocie widać, że żółta linia przechodzi przez imiona "Grzegorz Latocha" i "Jolanta Szast".

**Przyczyna:**
- SVG jest pozycjonowane z `top: -24px`
- Ścieżka kończy się na `endY: 48px` (czyli 24px od początku kontenera dzieci)
- Ale węzły dzieci zaczynają się w tym samym kontenerze, więc linia wchodzi na kafelek

## Rozwiązanie

Zmiana z-index SVG z `z-10` na `z-0` (lub usunięcie), oraz umieszczenie SVG ZA węzłami (nie nad nimi). Linie powinny być tłem, a węzły powinny je przykrywać.

Dodatkowo: skrócenie ścieżki `endY` tak, aby linia kończyła się dokładnie na granicy górnej krawędzi kafelka.

---

## Szczegóły techniczne

### Plik: `OrganizationChart.tsx`

**Zmiana 1: Zmiana z-index SVG (linia 137)**

```typescript
// PRZED:
className="absolute pointer-events-none overflow-visible z-10"

// PO:
className="absolute pointer-events-none overflow-visible"
```

Usunięcie `z-10` sprawi, że SVG będzie za węzłami (z-index domyślny).

**Zmiana 2: Skrócenie wysokości ścieżki**

Zmiana parametru `endY` w `createCurvePath` z 48 na 32 (lub odpowiednio dopasowane do `mt-8`):

```typescript
// PRZED (linia 155):
d={createCurvePath(centerX, 0, childX, 48, 14)}

// PO:
d={createCurvePath(centerX, 0, childX, 32, 14)}
```

I dostosowanie wysokości SVG:
```typescript
// PRZED:
height: 48,
top: -24,

// PO:
height: 32,
top: -24,
```

To sprawi że linia kończy się dokładnie na górnej krawędzi kontenera dzieci, nie wchodząc na kafelki.

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/team-contacts/organization/OrganizationChart.tsx` | Usunięcie z-10, skrócenie wysokości ścieżki SVG |

---

## Oczekiwany rezultat

Linie łączące będą kończyć się dokładnie nad górną krawędzią kafelków węzłów, nie wchodząc na ich zawartość (imię, nazwisko, badge).
