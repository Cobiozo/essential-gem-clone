## Kontekst

Funkcja `supabase/functions/process-event-email-campaigns/index.ts` generuje maile-zaproszenia na wydarzenia (m.in. Pure Mindset). W linii 9:

```ts
const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "https://purelife.lovable.app";
```

Zmienna `APP_ORIGIN` nie jest ustawiona na produkcji, więc przycisk „Zapisz się" prowadził na `purelife.lovable.app` zamiast na `purelifecenter.pl`.

## Czy można cofnąć już wysłane maile?

Nie. E-maile SMTP dostarczone do skrzynek odbiorców nie da się „odwołać" ani zdalnie zmienić ich treści — są to statyczne wiadomości w skrzynkach użytkowników. Można jedynie wysłać wiadomość korygującą (opcjonalnie, do ustalenia poza tym planem).

## Co zmienię

Edycja tylko `supabase/functions/process-event-email-campaigns/index.ts`:

1. Zmiana domyślnej domeny na produkcyjną:
   ```ts
   const APP_ORIGIN = Deno.env.get("APP_ORIGIN") || "https://purelifecenter.pl";
   ```
   Trasy `/events/team-meetings`, `/events/webinars` i `/dashboard` już same przekierowują niezalogowanych na `/auth?n=<target>`, a `Auth.tsx` po logowaniu wraca na docelową ścieżkę — więc jeden URL obsłuży oba scenariusze (zalogowany → panel z paskiem bocznym wydarzenia; niezalogowany → logowanie i po nim powrót).

2. Nowa treść sekcji CTA w `buildEmailHtml` — zamiast samego przycisku dodam akapit informacyjny nad przyciskiem:

   > Aby zapisać się na wydarzenie, przejdź na platformę **purelifecenter.pl** i zapisz się w panelu wydarzeń (pasek boczny: „Spotkania zespołu" / „Webinary"). Jeżeli nie jesteś zalogowany, po kliknięciu przycisku otworzy się strona logowania — po zalogowaniu wrócisz automatycznie do miejsca zapisu.

3. Przycisk „Zapisz się" oraz link „Zobacz szczegóły wydarzenia" pozostają, ale kierują do `https://purelifecenter.pl/events/team-meetings?event=<id>&utm=email_invite` (lub `/events/webinars` — zależnie od `event_type`, tak jak już działa `routeForEventType`).

4. Deploy funkcji `process-event-email-campaigns` po zmianach.

## Poza zakresem

- Zmiana treści już wysłanych maili (technicznie niewykonalne).
- Zmiany w innych funkcjach mailowych — one już używają `purelifecenter.pl` lub własnych ustawień; ten problem dotyczy tylko kampanii zaproszeniowych.
