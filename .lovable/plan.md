

## Pozwolenie na spotkania back-to-back (np. 20:00-21:00, potem 21:00-22:00)

### Problem

Walidacja konfliktow czasowych w formularzach wydarzen uzywa operatorow `lte` (<=) i `gte` (>=), co oznacza, ze dwa spotkania stykajace sie w czasie (np. koniec o 21:00, start o 21:00) sa traktowane jako konflikt. Uzytkownik musi wpisywac 21:01 zamiast 21:00.

### Rozwiazanie

Zmienic operatory porownania z "mniejsze-lub-rowne / wieksze-lub-rowne" na "scisle mniejsze / scisle wieksze", co pozwoli na spotkania back-to-back.

### Zmiany w plikach

#### 1. `src/components/admin/WebinarForm.tsx` (linia ~205-206)

Zmiana:
```
.lte('start_time', form.end_time)
.gte('end_time', form.start_time)
```
Na:
```
.lt('start_time', form.end_time)
.gt('end_time', form.start_time)
```

#### 2. `src/components/admin/TeamTrainingForm.tsx` (linia ~205-206)

Analogiczna zmiana:
```
.lte('start_time', endTime)
.gte('end_time', startTime)
```
Na:
```
.lt('start_time', endTime)
.gt('end_time', startTime)
```

### Zakres

- 2 pliki, po 2 linie w kazdym
- Brak zmian w bazie danych
- Logika: spotkanie konczace sie o 21:00 nie koliduje ze spotkaniem zaczynajacym sie o 21:00

