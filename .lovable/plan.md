

# Poprawka podglądu auto-webinaru — identyczny widok jak dla gościa

## Problem

Podgląd admina (`previewMode`) ukrywa elementy widoczne dla gościa:
1. **Header z logotypami**, tytułem, liczbą uczestników i badge "NA ŻYWO" — ukryty przez `!previewMode` (linia 381)
2. **Sekcja custom** (dolny przypis) — ukryta przez `!previewMode` (linia 688)
3. **Dźwięk** — wymuszony `muted=true` bez możliwości odblokowania (linia 249-258), bo overlay "Włącz dźwięk" nie pojawia się (needsUserInteraction nie jest ustawiane)

## Rozwiązanie

### Zmiany w `src/components/auto-webinar/AutoWebinarEmbed.tsx`:

1. **Pokazać header w trybie podglądu** — usunąć warunek `!previewMode` z bloku headera (linia 381). Header z logotypami, tytułem, uczestnikami i badge "NA ŻYWO" będzie widoczny również w podglądzie.

2. **Pokazać sekcję custom** — usunąć warunek `!previewMode` z bloku custom section (linia 688).

3. **Naprawić dźwięk w podglądzie** — zmienić logikę w `handleCanPlay` tak, aby w `previewMode` wideo startowało muted, ale ustawiało `needsUserInteraction = true`, co pokaże overlay "Włącz dźwięk". Admin kliknie i odblokuje dźwięk, dokładnie jak gość.

### Plik do edycji
| Plik | Zmiana |
|------|--------|
| `src/components/auto-webinar/AutoWebinarEmbed.tsx` | Usunięcie `!previewMode` z headera i custom section; zmiana logiki dźwięku w preview |

