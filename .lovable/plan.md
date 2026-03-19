

# Plan: Wieloszablonowy system "Szablon strony" w CMS admina

## Cel
Zamiana zakładki "Szablon strony" z pojedynczego edytora na **listę szablonów** z możliwością edycji każdego z osobna i przyciskiem "Wróć do listy". Partner będzie mógł wybrać jeden szablon z dostępnych.

## Zmiany w bazie danych

**Migracja SQL** — dodanie kolumn do `partner_page_template`:
- `name TEXT NOT NULL DEFAULT 'Szablon'` — nazwa szablonu
- `description TEXT` — krótki opis
- `is_active BOOLEAN DEFAULT true` — czy widoczny dla partnerów
- `position INT DEFAULT 0` — kolejność na liście

Dodanie kolumny `selected_template_id UUID REFERENCES partner_page_template(id)` do tabeli `partner_pages` — przechowuje wybrany szablon partnera.

Wstawienie jednego przykładowego szablonu z gotowymi elementami (Hero + Bio + Produkty).

## Zmiany w kodzie

### 1. `PartnerTemplateEditor.tsx` — przebudowa na list + detail

Komponent przełącza się między dwoma widokami:
- **Lista szablonów**: karty z nazwą, opisem, liczbą elementów, badge aktywny/nieaktywny, przycisk "Edytuj" i "Usuń", przycisk "Dodaj nowy szablon"
- **Edycja szablonu** (istniejący edytor): dodane pole nazwy i opisu na górze + przycisk "Wróć do listy szablonów"

Stan `editingTemplateId` steruje widokiem (null = lista, UUID = edycja).

Pobieranie zmienia się z `.limit(1).maybeSingle()` na `.select('*').order('position')` — ładowanie wszystkich szablonów.

### 2. `PartnerPageEditor.tsx` (strona partnera) — wybór szablonu

Jeśli partner nie ma jeszcze wybranego szablonu (`selected_template_id = null`), widzi galerię miniatur szablonów z przyciskiem "Wybierz". Po wybraniu — szablon jest przypisany i wyświetlany jak dotychczas.

### 3. `usePartnerPage.ts` — aktualizacja

Pobieranie szablonu na podstawie `selected_template_id` z `partner_pages` zamiast `.limit(1)`.

### 4. Typy `partnerPage.ts`

Dodanie `name`, `description`, `is_active`, `position` do `PartnerPageTemplate`. Dodanie `selected_template_id` do `PartnerPage`.

## Przykładowy szablon

Szablon "Klasyczny" z 4 elementami:
1. **static** — nagłówek powitalny HTML
2. **editable_text** — "O mnie" (bio partnera)
3. **editable_image** — zdjęcie profilowe
4. **product_slot** — siatka produktów

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| Nowa migracja SQL | ALTER TABLE + INSERT przykładowy szablon |
| `src/components/admin/PartnerTemplateEditor.tsx` | Lista + edycja z przyciskiem "Wróć" |
| `src/components/partner-page/PartnerPageEditor.tsx` | Wybór szablonu jeśli brak |
| `src/hooks/usePartnerPage.ts` | Pobieranie po `selected_template_id` |
| `src/types/partnerPage.ts` | Nowe pola w typach |

