
# Zmiana pól daty na datetime-local w dialogu edycji

## Problem
Pola "Data od" i "Data do" w dialogu edycji używają `type="date"`, a powinny używać `type="datetime-local"` (tak jak w dialogu dodawania), aby można było ustawić też godzinę.

## Rozwiązanie

### Plik: `src/components/admin/NewsTickerManagement.tsx` (linie 1297-1308)

Zmienić `type="date"` na `type="datetime-local"` w obu polach Input (start_date i end_date).
