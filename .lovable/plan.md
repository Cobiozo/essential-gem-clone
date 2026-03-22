

# Dodanie formularza "Odbierz darmowy poradnik" i podpięcie pod przycisk

## Zmiany

### 1. Insert definicji formularza do `partner_page_forms`
Migracja SQL wstawiająca formularz:
- `name`: "Odbierz darmowy poradnik"
- `cta_key`: `darmowy-poradnik`
- `fields`: imię, nazwisko, email (wszystkie wymagane)
- `submit_text`: "Odbieram poradnik"
- `success_message`: "Dziękujemy! Poradnik zostanie wysłany na podany adres email."
- `is_active`: true

### 2. Update URL przycisku w szablonie
W szablonie `e5ae6342-1e2a-469d-8ab6-d493bb48f55e` przycisk "Odbierz darmowy poradnik" ma pusty URL. Migracja zaktualizuje go na `#darmowy-poradnik`, aby kotwica pasowała do `cta_key` formularza.

Update zostanie wykonany na wszystkich szablonach, które mają ten przycisk (przeszukanie JSONB i zamiana).

### Efekt
Po kliknięciu "Odbierz darmowy poradnik" w nawigacji strony partnera otworzy się modal z polami: Imię, Nazwisko, Email. Po wypełnieniu dane zapiszą się jako kontakt prywatny partnera.

## Pliki
- Migracja SQL (insert + update template)
- Brak zmian w kodzie — logika formKeys/onFormOpen/PartnerFormModal jest już zaimplementowana

