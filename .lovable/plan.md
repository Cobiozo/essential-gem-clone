

# Plan: Wysłanie testowych emaili dla wydarzenia "Prezentacja możliwości biznesowych" (jutro 19:00)

## Dane

- **Wydarzenie**: "Prezentacja możliwości biznesowych" (ID: `58aac028-c68f-45c8-9999-d34b5ebb9ced`)
- **Start**: 2026-03-18 18:00 UTC (19:00 CET), End: 18:30 UTC
- **Zoom**: `https://us06web.zoom.us/j/86307580362`
- **Goście testowi**: `sebastiansnopek87@gmail.com` (Kinga, invited_by 629a2d9a) i `byk1023@wp.pl` (Seba, invited_by 629a2d9a)
- **Zapraszający**: Sebastian Snopek (629a2d9a)

## Co wyślę (6 emaili na adres × 2 adresy = 12 emaili)

| # | Typ | Link Zoom | Opis |
|---|------|-----------|------|
| 1 | Przypomnienie 24h | ❌ | Informacja o jutrzejszym wydarzeniu |
| 2 | Przypomnienie 12h | ❌ | Zbliża się wydarzenie |
| 3 | Przypomnienie 2h | ✅ | Z przyciskiem "Dołącz do Zoom" |
| 4 | Przypomnienie 1h | ✅ | Z przyciskiem "Dołącz do Zoom" |
| 5 | Przypomnienie 15min | ✅ | Ostatnie przypomnienie z linkiem |
| 6 | Podziękowanie | — | Dane kontaktowe Sebastiana Snopka jako zapraszającego |

## Sposób realizacji

1. Wywołanie `send-bulk-webinar-reminders` z `reminder_type` = 24h, 12h, 2h, 1h, 15min kolejno dla tego eventu (wysyła do obu adresów automatycznie)
2. Wywołanie `send-post-event-thank-you` osobno dla każdego adresu z `inviter_user_id: 629a2d9a`
3. Zresetowanie flag `reminder_*_sent` dla obu gości po testach, żeby automatyka jutro mogła je wysłać normalnie

## Uwaga o 1h

Przypomnienie 1h **jest w pełni skonfigurowane** w systemie:
- `send-bulk-webinar-reminders`: typ `1h` z `includeLink: true` i szablonem `webinar_reminder_1h`
- `process-pending-notifications`: okno 45-75 min przed startem (linia 358)
- Szablon `webinar_reminder_1h` zawiera `{{zoom_link}}`

W poprzednim planie pominąłem je wizualnie na liście, ale w kodzie i automatyce jest obecne. Teraz wyślę je jawnie.

## Brak zmian w kodzie
Wszystko realizowane przez wywołania istniejących Edge Functions.

