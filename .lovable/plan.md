

# Rozbudowa formularza "Odbierz darmowy poradnik"

## Zmiany

### 1. Dodanie kolumny `description` do tabeli `partner_page_forms`
Migracja SQL: `ALTER TABLE partner_page_forms ADD COLUMN description text;`
Następnie update rekordu `darmowy-poradnik` z tekstem wprowadzającym, np.:
> "Pobierz nasz darmowy poradnik/e-book dotyczący zdrowego stylu życia. Po wypełnieniu formularza poradnik zostanie wysłany na podany adres email."

### 2. Dodanie pola `consent_text` do tabeli `partner_page_forms`
Migracja SQL: `ALTER TABLE partner_page_forms ADD COLUMN consent_text text;`
Update rekordu z treścią zgody, np.:
> "Wyrażam zgodę na przetwarzanie moich danych osobowych zawartych w formularzu w celu przesłania poradnika/e-booka na podany adres email."

### 3. Update `FormDef` i renderowania w `PartnerFormModal.tsx`
- Rozszerzyć interfejs `FormDef` o `description?: string` i `consent_text?: string`
- Nad polami formularza wyświetlić `formDef.description` jako paragraf tekstu wprowadzającego
- Pod polami (przed przyciskiem submit) dodać obowiązkowy checkbox z `formDef.consent_text`
- Stan `consentChecked` — przycisk submit disabled gdy checkbox nie zaznaczony

### 4. Update typów Supabase
Dodanie `description` i `consent_text` do typu `partner_page_forms` w `types.ts`.

## Pliki do modyfikacji
- Migracja SQL (ALTER TABLE + UPDATE danych)
- `src/components/partner-page/sections/PartnerFormModal.tsx`
- `src/integrations/supabase/types.ts`

