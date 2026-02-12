

# Udostepnienie stron partnerskich dla niezalogowanych uzytkownikow

## Problem
Strona partnerska (np. `/sebastian-snopek`) jest dostepna pod trasa `/:alias`, ktora przechodzi przez `ProfileCompletionGuard`. Ten komponent przekierowuje niezalogowanych uzytkownikow na `/auth`, co blokuje dostep do stron partnerskich dla osob bez konta.

## Przyczyna
W pliku `src/components/profile/ProfileCompletionGuard.tsx` (linia 28-35) zdefiniowana jest lista `PUBLIC_PATHS` -- tras dostepnych bez logowania. Trasa `/:alias` (strony partnerskie) nie jest na tej liscie.

## Rozwiazanie

### Plik: `src/components/profile/ProfileCompletionGuard.tsx`

Dodanie logiki rozpoznajacej strony partnerskie jako publiczne. Poniewaz `/:alias` to dynamiczna trasa na poziomie roota (np. `/sebastian-snopek`), nie mozna jej dodac jako prosty prefix. Zamiast tego:

1. Pobranie aktualnego `pathname` i sprawdzenie, czy pasuje do wzorca strony partnerskiej -- czyli jest to sciezka z jednym segmentem (np. `/sebastian-snopek`), ktora nie jest zadna z juz znanych tras (np. `/auth`, `/dashboard`, `/admin`, `/training`, `/knowledge`, `/messages` itd.)
2. Dodanie listy znanych tras aplikacji (statycznych prefiksow) i traktowanie kazdej nieznanej jednosegmentowej sciezki jako potencjalnej strony partnerskiej -- przepuszczenie jej bez logowania.

Alternatywnie, prostsze podejscie: komponent `PartnerPage.tsx` sam pobiera dane z bazy -- jesli alias nie istnieje, pokazuje `NotFound`. Wystarczy wiec dodac do `ProfileCompletionGuard` warunek, ze jednosegmentowe sciezki (bez ukosnika na koncu, np. `/cokolwiek` ale nie `/cos/dalszego`) sa traktowane jako publiczne.

### Konkretna zmiana

W liscie `PUBLIC_PATHS` lub w logice `isPublicPath` dodac warunek:

```
const KNOWN_APP_ROUTES = [
  '/auth', '/admin', '/dashboard', '/my-account', '/training', 
  '/knowledge', '/messages', '/calculator', '/paid-events', 
  '/events', '/install', '/page', '/html', '/infolink', '/zdrowa-wiedza'
];

const isSingleSegmentPath = location.pathname.match(/^\/[^/]+$/);
const isKnownRoute = KNOWN_APP_ROUTES.some(r => 
  location.pathname === r || location.pathname.startsWith(r + '/')
);
const isPartnerPage = isSingleSegmentPath && !isKnownRoute;
```

Nastepnie w warunku `isPublicPath` uwzglednic rowniez `isPartnerPage`:

```
if (isPublicPath || isPartnerPage) {
  return <>{children}</>;
}
```

### Efekt
- Niezalogowani uzytkownicy moga wejsc na `/sebastian-snopek` (lub dowolna strone partnerska) bez przekierowania na logowanie
- Strona partnerska dziala jak samodzielna strona ladowania -- uzytkownik moze jedynie klikac linki umieszczone na niej przez partnera
- Jesli alias nie istnieje, `PartnerPage.tsx` sam pokaze strone 404
- Zadne inne trasy aplikacji nie zostaja naruszone

### Brak zmian w bazie danych
Zmiana dotyczy wylacznie logiki routingu po stronie frontendu.

