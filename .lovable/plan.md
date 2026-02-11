

# Naprawa bledu "Nie udalo sie wyslac baneru"

## Przyczyna
W metadanych alertu `sample_users` zawiera obiekty z kluczem `userId` (camelCase), np.:
```text
{"role":"admin", "userId":"818aef5e-...", "missingCount":2}
```
Kod na linii 220 szuka `u.user_id` lub `u.id`, ale nie `u.userId`, wiec zwraca caly obiekt zamiast samego UUID — baza danych odrzuca go jako nieprawidlowy UUID.

## Rozwiazanie

### Plik: `src/components/admin/SystemHealthAlertsPanel.tsx` (linia 220)

Dodanie `u.userId` do lancucha fallbackow:

```text
Przed:  u.user_id || u.id || u
Po:     u.user_id || u.userId || u.id || u
```

Jedna linia do zmiany — zadnych innych modyfikacji.

