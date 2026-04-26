## Cel
Na liście wydarzeń (`/paid-events`), w karcie wydarzenia (np. „BUSINESS OPPORTUNITY MEETEING – KRAKÓW"), przed kafelkiem z datą (10 MAJ) ma być wyświetlana miniaturka ustawionego dla wydarzenia banera (`banner_url`).

## Zakres zmian

**Plik:** `src/components/paid-events/PaidEventCard.tsx`

Dodać nowy element przed istniejącym kwadratem z datą:
- Miniaturka banera wczytywana z pola `event.banner_url` (już dostępne w propsach – nie trzeba zmieniać query w `PaidEventsListPage.tsx`).
- Rozmiar dopasowany do wysokości karty (np. `w-28 h-16` na mobile, `sm:w-40 sm:h-20` na większych ekranach), zaokrąglone rogi (`rounded-lg`), `object-cover` aby zachować proporcje.
- Fallback: gdy `banner_url` jest puste, miniaturka się nie pojawia (kafelek z datą zostaje jak teraz, układ bez zmian).
- `loading="lazy"` + `alt={event.title}` dla dostępności i wydajności.

Układ docelowy karty (od lewej do prawej):
```
[ MINIATURKA BANERA ] [ KAFELEK Z DATĄ ] [ TYTUŁ + OPIS + INFO ] [ PRZYCISK „Zobacz" ]
```

Bez zmian w danych, zapytaniach, typach ani innych komponentach. Stosuje się też do sekcji „Zakończone wydarzenia" (ten sam komponent karty).
