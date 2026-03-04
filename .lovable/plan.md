

## Plan: Naprawienie proporcji logo we wszystkich miejscach

### Problem
Logo złotej kropli nie jest kwadratowe — ma inne proporcje. Klasy `w-X h-X` wymuszają kwadratowy kontener, co powoduje zniekształcenie (zwężenie).

### Rozwiązanie
We wszystkich miejscach użycia logo dodać `object-contain` oraz ustawić tylko jedną oś (wysokość) lub użyć `aspect-auto`, aby zachować proporcje.

### Zmiany w plikach

**1. `src/pages/Auth.tsx` (linia 756)**
- Przed: `className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4"`
- Po: `className="h-16 sm:h-20 mx-auto mb-4 object-contain"` — tylko wysokość, szerokość automatyczna

**2. `src/components/admin/AdminSidebar.tsx` (linia ~231)**
- Przed: `className="w-8 h-8 flex-shrink-0"`
- Po: `className="h-8 flex-shrink-0 object-contain"` — usunięcie stałej szerokości

**3. `src/components/dashboard/DashboardSidebar.tsx` (linia ~657-660)**
- Już ma `object-contain` i `max-h-full max-w-full`, ale sprawdzę czy kontener nadrzędny (linia ~653) nie wymusza kwadratowego rozmiaru i jeśli tak — poprawię

**4. `src/components/dashboard/widgets/DashboardFooterSection.tsx` (linia 156)**
- Przed: `className="w-6 h-6 object-contain"`
- Po: `className="h-6 object-contain"` — usunięcie stałej szerokości

**5. `src/components/homepage/Footer.tsx` (linia 18)**
- Przed: `className="w-6 h-6"`
- Po: `className="h-6 object-contain"` — usunięcie stałej szerokości

### Zakres
5 plików, po 1 linii w każdym — zmiana klas CSS na obrazku logo.

