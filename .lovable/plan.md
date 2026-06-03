# Mobilna karta wydarzenia — uporządkowanie układu

Na zrzucie widać kartę wydarzenia (`PaidEventCard` + `MyEventTicketsInline` + `MyEventFormLinks`) na telefonie. Elementy są rozsypane: data, banner, tytuł, badge cena, przyciski, lista biletów i panel linku partnerskiego źle się wiążą, „Otwórz bilet (QR)" wypada poniżej ceny, przycisk „Zobacz" jest oddzielony od treści, a link partnerski ma 3 odrębne kolumny (ikona / treść / data), które na wąskim ekranie się rozjeżdżają.

Zmiany dotyczą tylko warstwy prezentacyjnej (Tailwind, kolejność elementów) — żadnej logiki biznesowej, zapytań, RLS ani danych nie ruszam.

## Zakres zmian

### 1) `PaidEventCard.tsx` — nagłówek karty
- Na mobile (`<sm`): zmieniam layout z `flex-col sm:flex-row` na bardziej zwarty układ:
  - górny rząd: kafelek daty (16×16) + tytuł + cena „od 20 zł" w jednej linii treści (badge ceny obok tytułu lub nad nim, nie wypchnięty na bok)
  - banner staje się pełnoszerokim obrazem nad treścią (`aspect-video rounded-lg`), bez dziwnego `h-24` obok daty
  - badge „NADCHODZI / ZAKOŃCZONE" w jednym rzędzie z ceną
  - meta-info (data, lokalizacja, miejsca) jako pionowa lista ikon na mobile zamiast `flex-wrap`, dzięki czemu nic się nie urywa
- Przycisk „Zobacz →" na mobile: pełna szerokość pod treścią (`w-full sm:w-auto`), wyraźny CTA; na desktop bez zmian (po prawej, jak teraz)
- Stała kolejność: banner → badge + tytuł → opis → meta → CTA „Zobacz"

### 2) `MyEventTicketsInline.tsx` — sekcja „Twoje bilety"
- Pasek „Jesteś zarejestrowany / Opłacone": na mobile badge `Opłacone` przenoszony pod tekst (`flex-col sm:flex-row`), żeby tekst nie był ściśnięty
- Nagłówek „TWOJE BILETY NA TO WYDARZENIE" + badge „1 BILET" — na mobile `flex-wrap` zostaje, ale zmniejszam padding i `gap`
- Wiersz biletu (`Bilet Wejściowy · 1×bilet · 1 · 20,00 zł · Opłacone · QR`):
  - Na mobile dzielę na 2 rzędy:
    1. nazwa biletu + badge ilości + ikona osób + cena + status
    2. przycisk „Otwórz bilet (QR)" jako **pełnoszerokie CTA** pod wierszem (`w-full sm:w-auto sm:ml-auto`), żeby nie zachodził na cenę
- Lista uczestników: `flex-col` z mniejszym fontem, ikona „Ty" badge bez zmian

### 3) `MyEventFormLinks.tsx` — link partnerski (compact)
- Header karty (`<FileText/> Rejestracja n... · 0 kliknięć · 1 zapisanych`): na mobile badge'y kliknięć/zapisanych przenoszę pod tytuł (`flex-col sm:flex-row`), żeby tytuł formularza nie był ucinany „Rejestracja n..."
- Meta-info eventu (tytuł + data + lokalizacja): zamiast jednego rzędu z `·` separatorami stosuję `flex flex-wrap gap-x-2` z mniejszym fontem; obecny dziwny układ „3 kolumn" (data po prawej w tabeli) wynika z `flex` + długiego tytułu — naprawione przez `min-w-0 truncate` na meta items
- Input z URL + kopiuj: zostaje `flex`, ale input dostaje `text-[11px]` na mobile, żeby cały URL był czytelny (zamiast `https://purelife.info.pl/event-form/rej` ucinanego)
- Przycisk „Pokaż zapisanych przez mój link (1)": bez zmian funkcjonalnych, tylko `text-xs` i lewa padding-fix

### 4) Drobne, globalne fixy mobile w tej karcie
- Wszystkie wewnętrzne paneli (`.rounded-md border bg-primary/5 p-3`): na mobile `p-2.5` zamiast `p-3`, żeby zwolnić miejsce
- `text-xs` w `MyEventTicketsInline` zostaje na mobile, ale linie z dużą liczbą badge'y dostają `gap-1.5` zamiast `gap-2`, żeby nie było rozjeżdżania
- Wszystkie `flex items-center justify-between gap-2` z długim tekstem dostają `flex-wrap` lub mobilny break

## Czego NIE zmieniam
- Logiki RPC, query keys, RLS, treści tekstów (poza ewentualnym `truncate`)
- Wyglądu desktop — wszystkie zmiany w klasach mobilnych mają warianty `sm:` przywracające obecny układ
- Komponentów innych niż te 3 pliki

## Pliki edytowane
- `src/components/paid-events/PaidEventCard.tsx`
- `src/components/paid-events/MyEventTicketsInline.tsx`
- `src/components/paid-events/MyEventFormLinks.tsx`

## Walidacja
Po implementacji sprawdzę kartę w preview 390×844 (iPhone), żeby potwierdzić: brak rozjazdów, czytelne CTA, QR-przycisk pod wierszem biletu, link partnerski bez ucinania URL/tytułu.
