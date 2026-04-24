## Diagnoza

Przycisk "Dowiedz się więcej…" dodałem wcześniej w `src/pages/EventGuestRegistration.tsx`, ale strona ze zrzutu ("Rejestracja na Business Oportunity Meeting") to **inny komponent** — `src/pages/EventFormPublicPage.tsx` (formularze rejestracyjne `/events/forms/...` oparte na tabeli `event_registration_forms`).

Dodatkowo zapytanie pobierające event w tym pliku NIE pobiera pola `slug`:

```ts
.select('*, paid_events!...(id, title, event_date, location, banner_url, is_online)')
```

Więc nawet po dodaniu przycisku trzeba najpierw udostępnić `slug` w danych.

## Plan naprawczy

W `src/pages/EventFormPublicPage.tsx`:

1. **Linia 50** — dopisać `slug` do listy wybieranych kolumn z `paid_events`:
   ```ts
   .select('*, paid_events!event_registration_forms_event_id_fkey(id, title, event_date, location, banner_url, is_online, slug)')
   ```

2. **Linia ~280** — pod przyciskiem submit dodać warunkowy outline button identyczny jak w `EventGuestRegistration`:
   ```tsx
   {event?.slug && (
     <Button
       type="button"
       variant="outline"
       className="w-full"
       onClick={() => window.open(`/events/${event.slug}`, '_blank', 'noopener,noreferrer')}
     >
       Dowiedz się więcej na temat wydarzenia
     </Button>
   )}
   ```

Otwiera publiczną stronę wydarzenia `/events/:slug` w nowej karcie (działa bez logowania), zachowując stan formularza rejestracji.

## Pliki do edycji

- `src/pages/EventFormPublicPage.tsx` — dodać `slug` do SELECT-a i przycisk pod submitem.