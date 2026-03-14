

# Naprawa wykresów kołowych i czytelności tekstów na dashboardzie

## Problemy

1. **Wykresy kołowe pokazują "100%"** — label wewnątrz pie (`labelLine={false}`) używa `percent` z Recharts, który dla jednej kategorii daje 100%. Przy wielu kategoriach labele nachodzą na siebie wewnątrz wykresu. Rozwiązanie: zamienić na label z `labelLine={true}` (linie prowadzące na zewnątrz) i pokazywać **liczbę + procent**, np. "Komputer 26 (63%)".

2. **Nieczytelne teksty** — Tooltip Recharts używa domyślnego jasnego tła, co w dark mode daje ciemny tekst na ciemnym tle. Etykiety osi (np. "pt. 13") też są za blade. Rozwiązanie: dodać custom `contentStyle` na Tooltip z odpowiednimi kolorami i zwiększyć kontrast tick labels.

## Zmiany w `SecurityDashboard.tsx`

### A. Custom Tooltip style
Dodać stały obiekt `tooltipStyle` z `backgroundColor`, `border`, `color` dopasowanymi do dark mode (użyć `hsl(var(--card))` i `hsl(var(--foreground))`).

### B. Wykresy kołowe — 3 instancje (device, OS, browser)
- Zmienić `labelLine={false}` → `labelLine={true}`
- Zmienić label na: `({ name, value, percent }) => \`${name} ${value} (${(percent*100).toFixed(0)}%)\``
- Zwiększyć `outerRadius` do 65, dodać `innerRadius={25}` (donut) żeby labele miały więcej miejsca

### C. Tooltip na wszystkich wykresach
Zamienić `<Tooltip />` na `<Tooltip contentStyle={tooltipStyle} />` na wszystkich 8 wykresach.

### D. Tick labels
Zmienić `className="fill-muted-foreground"` na jawne `tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}` na osiach XAxis/YAxis — jaśniejszy kolor tekstu.

## Plik do zmiany
- `src/components/admin/security/SecurityDashboard.tsx`

