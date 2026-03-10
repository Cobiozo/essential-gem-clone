

# Dodanie szablonów webinar_reminder_12h i webinar_reminder_2h

## Co trzeba dodać

### 1. Dwa rekordy w `email_event_types`
- `webinar_reminder_12h`
- `webinar_reminder_2h`

### 2. Dwa rekordy w `email_templates`

**webinar_reminder_12h** — "Przypomnienie o webinarze (12h przed)"
- Subject: `⏰ Za 12 godzin! Webinar: {{event_title}}`
- Body: Styl identyczny z szablonem 24h (niebieski przycisk Zoom, info o dacie/godzinie/prowadzącym)
- Tekst główny: "za 12 godzin odbędzie się webinar"
- Bez wyróżnionego linku Zoom w treści (link dostępny ale nie jest głównym CTA — zgodnie z logiką bulk function: 12h nie includeLink)

**webinar_reminder_2h** — "Przypomnienie o webinarze (2h przed)"
- Subject: `🔔 Za 2 godziny! Webinar: {{event_title}}`
- Body: Styl podobny do 1h (zielony przycisk), ale z tekstem "za 2 godziny"
- Również bez wyróżnionego linku Zoom (2h nie includeLink w bulk function)

### 3. Zmienne szablonów
Identyczne jak istniejące: `imię`, `event_title`, `event_date`, `event_time`, `host_name`, `zoom_link`

## Implementacja
Użyję narzędzia insert do dodania 4 rekordów (2 event types + 2 templates) bezpośrednio do bazy danych. Szablony HTML będą bazować na istniejącym designie (żółty header z logo Pure Life Center, biały content, szary footer).

