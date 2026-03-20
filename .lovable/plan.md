
Cel: ustaliłem, że problem nie leży już w samym scrollu CTA, tylko w tym, że na stronie partnera najpewniej w ogóle nie ma sekcji ankiety.

Co znalazłem
- Publiczna strona partnera ładuje szablon z `partner_pages.selected_template_id`.
- Dla ostatnio zaktualizowanej strony partnera aktywny szablon to `Eqology` (`892223f1-cccf-4922-bab3-5781f7629a8a`).
- Ten szablon ma 11 elementów i nie zawiera żadnego elementu typu `survey`.
- CTA ma `cta_url: #ankieta`, więc przewijanie nie ma do czego skoczyć.
- Dodatkowo `SurveyManager.tsx` zapisuje ankietę nie do wybranego szablonu partnera, tylko zawsze do pierwszego rekordu z `partner_page_template` (`limit(1)`), więc ankieta mogła być zapisywana do innego szablonu niż ten używany na stronie.
- Jest też niespójność w edytorze szablonów: `PartnerTemplateEditor.tsx` nadal nie traktuje `survey` jako rich section, więc zarządzanie ankietą jest rozdzielone i łatwo o zapis “nie tam gdzie trzeba”.

Plan naprawy
1. Naprawić źródło zapisu ankiety
- Przerobić `SurveyManager.tsx`, żeby pracował na konkretnym szablonie, a nie na `limit(1)`.
- Najlepiej powiązać go z aktualnie edytowanym / wybranym szablonem partnera.

2. Ujednolicić edycję ankiety z edycją szablonu
- Dodać `survey` do `RICH_TYPES` i `TYPE_LABELS` w `PartnerTemplateEditor.tsx`.
- Dzięki temu ankieta będzie normalną sekcją szablonu, tak jak hero/faq/cta, zamiast osobnego bytu obok szablonu.

3. Pokazać w adminie, do którego szablonu trafia ankieta
- Dodać czytelną informację typu: „Edytujesz ankietę dla szablonu: Eqology”.
- Jeśli aktywny szablon nie zawiera ankiety, pokazać komunikat i przycisk dodania sekcji do tego konkretnego szablonu.

4. Zachować działanie CTA po stronie renderingu
- Obecna logika anchorów wygląda poprawnie, więc po dodaniu realnej sekcji `survey` z `anchor_id: ankieta` CTA `#ankieta` powinno zacząć działać bez dalszych zmian.

5. Sprawdzić dodatkową niespójność konfiguracji
- W danych nagłówka widzę `anchor_id: #eqology` z hashem zapisanym w samym ID. To nie blokuje ankiety, ale warto znormalizować istniejące dane, bo `anchor_id` powinno być bez `#`.

Pliki do zmiany
- `src/components/admin/SurveyManager.tsx`
- `src/components/admin/PartnerTemplateEditor.tsx`
- ewentualnie miejsce, z którego wybierany jest aktualny szablon do edycji ankiety

Efekt po wdrożeniu
- Ankieta będzie zapisywana do właściwego szablonu partnera.
- CTA `#ankieta` zacznie działać, bo na stronie faktycznie pojawi się element z tym ID.
- Admin przestanie trafiać w pułapkę „ankieta zapisana, ale nie w tym szablonie”.

Najważniejsza przyczyna
- Ankieta nie działa nie dlatego, że przycisk CTA jest błędny, tylko dlatego, że aktywny szablon strony partnera obecnie nie zawiera sekcji `survey`, a osobny manager ankiety zapisuje ją do innego / pierwszego szablonu w bazie.
