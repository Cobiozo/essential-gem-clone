

# Plan: Kopiowanie sekcji między szablonami

## Opis
Dodanie możliwości skopiowania sekcji z jednego szablonu i wklejenia jej do innego. Dwa podejścia do wyboru:

### Podejście A — Schowek sekcji (clipboard)
- W pasku narzędzi każdej sekcji (obok „duplikuj" i „usuń") dodać przycisk **„Kopiuj do schowka"** (ikona `ClipboardCopy`).
- Kliknięcie zapisuje JSON sekcji do `localStorage` (klucz np. `copied_section`).
- W `AddSectionMenu` (menu dodawania sekcji) dodać opcję **„Wklej skopiowaną sekcję"** — widoczną tylko gdy w localStorage jest zapisana sekcja.
- Wklejenie tworzy nową sekcję z nowym `id` (UUID) i wstawia ją w wybranym miejscu.
- Działa między szablonami, bo admin może otworzyć jeden szablon, skopiować sekcję, wrócić, otworzyć drugi szablon i wkleić.

### Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `SortableSectionWrapper.tsx` | Dodać przycisk „Kopiuj" obok duplikuj/usuń |
| `AddSectionMenu.tsx` | Dodać opcję „Wklej skopiowaną sekcję" gdy jest coś w schowku |
| `TemplatePreviewPage.tsx` | Handler `handleCopySection` (zapis do localStorage) i `handlePasteSection` (odczyt + wstawienie) |

### Logika

```text
Kopiowanie:
  localStorage.setItem('copied_section', JSON.stringify(section))
  toast("Sekcja skopiowana")

Wklejanie:
  const raw = localStorage.getItem('copied_section')
  if (!raw) return
  const section = JSON.parse(raw)
  section.id = crypto.randomUUID()  // nowe ID
  wstaw w wybranej pozycji
```

### UX
- Przycisk „Kopiuj" z tooltipem w toolbar sekcji
- W menu dodawania sekcji: dodatkowa pozycja „Wklej skopiowaną sekcję" (z ikoną `ClipboardPaste`), wyszarzona gdy schowek pusty
- Toast po skopiowaniu i po wklejeniu

