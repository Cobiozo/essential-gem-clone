

# Aktualizacja szablonu webinar_followup + załączniki

## 1. Aktualizacja treści szablonu w bazie danych
Użycie insert tool (UPDATE) aby nadpisać `body_html` szablonu `webinar_followup` nową pełną treścią w formacie HTML PureLife (żółty header z logo, biały body). Treść zawiera cały tekst podany przez użytkownika z formatowaniem HTML (nagłówki, listy, emoji, wyróżnione sekcje).

Zmienna `{{custom_message}}` pozostaje w szablonie — admin może dodać dodatkowy blok (np. link do nagrania).

## 2. Obsługa załączników w UI (`EventRegistrationsManagement.tsx`)
Dodanie do dialogu follow-up:
- Input file (multiple) akceptujący `.pdf, .doc, .docx, .jpg, .jpeg`
- Max 3 pliki, max 5MB każdy
- Lista wybranych plików z przyciskiem usunięcia
- Pliki konwertowane do base64 i wysyłane w body requestu jako `attachments: [{filename, content_base64, content_type}]`

Stan: nowy `useState` dla `followUpAttachments`.

## 3. Obsługa załączników w Edge Function (`send-post-webinar-email`)
- Nowy parametr `attachments` w request body
- Zmiana formatu SMTP z `multipart/alternative` na `multipart/mixed`:
  - Zagnieżdżony `multipart/alternative` (text + html)
  - Następnie każdy attachment jako osobna część MIME z `Content-Disposition: attachment; filename="..."`
  - Content-Transfer-Encoding: base64

### Zmienione pliki
| Plik | Zmiana |
|------|--------|
| DB `email_templates` | UPDATE body_html szablonu webinar_followup |
| `src/components/admin/EventRegistrationsManagement.tsx` | Dodanie file input + konwersja base64 |
| `supabase/functions/send-post-webinar-email/index.ts` | Obsługa attachments w SMTP multipart/mixed |

