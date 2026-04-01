

# Dodanie edycji testów Omega w historii

## Zmiana

Obok ikony kosza w historii transformacji dodać przycisk edycji (ołówek). Po kliknięciu — wpis rozwija się w formularz inline z wypełnionymi aktualnymi wartościami, umożliwiając ich poprawienie i zapisanie.

## Plan

### 1. Hook `useOmegaTests` — dodać mutację `updateTest`
Nowa mutacja `updateTest` przyjmuje `{ id: string } & OmegaTestInput`, wywołuje `supabase.from('omega_tests').update({...}).eq('id', id)`, invaliduje cache i pokazuje toast "Zaktualizowano wynik testu".

### 2. `OmegaTestHistory` — tryb edycji inline
- Dodać stan `editingId: string | null` i `editData: OmegaTestInput`
- Obok `Trash2` dodać przycisk z ikoną `Pencil` (lucide-react)
- Kliknięcie ustawia `editingId` na dany test i wypełnia `editData` wartościami z testu
- Gdy `editingId === test.id` — zamiast statycznego widoku renderować pola `Input` (date, ratio, index, AA, EPA, DHA, LA, notes) z przyciskami Zapisz/Anuluj
- Props: dodać `onEdit?: (id: string, data: OmegaTestInput) => void`

### 3. `OmegaTests.tsx` (strona) — podłączyć `updateTest`
Przekazać `onEdit={(id, data) => updateTest.mutate({ id, ...data })}` do `OmegaTestHistory`.

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useOmegaTests.ts` | Dodać mutację `updateTest` |
| `src/components/omega-tests/OmegaTestHistory.tsx` | Ikona edycji + inline formularz edycji |
| `src/pages/OmegaTests.tsx` | Przekazać `onEdit` prop |

