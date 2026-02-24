

## Naprawa przekierowania i ujednolicenie formularza resetu hasla

### Diagnoza
Strona `/change-password` istnieje i dziala poprawnie w podgladzie (preview), ale na opublikowanej wersji (`purelife.lovable.app`) nie jest jeszcze wdrozona -- stad blad "strona nie znaleziona". Nalezy opublikowac aplikacje.

Dodatkowo, `ProfileCompletionGuard` nie ma `/change-password` ani `/reset-password` na liscie tras publicznych (`PUBLIC_PATHS`) ani `KNOWN_APP_ROUTES`. Trasy te dzialaja przypadkowo, bo sa traktowane jako "partner page". Nalezy to naprawic, zeby byly jawnie publiczne.

### Plan zmian

#### 1. Dodanie `/change-password` i `/reset-password` do PublicPaths w `ProfileCompletionGuard`

Plik: `src/components/profile/ProfileCompletionGuard.tsx`

Dodanie do tablicy `PUBLIC_PATHS`:
```text
'/change-password',
'/reset-password',
```

Dodanie do tablicy `KNOWN_APP_ROUTES`:
```text
'/change-password',
'/reset-password',
```

To zapewnia, ze te strony sa jawnie publiczne i nie beda blokowane przez guard ani blednie traktowane jako strony partnerskie.

#### 2. Publikacja aplikacji

Po wdrozeniu zmian nalezy opublikowac aplikacje, zeby zmiany pojawily sie na `purelife.lovable.app`.

### Podsumowanie

Formularz na `/change-password` juz istnieje i dziala prawidlowo (email, haslo tymczasowe, nowe haslo, powtorz haslo). Link w emailu (`{{login_url}}`) wskazuje na `https://purelife.lovable.app/change-password`. Jedyny problem to brak publikacji + brak jawnego oznaczenia tras jako publicznych w ProfileCompletionGuard.

