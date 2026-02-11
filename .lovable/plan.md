

# Aktualizacja szablonu Pure Life + Picker obrazkow z biblioteki mediow

## Cel
Trzy rzeczy w jednym:
1. Zaktualizowac szablon (`template_data`) o pelne tresci ze screenow (welcome, zamowienie, kontakt, stopka)
2. Przebudowac renderer `PartnerPage.tsx` w stylu screenow (kremowe tlo, akordeony, waska kolumna)
3. Dodac mozliwosc wyboru obrazka produktu z biblioteki mediow (picker) lub wpisania URL recznie w `ProductCatalogManager`

---

## 1. Szablon — migracja SQL

Aktualizacja `partner_page_template.template_data` o rozszerzona strukture:

| Poz. | ID | Typ | Tresc |
|---|---|---|---|
| 0 | hero_banner | static | "ZMIENIAMY ZDROWIE I ZYCIE LUDZI NA LEPSZE" + branding Pure Life |
| 1 | partner_title | editable_text | Tytul partnera |
| 2 | welcome_section | static | "Witaj w swojej podrozy po zdrowie!" + 3 akapity ze screenow |
| 3 | products_section | product_slot | Siatka produktow |
| 4 | order_section | static | Rozwijana sekcja "Zamowienie" z instrukcjami |
| 5 | contact_section_static | static | Rozwijana "Badz z nami w kontakcie!" + link FB |
| 6 | about_heading | static | Naglowek "O mnie" |
| 7 | partner_photo | editable_image | Zdjecie partnera |
| 8 | partner_bio | editable_text | Bio partnera (max 1000 znakow) |
| 9 | contact_email | editable_text | Email |
| 10 | contact_phone | editable_text | Telefon |
| 11 | contact_facebook | editable_text | Facebook |
| 12 | footer_branding | static | "Zmieniamy zdrowie i zycie ludzi na lepsze", "Pozdrawiamy", "zespol Pure Life" |

Pelne teksty ze screenow beda wstawione w pola `content` elementow statycznych.

---

## 2. Renderer `PartnerPage.tsx` — przebudowa

Calkowita zmiana wygladu strony publicznej:

- **Tlo strony**: kremowe/bezowe (`#f5f0e8`)
- **Waska kolumna**: max-w-2xl centrowana (jak na screenach — waski layout)
- **Hero**: karta z duzym napisem i logo Pure Life
- **Welcome section**: centowany tekst w bialej karcie
- **Produkty**: siatka 1-3 kolumny z kartami produktow
- **Zamowienie**: akordeon (Collapsible) — rozwijane po kliknieciu
- **Kontakt statyczny**: akordeon z linkiem do grupy FB (przycisk ciemnozielony)
- **O mnie**: zdjecie + bio + dane kontaktowe
- **Stopka**: "Zmieniamy zdrowie i zycie ludzi na lepsze" / "Pozdrawiamy" / "zespol Pure Life"

Responsywnosc: mobile-first, 1 kolumna na mobile, 2-3 na desktop.

---

## 3. Picker obrazkow w Katalogu produktow

Obecny dialog edycji produktu ma tylko pole tekstowe "URL obrazka". Dodamy:

- **Przycisk "Wybierz z biblioteki"** obok pola URL — otwiera dialog z `AdminMediaLibrary` w trybie `mode="picker"` z filtrem `allowedTypes={['image']}`
- Po wybraniu obrazka z biblioteki, jego URL automatycznie wstawia sie w pole `image_url`
- **Przycisk "Przeslij nowy"** — rowniez otwiera biblioteke mediow (ktora juz ma wbudowany upload)
- Zachowane pole recznego wpisania URL dla przypadkow zewnetrznych linkow
- Podglad wybranego obrazka pod polem (juz istnieje)

Komponent `AdminMediaLibrary` juz obsluguje tryb picker (`mode="picker"`, `onSelect`, `allowedTypes`) — wystarczy go osadzic w dialogu w `ProductCatalogManager`.

---

## Szczegoly techniczne

### Plik: `ProductCatalogManager.tsx`
- Import `AdminMediaLibrary` i dodatkowy `Dialog` do wyswietlenia pickera
- Nowy stan `showMediaPicker: boolean`
- Przycisk "Wybierz z biblioteki" obok pola URL w dialogu edycji
- Callback `onSelect` ustawia `editingProduct.image_url` na `file.file_url` i zamyka picker

### Plik: `PartnerPage.tsx`
- Import `Collapsible` z Radix UI do akordeonow
- Nowe sekcje: `welcome_section`, `order_section`, `contact_section_static`, `footer_branding`
- Kazda sekcja statyczna rozpoznawana po ID elementu szablonu
- Styl: biale karty na kremowym tle, zaokraglone rogi, subtelne cienie

### Plik: migracja SQL
- UPDATE na `partner_page_template` z pelnym JSONB szablonem

