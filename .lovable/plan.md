

# Personalizowane strony partnerow — szablon admina z kontrolowana edycja

## Koncepcja

System sklada sie z dwoch odrebnych edytorow o roznym poziomie kontroli:

### Edytor Admina (pelna kontrola)
Admin buduje szablon strony partnerskiej z rozbudowanym edytorem. Kazdy element szablonu ma okreslony **typ edycji partnera** — admin decyduje co partner moze zmienic:
- Element statyczny (partner nie widzi go w edytorze, wyswietla sie bez zmian)
- Pole tekstowe (partner moze wpisac wlasny tekst w wyznaczonym miejscu)
- Miejsce na obrazek (partner moze dodac zewnetrzny obrazek)
- Produkt z biblioteki (admin dodaje obraz i opis, partner przypisuje tylko swoj link zakupowy)

Admin rowniez zarzadza **biblioteka produktow** — zbior obrazow/opisow produktow, ktorych wyglad jest niezmienny. Partner moze jedynie wybrac produkty i przypisac do kazdego swoj URL zakupowy.

### Edytor Partnera (ograniczony)
Partner widzi uproszczony formularz — NIE widzi szablonu, nie moze go zmienic. Widzi TYLKO:
- Pole na alias (URL)
- Lista edytowalnych pol wyznaczonych przez admina (np. "Twoje bio", "Twoje zdjecie")
- Lista produktow z biblioteki — zaznacza ktore chce i wpisuje link zakupowy
- Przelacznik wlacz/wylacz strone

## Baza danych

### Tabela `partner_page_settings`
Singleton z ustawieniami globalnymi i kontrola dostepu:

| Kolumna | Typ | Opis |
|---|---|---|
| id | UUID | PK |
| is_system_active | BOOLEAN | Caly system wlaczony/wylaczony |
| enabled_for_partner | BOOLEAN | Dostep dla roli partner |
| enabled_for_specjalista | BOOLEAN | Dostep dla roli specjalista |
| enabled_for_client | BOOLEAN | Dostep dla roli klient |
| enabled_for_admin | BOOLEAN | Dostep dla roli admin |

### Tabela `partner_page_user_access`
Indywidualny dostep nadawany przez admina:

| Kolumna | Typ | Opis |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK do profiles (UNIQUE) |
| is_enabled | BOOLEAN | Wlacz/wylacz dostep |
| granted_by | UUID | Admin ktory nadal |

### Tabela `partner_page_template`
Szablon strony tworzony przez admina (jeden aktywny rekord):

| Kolumna | Typ | Opis |
|---|---|---|
| id | UUID | PK |
| template_data | JSONB | Lista elementow szablonu |
| updated_at | TIMESTAMPTZ | |

Struktura `template_data` — tablica elementow, kazdy ma:
```text
{
  "id": "unique_element_id",
  "type": "static" | "editable_text" | "editable_image" | "product_slot",
  "label": "Etykieta widoczna dla partnera (np. 'Twoje bio')",
  "content": "Tresc statyczna HTML (dla type=static)",
  "max_length": 500,         // dla editable_text
  "placeholder": "Wpisz...", // podpowiedz dla partnera
  "position": 1,
  "style": { ... }           // styl CSS elementu
}
```

- `static` — partner nie moze edytowac, wyswietla `content` bez zmian
- `editable_text` — partner wpisuje tekst, admin ustala label, placeholder, max_length
- `editable_image` — partner wstawia URL obrazka, admin ustala rozmiar/pozycje
- `product_slot` — miejsce na siatke produktow z biblioteki

### Tabela `product_catalog`
Biblioteka produktow zarzadzana wylacznie przez admina:

| Kolumna | Typ | Opis |
|---|---|---|
| id | UUID | PK |
| name | TEXT | Nazwa produktu |
| description | TEXT | Opis |
| image_url | TEXT | Obrazek (niezmienny, z media library) |
| position | INTEGER | Kolejnosc |
| is_active | BOOLEAN | |

### Tabela `partner_pages`
Dane indywidualne kazdego partnera:

| Kolumna | Typ | Opis |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK profiles (UNIQUE) |
| alias | TEXT (UNIQUE) | Alias w URL |
| is_active | BOOLEAN | Strona wlaczona |
| custom_data | JSONB | Wartosci partnera, np. `{"bio": "Jestem...", "photo": "url"}` — klucze odpowiadaja `id` elementow z szablonu |

### Tabela `partner_product_links`
Przypisania produktow do stron partnerow:

| Kolumna | Typ | Opis |
|---|---|---|
| id | UUID | PK |
| partner_page_id | UUID | FK partner_pages |
| product_id | UUID | FK product_catalog |
| purchase_url | TEXT | Link zakupowy partnera |
| position | INTEGER | Kolejnosc |
| is_active | BOOLEAN | |

