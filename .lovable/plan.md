## Dlaczego nadal nie działa

Frontend wysyła do `register-free-event-order` payload bez pola `consent`, a Edge Function wymaga dokładnie `consent: true`. W aktualnym kodzie `PurchaseDrawer` wysyła tylko:

```ts
acceptMarketing: formData.acceptMarketing
```

dlatego funkcja zwraca `400 { "error": "consent_required" }`, a UI pokazuje ogólny komunikat `Edge Function returned a non-2xx status code`.

Dodatkowo moje testy z ręcznym `ticketId` zwracały `ticket_not_found`, bo użyty ID biletu nie był ID z tej strony. To nie jest główna przyczyna Twojego kliknięcia — główna przyczyna z kodu formularza to brak `consent`.

## Plan naprawy

1. W `src/components/paid-events/public/PurchaseDrawer.tsx` dodać do payloadu:

```ts
consent: formData.acceptTerms
```

2. Poprawić obsługę błędu Edge Function tak, aby zamiast generycznego `Edge Function returned a non-2xx status code` pokazywać realny komunikat z odpowiedzi, np.:
- `consent_required` → „Zaakceptuj regulamin i politykę prywatności.”
- `already_registered` → komunikat z backendu
- `ticket_not_found` → „Ten bilet nie jest już dostępny.”

3. Zweryfikować wywołanie przez `supabase.functions.invoke` po zmianie, żeby rezerwacja bezpłatna kończyła się komunikatem o wysłaniu maila potwierdzającego.

Bez zmian w bazie danych i bez zmian w płatnych wydarzeniach.