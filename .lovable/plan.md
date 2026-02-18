

# Usuniecie trybu Immersja z menu widokow

## Zakres zmian

Usuniecie opcji "Immersja" z menu wyboru widoku spotkania wideo. Trzy pliki do zmiany:

### 1. `src/components/meeting/VideoGrid.tsx`

- Usuniecie `'immersive'` z typu `ViewMode` (linia 4)
- Usuniecie calego bloku kodu obslugi trybu immersive (linie 447-465)

### 2. `src/components/meeting/MeetingControls.tsx`

- Usuniecie wpisu `{ mode: 'immersive', label: 'Immersja', icon: ... }` z tablicy `VIEW_MODES` (linia 69)
- Usuniecie importu `Maximize` z lucide-react (linia 2)

### 3. `src/components/meeting/VideoRoom.tsx`

- Brak zmian - domyslny tryb to `'speaker'`, wiec usunie Immersji nie wymaga tu zmian

