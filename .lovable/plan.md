## Problem

Po kliknięciu „Zarejestruj mnie i wyślij dane do przelewu" pojawia się toast „Błąd rejestracji – Edge Function returned a non-2xx status code", mimo że zamówienie faktycznie zostało utworzone w bazie (`paid_event_orders.status = 'awaiting_transfer'`).

## Diagnoza

Edge Function `register-event-transfer-order` wykonuje synchronicznie po insercie zamówienia trzy ciężkie operacje przed zwróceniem odpowiedzi:

1. **Pobranie ustawień SMTP + wysyłka maila** przez własnego klienta TCP/TLS (`Deno.connectTls` / `Deno.startTls`) — z timeoutami 15 s na samo połączenie.
2. Wstawienie powiadomień dla wszystkich adminów + partnera.
3. Upsert kontaktu w CRM partnera.

Bezpośredni test funkcji (`supabase--curl_edge_functions`) zawiesił się — funkcja nie zwróciła odpowiedzi w czasie, **mimo że order w bazie został utworzony** (potwierdzone w `paid_event_orders`). Klient otrzymuje 5xx (timeout edge function gateway), choć logicznie operacja się powiodła. Dla zalogowanego użytkownika oznacza to mylący komunikat o błędzie i prawdopodobne podwójne rezerwacje przy powtórnych klikach.

Powodem zwisania jest najpewniej blokujące się połączenie SMTP (TLS handshake / odpowiedź serwera) — handler nie wraca aż SMTP zakończy.

## Rozwiązanie

Po udanym `INSERT` do `paid_event_orders` natychmiast zwrócić `200 { success: true, orderId, ticketCode }`, a wszystkie efekty uboczne (wysyłka maila, powiadomienia, CRM) wykonać w tle przez `EdgeRuntime.waitUntil(...)`. To standardowy pattern w Supabase Edge Functions:

```ts
const sideEffects = (async () => {
  // try { ... SMTP ... } catch { console.error }
  // try { ... user_notifications ... } catch { ... }
  // try { ... team_contacts upsert ... } catch { ... }
})();

try {
  // @ts-ignore EdgeRuntime is provided by Supabase runtime
  EdgeRuntime.waitUntil(sideEffects);
} catch {
  sideEffects.catch((e) => console.error("side-effects error", e));
}

return new Response(JSON.stringify({ success: true, orderId: order.id, ticketCode }), {
  status: 200,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
```

Dzięki temu:
- użytkownik dostaje natychmiastową odpowiedź sukcesu po samym zarezerwowaniu rekordu,
- powolny/awaryjny SMTP nie powoduje już 5xx,
- powiadomienia i CRM nadal są dostarczane (worker żyje aż do ich zakończenia).

## Plik do zmiany

- `supabase/functions/register-event-transfer-order/index.ts` — przeniesienie SMTP + notifications + CRM do bloku tła wywołanego przez `EdgeRuntime.waitUntil`, response `200` zaraz po insercie zamówienia.

## Test po wdrożeniu

1. Otworzyć `/events/bom-krakow` jako zalogowany użytkownik, wypełnić drawer „Kup bilet" i kliknąć „Zarejestruj mnie i wyślij dane do przelewu".
2. Powinien pojawić się toast sukcesu (a nie „Błąd rejestracji").
3. W tabeli `paid_event_orders` rekord ze statusem `awaiting_transfer`.
4. W ciągu kilku-kilkunastu sekund: mail z danymi do przelewu, powiadomienia adminów, wpis w `team_contacts` partnera (jeśli był `refCode`).
