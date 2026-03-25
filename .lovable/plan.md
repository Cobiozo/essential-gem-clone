

# Naprawa: podgląd pokazuje "10:00–23:00" zamiast godzin slotów

## Problem
Dwie rzeczy:
1. **Ekran "Poza godzinami emisji"** (linia 370 w AutoWebinarEmbed.tsx) wyświetla `config.start_hour:00 – config.end_hour:00` — stare pola. Gdy admin używa `slot_hours`, powinien pokazać listę aktywnych slotów lub zakres.
2. **Zapis działa poprawnie** — `handleUpdateConfig` zapisuje `slot_hours` do bazy. Problem jest tylko w warstwie prezentacji offline info.

## Zmiany

### 1. `src/components/auto-webinar/AutoWebinarEmbed.tsx` (linia 368-372)

Zmienić tekst "Poza godzinami emisji" aby uwzględniał `slot_hours`:

```tsx
// Zamiast:
Transmisja aktywna w godzinach {config?.start_hour}:00 – {config?.end_hour}:00.

// Nowa logika:
const slotHours = config?.slot_hours || [];
if (slotHours.length > 0) {
  // Pokaż np. "Następne emisje: 01:00, 14:00, 17:00"
  "Godziny emisji: {slotHours.sort().join(', ')}"
} else {
  // Legacy fallback
  "Transmisja aktywna w godzinach {start_hour}:00 – {end_hour}:00."
}
```

To jedyna zmiana — zapis do bazy działa prawidłowo, problem jest wyłącznie w tekście wyświetlanym na ekranie offline/podglądu.

