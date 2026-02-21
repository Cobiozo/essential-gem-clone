
# Naprawa: fallback dla postępu szkoleń w widgecie dashboardu

## Problem

Gdy certyfikat `issued_at` jest wcześniejszy niż `created_at` lekcji (np. certyfikat o 01:31, lekcje o 15:08 tego samego dnia), filtr `created_at <= certDate` zwraca 0 lekcji, co daje 0/0 = 0% zamiast 100%.

## Zmiana

Plik: `src/components/dashboard/widgets/TrainingProgressWidget.tsx` (linie 110-129)

Dodać fallback w dwóch miejscach — identyczny jak już istniejący w `Training.tsx`:

1. **totalLessons** (linie 112-115): jeśli filtr po dacie certyfikatu zwraca 0 ale lekcje istnieją, użyć pełnej listy lekcji
2. **completedInModule** (linie 119-124): jeśli filtr po dacie certyfikatu zwraca 0 ale istnieją ukończone lekcje w module, użyć pełnej liczby ukończonych

```text
// totalLessons z fallbackiem:
if (certIssuedAt) {
  const certDate = new Date(certIssuedAt);
  const filtered = lessons.filter(l => new Date(l.created_at) <= certDate).length;
  totalLessons = filtered > 0 ? filtered : lessons.length;  // fallback
}

// completedInModule z fallbackiem:
if (certIssuedAt) {
  const certDate = new Date(certIssuedAt);
  const filtered = progressRes.filter(module match AND created_at <= certDate).length;
  completedInModule = filtered > 0 ? filtered : progressRes.filter(module match).length;  // fallback
}
```

Żadne inne pliki nie wymagają zmian — `Training.tsx` już ma ten fallback.
