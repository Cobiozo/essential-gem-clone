
# Plan: Zmiana sekwencji przypomnień + link od 2h

## Diagnoza

Logi `email_logs` potwierdzają, że **wszystkie emaile testowe zostały wysłane** (status: `sent`) do obu adresów. Problem nie leży po stronie kodu ani SMTP — emaile wychodzą, ale mogą trafiać do spamu lub być opóźnione przez dostawcę (wp.pl i gmail).

Niezależnie od tego, wdrażamy wybraną zmianę: **link do webinaru ma być dołączany od 2h przed** (zamiast od 1h), co daje 3 emaile z linkiem zamiast 2.

## Zakres zmian

### 1. Zmiana konfiguracji linków w `send-bulk-webinar-reminders`

Jedyna zmiana: w `REMINDER_CONFIG` ustawić `includeLink: true` dla klucza `"2h"` (linia 58). Reszta konfiguracji (24h, 12h, 1h, 15min) pozostaje bez zmian.

```
"2h": { ..., includeLink: true }   // było: false
```

To powoduje, że `send-bulk-webinar-reminders` automatycznie dołącza `zoom_link`/`location` do treści emaila 2h.

### 2. Weryfikacja szablonu `webinar_reminder_2h`

Szablon `webinar_reminder_2h` istnieje w bazie i jest aktywny. Trzeba sprawdzić czy jego body_html zawiera zmienną `{{zoom_link}}` — jeśli nie, trzeba ją dodać. Fallback w kodzie (`buildFallbackBody`) już obsługuje `includeLink`.

### 3. Deploy

Redeploy `send-bulk-webinar-reminders` po zmianie.

### 4. Test

Wywołanie testowych emaili dla obu adresów aby potwierdzić, że 2h email zawiera link.

## Finalna sekwencja po wdrożeniu

```
Po zapisie      → Potwierdzenie rejestracji (bez linku)
24h przed       → Przypomnienie (bez linku)
12h przed       → Przypomnienie (bez linku)
2h przed        → Przypomnienie + LINK ← NOWE
1h przed        → Przypomnienie + LINK
15 min przed    → Przypomnienie + LINK
Po wydarzeniu   → Podziękowanie
```

## Pliki do zmiany

- `supabase/functions/send-bulk-webinar-reminders/index.ts` — `includeLink: true` dla `"2h"`
- Ewentualnie `UPDATE` szablonu `webinar_reminder_2h` w bazie (dodanie `{{zoom_link}}` jeśli brakuje)
