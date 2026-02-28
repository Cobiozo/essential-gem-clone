

## Problem: Webinar znika z kalendarza gdy mija end_time (nawet jesli trwa dalej)

### Przyczyna

Zapytania do bazy danych w dwoch hookach filtruja wydarzenia warunkiem:
```
end_time >= NOW()
```

Gdy minie `end_time` webinaru (np. 20:27 UTC), wydarzenie jest **calkowicie pomijane przez zapytanie SQL** — nawet jesli pokoj spotkania jest nadal aktywny (overtime). Kalendarz i strona webinarow nigdy nie otrzymuja tego wydarzenia, wiec nie moga go wyswietlic.

Dotyczy to:
- `src/hooks/useEvents.ts` (linia 42) — zrodlo danych dla CalendarWidget na dashboardzie
- `src/hooks/usePublicEvents.ts` (linia 26) — zrodlo danych dla strony /webinars

### Rozwiazanie

Rozszerzyc okno czasowe zapytania o 3 godziny wstecz. Zamiast filtra `end_time >= NOW()` uzyc `end_time >= NOW() - 3 hours`. Dzieki temu:
- Wydarzenia ktore trwaja dluzej niz zaplanowano (overtime) beda nadal widoczne
- UI (CalendarWidget) juz ma logike overtime detection z `useMeetingRoomStatus` — wystarczy ze otrzyma dane
- Po 3 godzinach od zakonczenia, wydarzenia znikna z widoku "nadchodzace" (co jest sensowne)

### Zmiany w plikach

**Plik 1: `src/hooks/useEvents.ts` (linia 34, 42)**

Zmienic obliczanie `now` aby uwzgledniac bufor 3h:
```
const now = new Date().toISOString();
const recentCutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
```

Zmienic filtr z:
```
.or(`end_time.gte.${now},occurrences.not.is.null`)
```
na:
```
.or(`end_time.gte.${recentCutoff},occurrences.not.is.null`)
```

**Plik 2: `src/hooks/usePublicEvents.ts` (linia 19, 26)**

Analogiczna zmiana:
```
const now = new Date().toISOString();
const recentCutoff = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
```

Filtr:
```
.or(`end_time.gte.${recentCutoff},occurrences.not.is.null`)
```

Zmienna `now` pozostaje do uzycia w logice `hasUpcomingSchedule` (linia 120) — tam nadal chcemy porownywac z aktualnym czasem.

### Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/hooks/useEvents.ts` | Bufor 3h w filtrze end_time |
| `src/hooks/usePublicEvents.ts` | Bufor 3h w filtrze end_time |

### Ryzyko

Minimalne. Jedyna roznica: zapytanie zwroci nieco wiecej wynikow (wydarzenia zakonczone w ciagu ostatnich 3h). UI juz ma logike do wyswietlania badge "Zakonczone" lub "Trwa dluzej" — wiec dodatkowe wydarzenia beda poprawnie prezentowane.

