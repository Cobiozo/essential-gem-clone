

# Usunięcie roli Specjalista + zmiana etykiety Opiekun

## Zmiany

### 1. `src/pages/Auth.tsx`
- **Linia 508**: usunąć `'specjalista': 'specjalista'` z `roleMapping`
- **Linie 968-970**: usunąć `<SelectItem value="specjalista">...</SelectItem>`

### 2. `src/components/auth/GuardianSearchInput.tsx`
- **Linia 92**: zmienić etykietę z:
  `Opiekun (osoba wprowadzająca Partner/Specjalista Zespołu Pure Life) *`
  na:
  `Opiekun (osoba wprowadzająca do Pure Life Center) *`

