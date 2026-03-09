

# Fix: Przeszłe sloty przekreślone i nieklikalne, LIVE po 2 min nieklikalne

## Zmiany w `src/components/auto-webinar/AutoWebinarEventView.tsx`

1. **Past sloty**: `disabled`, przekreślone (`line-through`), `cursor-not-allowed`, wyszarzone
2. **LIVE slot (now)**: Widoczny z pulsującą kropką i "LIVE", ale `disabled` — nie można go wybrać ani skopiować zaproszenia
3. **Future sloty**: Bez zmian — klikalne normalnie
4. **Deselect**: Jeśli wybrany slot stanie się past/now, wyczyść `selectedSlot`

Konkretnie:
- Dodać `disabled={isPast || isNow}` do `<button>`
- Past: `line-through text-muted-foreground/50 cursor-not-allowed`
- Now: zachować obecny styl LIVE ale dodać `cursor-not-allowed` i `disabled`
- Klik `onClick` tylko gdy `!isPast && !isNow`

