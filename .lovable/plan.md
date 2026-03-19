

# Plan: Szablon "Pure Life Classic" — odwzorowanie screena

## Zakres

Stworzenie nowego szablonu w bazie danych z 6 sekcjami odwzorowującymi screenshot. Wszystkie potrzebne komponenty renderujące i edytory już istnieją — potrzebna jest tylko migracja SQL.

## Sekcje szablonu

| # | Typ | Zawartość |
|---|-----|-----------|
| 0 | `header` | Logo "Pure Life" + nav: Produkty, Biznes, O nas, Kontakt |
| 1 | `hero` (split) | "Zadbaj o zdrowie i zbuduj dochód pomagając innym." + obraz produktów po prawej + stats bar (2000 klientów, 30 krajów, 25000 pobrań) + CTA "Chcę zobaczyć ofertę" |
| 2 | `text_image` | Sekcja partnera — "{Imię} \| Twój partner w Pure Life", bio z checkmarkami ✔️, CTA "Chcę dołączyć!", obraz partnera po prawej |
| 3 | `products_grid` | "Produkty, które ludzie kochają (i które działają)" — 3 kolumny: Gold, Heart&Energy, Collagen Booster |
| 4 | `contact_form` | "Daj mi znać jeśli chcesz wiedzieć więcej" — pola: Imię, Email, Telefon + przycisk "Wyślij formularz" |
| 5 | `footer` | Pure Life Polska Sp. z o.o., adres, telefon, linki (Warunki współpracy, Polityka prywatności), social media (Facebook, Instagram, Twitter) |

## Plik do utworzenia

| Plik | Opis |
|------|------|
| `supabase/migrations/[timestamp]_pure_life_template.sql` | INSERT szablonu "Pure Life Classic" z pełnym JSON template_data |

## Zmiany w kodzie — brak

Wszystkie renderery (`HeroSection` z layout=split, `TextImageSection`, `ProductsGridSection`, `ContactFormSection`, `FooterSection`, `HeaderSection`) oraz ich edytory admina już istnieją i obsługują potrzebne konfiguracje. Żadne zmiany w komponentach nie są wymagane.

