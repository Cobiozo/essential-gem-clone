

# Fix: Ankieta nie działa po kliknięciu CTA

## Diagnoza

Dwa problemy:

1. **Ankieta prawdopodobnie nie została zapisana do szablonu** — dopóki nie klikniesz "Zapisz" w zakładce Ankieta, sekcja nie istnieje w `template_data`, więc na stronie partnera nie ma elementu z `id="Ankieta"` i przycisk CTA nie ma do czego przewinąć.

2. **Case-sensitivity** — `getElementById` rozróżnia wielkość liter. Jeśli anchor to `Ankieta` (wielka A), CTA musi mieć dokładnie `#Ankieta`. Podpowiedź w edytorze mówi `#ankieta` (małe), co jest mylące.

## Zmiany

### 1. Auto-lowercase anchor_id (`SurveySectionEditor.tsx`)
Wymusić małe litery w polu Anchor ID, aby uniknąć problemów z wielkością liter. Zmienić `onChange` na `e.target.value.toLowerCase()`.

### 2. Case-insensitive scroll w CTA (`CtaBannerSection.tsx`)
Dodać fallback: jeśli `getElementById` nie znajdzie elementu, szukać case-insensitive za pomocą `querySelector('[id]')` z porównaniem.

### 3. Auto-lowercase anchor_id w `SectionConfigEditor.tsx`
Analogicznie jak w survey — inne sekcje też mają pole anchor_id. Wymusić małe litery.

### 4. Case-insensitive scroll w `HeaderSection.tsx`
Ten sam fallback co w CTA — nagłówek też ma linki nawigacyjne z hash.

## Szczegóły techniczne

| Plik | Zmiana |
|------|--------|
| `SurveySectionEditor.tsx` | `onChange` → `e.target.value.toLowerCase().replace(/\s+/g, '-')` |
| `SectionConfigEditor.tsx` | Analogicznie — lowercase anchor_id |
| `CtaBannerSection.tsx` | Fallback: `document.querySelector(\`[id="${anchor}" i]\`)` nie działa, więc: `Array.from(document.querySelectorAll('[id]')).find(el => el.id.toLowerCase() === anchor.toLowerCase())` |
| `HeaderSection.tsx` | Ten sam case-insensitive fallback |

## Efekt
- Anchor ID zawsze lowercase — brak pomyłek z wielkością liter
- Nawet jeśli ktoś ręcznie wpisze duże litery, scroll i tak zadziała
- Użytkownik musi kliknąć "Zapisz" w zakładce Ankieta — komunikat o tym już istnieje

