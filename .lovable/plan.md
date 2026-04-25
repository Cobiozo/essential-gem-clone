## Problem

Na stronie wydarzenia płatnego (np. `/events/bom-krakow`) zalogowany użytkownik nie może kliknąć przycisku „Zapisz się” pod ceną biletu — przycisk jest wyłączony (`disabled`), nawet gdy są dostępne miejsca i bilet istnieje.

## Diagnoza

W komponencie `src/components/paid-events/public/PaidEventSidebar.tsx`:

```ts
const [selectedTicketId, setSelectedTicketId] = useState<string | null>(
  tickets.find(t => t.isFeatured)?.id || tickets[0]?.id || null
);
```

`useState` wykonuje inicjalizację **tylko raz** — przy pierwszym renderze. W tym momencie `PaidEventPage` przekazuje jeszcze pustą tablicę `tickets = []` (zanim `useQuery` zwróci dane), więc `selectedTicketId` zostaje ustawiony na `null`.

Kiedy `tickets` w końcu się załadują (1 element), stan `selectedTicketId` **nie jest aktualizowany**. W trybie pojedynczego biletu (linia 176–183) nie ma też żadnego przycisku selekcji, który mógłby ten stan zaktualizować ręcznie.

Skutek: w przycisku CTA na linii 205 warunek `disabled={!selectedTicketId || availableSpots === 0}` pozostaje `true`, mimo że bilet w UI jest pokazany.

## Rozwiązanie

W `PaidEventSidebar.tsx` dodać `useEffect`, który auto-wybiera bilet po załadowaniu/zmianie listy biletów, jeśli aktualny `selectedTicketId` nie istnieje w nowej liście:

```ts
useEffect(() => {
  if (tickets.length === 0) return;
  const exists = selectedTicketId && tickets.some(t => t.id === selectedTicketId);
  if (!exists) {
    const featured = tickets.find(t => t.isFeatured);
    setSelectedTicketId(featured?.id ?? tickets[0].id);
  }
}, [tickets, selectedTicketId]);
```

To rozwiąże również edge-case, gdy admin zmieni konfigurację biletów w trakcie życia komponentu.

## Pliki do zmiany

- `src/components/paid-events/public/PaidEventSidebar.tsx` — dodać `useEffect` synchronizujący `selectedTicketId` z listą `tickets`.

## Test po wdrożeniu

1. Otworzyć `/events/bom-krakow` jako zalogowany użytkownik.
2. Przycisk „Zapisz się” pod ceną 35,00 zł powinien być aktywny.
3. Kliknięcie otwiera drawer zakupu z wybranym biletem.
