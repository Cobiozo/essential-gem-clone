## Problemy

1. **Zgłoszenia (CMS → Eventy → Formularze → Zgłoszenia)** nie rozróżniają gości od partnerów — wszystko w jednej liście.
2. **CalendarWidget (pulpit) → EVENT → Szczegóły / Zapisz się** prowadzi na błędny URL `/e/:slug` (resolver dla darmowych eventów z tabeli `events`), a strona paid eventu jest pod `/events/:slug` (tabela `paid_events`). Stąd komunikat „Nie znaleziono wydarzenia."

## Rozwiązanie — dwie krótkie, izolowane zmiany

### 1. `src/components/dashboard/widgets/CalendarWidget.tsx` — poprawny URL

Tylko jedna linia logiki w gałęzi `paid_event`:

```tsx
const slug = (event as any)._event_slug as string | undefined;
const eqRef = profile?.eq_id ? `?ref=${profile.eq_id}` : '';
const eventUrl = slug ? `/events/${slug}${eqRef}` : '#';
```

- `/events/:slug` to istniejący routing `PaidEventPage` (App.tsx linia 418).
- Dołączamy `?ref=EQID`, jeśli zalogowany user ma `eq_id` — zachowuje to dotychczasowy mechanizm partnerski (ten sam wzorzec używany w `handleCopyInvitation`).
- Brak innych zmian w pliku — przyciski Szczegóły / Zapisz się oraz reszta widżetu pozostają bez zmian.

### 2. `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx` — podzakładki Goście / Partnerzy

W tabeli `event_form_submissions` nie ma kolumny `user_id` zgłaszającego — partnerzy są identyfikowani po dopasowaniu `email` zgłoszenia do `profiles.email`. Dodaję dodatkowe zapytanie:

```ts
const submissionEmails = Array.from(new Set(
  submissions.map(s => (s.email || '').toLowerCase()).filter(Boolean)
));
const { data: registeredEmails = new Set<string>() } = useQuery({
  queryKey: ['event-form-submission-registered-emails', form.id, submissionEmails.sort().join(',')],
  enabled: submissionEmails.length > 0,
  queryFn: async () => {
    const { data } = await supabase
      .from('profiles')
      .select('email')
      .in('email', submissionEmails);
    return new Set((data || []).map((p: any) => (p.email || '').toLowerCase()));
  },
});
```

Klasyfikacja:
- **Partner (zalogowany)** = `registeredEmails.has(s.email.toLowerCase())`
- **Gość (niezalogowany)** = pozostałe

UI — nad istniejącym wierszem filtra/wyszukiwarki dodaję komponent `Tabs` (shadcn) z trzema zakładkami:
- **Wszystkie** (`audience: 'all'`)
- **Goście** (`audience: 'guests'`) — z licznikiem
- **Partnerzy** (`audience: 'partners'`) — z licznikiem

Stan: `const [audience, setAudience] = useState<'all'|'guests'|'partners'>('all');`

W istniejącym `filtered` dodaję jeden warunek:
```ts
if (audience !== 'all') {
  const isPartner = registeredEmails.has((s.email || '').toLowerCase());
  if (audience === 'partners' && !isPartner) return false;
  if (audience === 'guests' && isPartner) return false;
}
```

Dodatkowo w kolumnie „Osoba" dodaję mały badge (`Gość` / `Partner`) — wizualnie potwierdza klasyfikację bez zmiany struktury tabeli.

Eksport Excel automatycznie respektuje `filtered`, więc eksport per-zakładka działa od razu.

## Bezpieczeństwo i regresja

- **Brak zmian w bazie i RLS.** Zapytanie do `profiles.email` dla emaili z aktywnego formularza jest dozwolone (kolumna jest selectowana w wielu miejscach administracyjnych — RLS dla adminów już to przepuszcza).
- **Brak zmian w edge functions.**
- Przyciski w CalendarWidget dla pozostałych typów wydarzeń (webinary, spotkania zespołu, trójstronne, konsultacje) **nie są dotykane** — zmiana dotyczy wyłącznie wcześniejszego `return` dla `paid_event`.
- Domyślna zakładka w EventFormSubmissions to **Wszystkie**, więc dotychczasowy widok administratora pozostaje identyczny przy pierwszym wejściu.

## Pliki do zmiany

- `src/components/dashboard/widgets/CalendarWidget.tsx` (jedna gałąź — URL)
- `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx` (Tabs + dodatkowy filtr + badge w kolumnie Osoba)