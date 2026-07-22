Plan wdrożenia:

1. Naprawić zmianę języka wiadomości w modalu „Udostępnij materiał”
- Ujednolicić budowanie wiadomości dla podglądu i wygenerowanej wiadomości.
- Obecnie materiały mają zapisany własny `share_message_template`, który nadpisuje wybór języka, dlatego po zmianie flagi tekst zostaje po polsku.
- Dla języków innych niż polski używać szablonu danego języka zamiast polskiego custom template.
- Przy generowaniu wiadomości pobierać tłumaczenia tytułu/opisu z `healthy_knowledge_translations`, żeby wiadomość była faktycznie w wybranym języku, a nie tylko z przetłumaczonym nagłówkiem.
- Przeliczać podgląd wiadomości natychmiast po zmianie języka w selektorze.

2. Dodać dane osoby, która aktywowała kod, w widżecie „Kody dostępu OTP”
- Rozszerzyć zapytanie widżetu o powiązane `hk_otp_sessions` dla kodów Bazy Wiedzy.
- Po aktywacji kodu pokazywać pod kodem dane z formularza gościa:
  - imię i nazwisko,
  - e-mail,
  - telefon,
  - czas aktywacji / ostatnią sesję,
  - opcjonalnie realny czas oglądania, jeśli `watched_seconds` jest dostępne.
- Zachować kompaktowy wygląd widżetu na pulpicie: dla nieużytych kodów nadal „Oczekuje”, dla użytych krótka informacja o gościu z tooltipem/szczegółami.
- W historii „Moje kody Bazy Wiedzy” również pokazać te dane w kolumnie odbiorcy, zamiast tylko danych wpisanych przy generowaniu kodu.

3. Naprawić `ref=<EQ_ID>` w linkach generowanych i kopiowanych później
- Upewnić się, że Edge Function `generate-hk-otp` zapisuje `partner_eq_id` i zwraca link z `?ref=<EQ_ID>`.
- Wdrożyć/deployować funkcję, ponieważ w bazie najnowsze kody mają `partner_eq_id = null` mimo że profile mają `eq_id`.
- Dodać bezpieczny fallback: jeśli `partner_eq_id` przy kodzie jest pusty, link budowany w frontendzie pobierze `eq_id` partnera z profilu albo użyje już zapisanego `partner_eq_id`.
- Poprawić wszystkie miejsca kopiowania linku/wiadomości dla kodów Bazy Wiedzy:
  - modal generowania,
  - widżet OTP na pulpicie,
  - historia kodów na koncie.
- Wykonać jednorazowe uzupełnienie istniejących kodów: `partner_eq_id` zostanie wypełnione z `profiles.eq_id` dla starych rekordów, gdzie jest puste.

4. Walidacja po wdrożeniu
- Wygenerować testowy kod z wybranym językiem i sprawdzić, że treść wiadomości zmienia się zgodnie z językiem.
- Sprawdzić, że wygenerowany i skopiowany link ma `?ref=<EQ_ID>`.
- Sprawdzić, że po użyciu kodu w widżecie pojawiają się dane osoby z formularza gościa.

Zmiany obejmą frontend i istniejącą Edge Function. Nie widzę potrzeby tworzenia nowych tabel, bo `partner_eq_id` oraz dane gościa w `hk_otp_sessions` już istnieją.