### Polityki RLS
- `partner_page_settings` — SELECT authenticated, UPDATE admin
- `partner_page_user_access` — CRUD admin
- `partner_page_template` — SELECT public, UPDATE admin
- `product_catalog` — SELECT public, CRUD admin
- `partner_pages` — SELECT public (aktywne), INSERT/UPDATE wlasciciel (auth.uid())
- `partner_product_links` — SELECT public, CRUD wlasciciel strony

## Nowe pliki

### Strona publiczna
**`src/pages/PartnerPage.tsx`**
- Pobiera alias z URL, laduje szablon + dane partnera + produkty
- Renderuje elementy szablonu: statyczne bez zmian, edytowalne z wartosciami partnera, produkty z przyciskami "Kup teraz" (link partnera)
- 404 jesli brak aliasu lub strona nieaktywna

### Edytor partnera (ograniczony)
**`src/components/partner-page/PartnerPageEditor.tsx`**
- Prosty formularz w zakladce "Moja strona" w MyAccount
- Pole alias z walidacja
- Dla kazdego elementu `editable_text` — pole textarea
- Dla kazdego elementu `editable_image` — pole URL lub upload
- Sekcja produktow: lista checkboxow (wybierz produkty) + pole URL dla kazdego zaznaczonego
- Przelacznik aktywnosci + podglad linku
- Partner NIE widzi elementow `static` i NIE moze zmieniac ukladu

**`src/hooks/usePartnerPageAccess.ts`**
- Sprawdza `partner_page_settings` + `partner_page_user_access` + role uzytkownika
- Zwraca `{ hasAccess, loading }`

**`src/hooks/usePartnerPage.ts`**
- CRUD na `partner_pages` i `partner_product_links`
- Walidacja aliasu (unikalnosc + zastrzezone nazwy)

### Edytor admina (rozbudowany)
**`src/components/admin/PartnerTemplateEditor.tsx`**
- Drag-and-drop edytor sekcji szablonu (wykorzystuje istniejacy wzorzec DnD z `@dnd-kit`)
- Dodawanie elementow: statyczny HTML, pole tekstowe, pole obrazkowe, slot produktowy
- Dla kazdego elementu: ustawienie typu, etykiety, placeholdera, limitu znakow, stylu
- Podglad szablonu w czasie rzeczywistym

**`src/components/admin/ProductCatalogManager.tsx`**
- CRUD produktow: nazwa, opis, obrazek (przez istniejaca `AdminMediaLibrary`)
- Drag-and-drop kolejnosc
- Wlacz/wylacz produkty

**`src/components/admin/PartnerPageAccessManager.tsx`**
- Przelaczniki dla rol (partner, specjalista, klient, admin)
- Przelacznik globalny systemu
- Wyszukiwarka uzytkownikow + dodawanie/usuwanie indywidualnego dostepu
- Lista aktywnych stron partnerskich z linkami

## Zmiany w istniejacych plikach

### `src/App.tsx`
- Nowa trasa `/:alias` z lazy-loaded `PartnerPage` — PO wszystkich stalych trasach, PRZED catch-all `*`

### `src/pages/MyAccount.tsx`
- Nowa zakladka "Moja strona" (ikona Globe) — renderowana warunkowo przez `usePartnerPageAccess().hasAccess`
- Renderuje `PartnerPageEditor`

### `src/pages/Admin.tsx`
- Nowa sekcja "Strony partnerow" z podsekcjami: Kontrola dostepu, Szablon, Katalog produktow

## Porownanie edytorow

| Funkcja | Admin | Partner |
|---|---|---|
| Tworzenie/usuwanie sekcji szablonu | Tak | Nie |
| Zmiana ukladu/stylu | Tak | Nie |
| Dodawanie elementow statycznych | Tak | Nie |
| Definiowanie pol edytowalnych | Tak | Nie |
| Wypelnianie pol tekstowych | - | Tak (tylko wyznaczone) |
| Dodawanie obrazkow | - | Tak (tylko wyznaczone) |
| Zarzadzanie katalogiem produktow | Tak | Nie |
| Zmiana obrazow produktow | Tak | Nie |
| Przypisanie linku zakupowego do produktu | - | Tak |
| Wlaczanie/wylaczanie dostepu | Tak | Nie |
| Ustawianie aliasu | - | Tak |

## Zastrzezone aliasy
auth, admin, dashboard, my-account, training, knowledge, page, html, events, infolink, zdrowa-wiedza, calculator, messages, paid-events, install

## Wplyw na istniejace funkcjonalnosci
Zerowy. Nowa trasa `/:alias` jest dynamiczna i sprawdza baze. Wszystkie istniejace trasy maja priorytet. Zadne istniejace tabele nie sa modyfikowane.

