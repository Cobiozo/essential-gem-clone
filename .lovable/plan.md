
Cel: sprawić, żeby email faktycznie pokazywał poprawny diagram oraz zawsze dodawał w załączniku plik PNG z pełnym podsumowaniem.

Co ustaliłem
- Email jest wysyłany poprawnie po stronie SMTP — logi pokazują `Email sent successfully`.
- Problem dotyczy renderowania treści w skrzynce: obecnie wykres jest wkładany do HTML jako `data:` URL, a wiele klientów pocztowych to ucina albo ignoruje.
- Obecna funkcja mailowa buduje tylko `multipart/alternative`, więc nie obsługuje prawdziwych załączników PNG ani stabilnych obrazów inline przez CID.

Plan wdrożenia

1. `AssessmentSummary.tsx` — generowanie 2 obrazów
- Zostawić obecny pełny eksport PNG z `exportRef` jako obraz z kołem + podsumowaniem.
- Dodatkowo wygenerować lżejszy obraz samego koła z `chartOnlyRef` do osadzenia w treści emaila.
- Przy wysyłce nie osadzać już obrazka jako `data:` URL w HTML.
- Zamiast tego wysłać do edge function:
  - `html_body` z miejscem na obraz inline przez `cid`
  - załącznik PNG z pełnym podsumowaniem
  - nazwę pliku np. `ocena-umiejetnosci-nm.png`

2. `send-single-email` — obsługa załączników i obrazów inline
- Rozszerzyć payload funkcji o pola typu:
  - `attachments[]`
  - opcjonalnie `inline_images[]` lub załączniki z `content_id`
- Przebudować MIME z `multipart/alternative` na strukturę, która obsłuży:
  - wersję tekstową
  - wersję HTML
  - obraz inline przez `cid:...`
  - osobny załącznik PNG
- Dzięki temu wykres będzie widoczny w treści maila, a pełne podsumowanie trafi jako prawdziwy załącznik.

3. Treść emaila
- Wstawić na dole wiadomości obraz koła przez `cid`, żeby był zgodny z wynikiem i widoczny bez polegania na `data:` URL.
- Dodać krótką informację, że pełne podsumowanie jest dołączone jako plik PNG.
- Zachować tabelę wyników, średnią, sumę oraz sekcje „Mocne strony” i „Do rozwoju” jako HTML tekstowy.

4. Ograniczenie rozmiaru i stabilność
- Załącznik: pełny PNG z podsumowaniem.
- Inline w mailu: mniejszy PNG tylko z kołem, żeby nie przeciążać wiadomości.
- Jeśli będzie potrzeba, dodatkowo obniżyć skalę obrazu inline, ale bez ruszania jakości załącznika.

Pliki do zmiany
- `src/components/skills-assessment/AssessmentSummary.tsx`
- `supabase/functions/send-single-email/index.ts`

Efekt końcowy
- Na dole maila pojawi się poprawny diagram koła zgodny z wynikiem.
- Email będzie zawierał załącznik PNG z pełnym podsumowaniem.
- Rozwiązanie będzie działało stabilniej niż obecne osadzanie obrazka jako `data:` URL.

Sekcja techniczna
- Przyczyna błędu: klient pocztowy nie renderuje wiarygodnie obrazów osadzonych jako base64 `data:` wewnątrz HTML.
- Poprawne rozwiązanie: `CID inline image` do treści + `multipart/mixed` dla załącznika PNG.
