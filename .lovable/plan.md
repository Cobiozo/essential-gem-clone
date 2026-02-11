
# Domyslny szablon strony partnerskiej w stylu Pure Life

## Cel
Wypelnienie pustego szablonu (`partner_page_template`) gotowa struktura wzorowana na screenach Eqology, ale w stylu Pure Life Center. Jednoczesnie przebudowanie renderera publicznej strony (`PartnerPage.tsx`) aby wyswietlal szablon w profesjonalnym, nowoczesnym layoucie.

## Struktura szablonu (template_data)

Szablon bedzie skladal sie z nastepujacych elementow w kolejnosci:

| Poz. | ID | Typ | Opis | Partner edytuje? |
|---|---|---|---|---|
| 0 | `hero_banner` | static | Baner hero z logo Pure Life, haslem i tlem | Nie |
| 1 | `partner_title` | editable_text | Tytul/rola partnera (np. "Independent Business Partner") | Tak |
| 2 | `products_section` | product_slot | Siatka produktow z katalogu — partner dodaje linki | Tak (linki) |
| 3 | `about_heading` | static | Naglowek sekcji "O mnie" | Nie |
| 4 | `partner_photo` | editable_image | Zdjecie partnera | Tak |
| 5 | `partner_bio` | editable_text | Bio partnera (max 1000 znakow) | Tak |
| 6 | `contact_email` | editable_text | Email kontaktowy | Tak |
| 7 | `contact_phone` | editable_text | Telefon kontaktowy | Tak |
| 8 | `contact_facebook` | editable_text | Link do Facebooka | Tak |

## Zmiany w plikach

### 1. Migracja SQL — wypelnienie szablonu
Aktualizacja rekordu w `partner_page_template` gotowym JSONB z powyzszymi elementami.

### 2. `src/pages/PartnerPage.tsx` — przebudowa renderera
Calkowita przebudowa publicznej strony aby wyswietlala profesjonalny layout:

- **Naglowek**: Pasek z awatarem partnera + imie/nazwisko + rola po lewej, logo Pure Life na srodku
- **Hero baner**: Pelna szerokosc, tlo gradientowe/obrazek z haslem Pure Life i przyciskiem "KUP TERAZ" (statyczny element admina)
- **Sekcja produktow**: Siatka 3-kolumnowa z kartami produktow (obraz, nazwa, opis, przycisk "Kup teraz" z linkiem partnera)
- **Sekcja "O mnie"**: Layout 3-kolumnowy — zdjecie partnera po lewej, bio w srodku, dane kontaktowe po prawej
- **Stopka**: Separator + "Pure Life Center" branding

Styl: czyste biale tlo, subtelne cienie, zaokraglone rogi, responsywnosc (mobile-first).

### 3. `src/components/admin/PartnerTemplateEditor.tsx` — bez zmian
Istniejacy edytor juz obsluguje wszystkie typy elementow. Admin moze dalej modyfikowac szablon.

## Szczegoly techniczne

### Renderer mapuje elementy szablonu na dedykowane sekcje:
- Elementy `static` renderuja HTML admina
- Elementy `editable_text` / `editable_image` pobieraja wartosci z `custom_data` partnera (po kluczu `element.id`)
- Element `product_slot` renderuje siatke produktow z `partner_product_links`
- Specjalne ID (np. `partner_photo`, `contact_email`) sa rozpoznawane przez renderer i ukladane w dedykowanych sekcjach layoutu (sekcja kontaktowa, naglowek)

### Responsywnosc:
- Desktop: 3 kolumny produktow, layout kontaktowy obok siebie
- Tablet: 2 kolumny produktow
- Mobile: 1 kolumna, wszystko w pionie
