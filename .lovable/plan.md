

## Plan: Naprawić dopasowanie statystyk oglądania per rejestracja

### Problem
Widok "Rejestracje na wydarzenia" w popoverze kontaktu błędnie pokazuje dane oglądania z jednego slotu przy innym slocie tego samego wydarzenia. Przykład ze screenshota: rejestracja na slot 23:09 (który jeszcze się nie odbył) wyświetla "Dołączył 21:30 • Oglądał 36m 6s" — to dane z wcześniejszego slotu.

### Przyczyna
W fallbackowym dopasowaniu (krok 3 w `ContactEventInfoButton.tsx`), okno czasowe ±30 minut jest za szerokie, a logika nie sprawdza czy slot w ogóle już się odbył. Ponadto, gdy `slot_time` istnieje, widok z innego slotu tego samego eventu może być błędnie przypisany.

### Rozwiązanie
**Plik:** `src/components/team-contacts/ContactEventInfoButton.tsx`

Trzy zmiany w logice fallbackowego dopasowania (linie 125-157):

1. **Nie przypisuj widoków do przyszłych slotów** — jeśli `slot_time` jest w przyszłości (> now), pomiń rejestrację w fallbacku
2. **Wymagaj dopasowania slot_time** — gdy rejestracja ma `slot_time`, widok musi mieć `created_at` po `slot_time` (gość dołącza po rozpoczęciu, nie przed) i w oknie do +60 minut (czas trwania typowego webinaru)
3. **Zmień kierunek okna czasowego** — zamiast ±30 min, użyj okna: `view.created_at >= slot_time - 5min` AND `view.created_at <= slot_time + 90min` (gość może dołączyć kilka minut przed lub w trakcie)

Zmieniony fragment logiki:
```typescript
for (const reg of regsWithoutViews) {
  const regEventId = (reg as any).event_id;
  const regSlotTime = (reg as any).slot_time;
  if (!regEventId) continue;

  // Skip future slots — no view data possible
  if (regSlotTime && new Date(regSlotTime).getTime() > Date.now()) continue;

  const matchingView = emailViews.find(v => {
    if (usedViewIds.has(v.id)) return false;
    const viewEventId = videoToEventMap.get(v.video_id);
    if (viewEventId !== regEventId) return false;

    // When slot_time exists, require view to be within slot window
    if (regSlotTime && v.created_at) {
      const slotMs = new Date(regSlotTime).getTime();
      const viewMs = new Date(v.created_at).getTime();
      // View must be between 5 min before slot and 90 min after
      if (viewMs < slotMs - 5 * 60 * 1000 || viewMs > slotMs + 90 * 60 * 1000) return false;
    }

    return true;
  });
  // ... rest unchanged
}
```

### Efekt
- Przyszłe sloty (jak 23:09 w przykładzie) pokażą "Nie dołączył" zamiast fałszywych danych
- Każda rejestracja na różne sloty tego samego eventu będzie miała indywidualne dopasowanie widoku
- Widoki z wcześniejszych slotów nie będą przypisywane do późniejszych

### Pliki do modyfikacji
1. `src/components/team-contacts/ContactEventInfoButton.tsx` — poprawka logiki fallback matching

