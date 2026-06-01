
## Cel

W tabeli „Zgłoszenia" (komponent `EventFormSubmissions`) wiersze pochodzące z `paid_event_orders` (rezerwacje partnerów/gości na free event) obecnie pokazują w kolumnie „Akcje" tylko ikonę biletu. Trzeba dla nich udostępnić te same możliwości administracyjne, jakie mają wiersze ze `event_form_submissions`:

1. Ponowne wysłanie maila potwierdzającego adres (gdy email jeszcze niepotwierdzony / status `pending`).
2. Ponowne wysłanie biletu PDF (gdy email potwierdzony / status `paid|confirmed`).
3. Anulowanie rezerwacji.
4. Usunięcie rezerwacji całkowicie.
5. Edycja parametrów (imię, nazwisko, email, telefon).

## Co powstanie

### Nowe edge functions (admin-gated, service-role)

- `admin-cancel-event-order` — ustawia `status='cancelled'` w `paid_event_orders`. Weryfikuje rolę admin z JWT.
- `admin-delete-event-order` — twardo usuwa wiersz z `paid_event_orders` (kaskadowo `paid_event_order_attendees`).
- `admin-resend-event-order-confirmation` — wysyła ponownie mail potwierdzający email dla orderu w statusie `pending` (re-trigger linka potwierdzającego, identycznie jak pierwszy wysłany przy rejestracji free event — wykorzysta logikę z `register-free-event-order` / `confirm-event-form-email`).
- `admin-update-event-order` — aktualizuje `first_name`, `last_name`, `email`, `phone` w `paid_event_orders` (i ewentualnie zsynchronizuje pierwszy wiersz `paid_event_order_attendees`).

`admin-resend-free-ticket` już istnieje — użyjemy go do (2).

### UI w `EventFormSubmissions.tsx`

W gałęzi `s.__source === 'order'` w kolumnie Akcje dodać przyciski analogiczne do tych dla zgłoszeń formularzowych:

```text
[edytuj] [bilet/podgląd] 
 status=pending     → [wyślij ponownie mail potwierdzający] [anuluj] [usuń]
 status=paid|confirmed → [wyślij ponownie bilet PDF] [anuluj] [usuń]
 status=cancelled   → [usuń]
```

Plus dialog edycji parametrów (`OrderEditDialog`) z polami: imię, nazwisko, email, telefon, zapisujący przez `admin-update-event-order` i invalidate query `event-form-submissions-orders`.

Wszystkie destrukcyjne akcje (anuluj, usuń) z `window.confirm` w polskiej wersji jak w istniejącym kodzie. Sukces → toast + invalidate `event-form-submissions-orders` oraz `event-form-submission-counts`.

### Bez zmian

- Logika zakładek (Wszystkie/Goście/Partnerzy), filtrów, eksportu Excel, kolumn Data/Osoba/Kontakt/Płatność/Email/Partner zapraszający.
- Wiersze ze `event_form_submissions` — pełen zestaw akcji już istnieje.
- Komponenty weryfikacji biletów i podglądu szablonu PDF.

## Uwagi techniczne

- Wszystkie nowe funkcje wymagają JWT z rolą `admin` (sprawdzane przez `user_roles` jak w `verify-event-ticket` po ostatnim fixie).
- Re-send confirmation: regeneruje token jeśli stary wygasł, używa szablonu maila identycznego jak przy pierwszej rejestracji free event (single source of truth w `_shared/free-event-ticket.ts` / `confirm-event-form-email`).
- Edycja emaila resetuje `email_confirmed_at = null` tylko jeśli admin tego sobie zażyczy (checkbox „Wymagaj ponownego potwierdzenia"); domyślnie zostawiamy bez zmian, żeby nie wyrzucić aktywnego biletu.
- Usunięcie zamówienia anuluje też wszystkie powiązane `paid_event_order_attendees` (ON DELETE CASCADE — sprawdzimy schemat; jeśli brak, dodamy migrację).
