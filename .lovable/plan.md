
# Formularze na stronie partnera — system definicji formularzy z kotwicami CTA

## Status: ✅ Zaimplementowane

## Co zostało zrobione

### 1. Tabela `partner_page_forms`
- Migracja SQL z polami: `id, name, cta_key (unique), fields (jsonb), submit_text, success_message, is_active`
- RLS: SELECT dla wszystkich (aktywne), CRUD tylko admin

### 2. Admin: zakładka "Formularze" z dwoma pod-zakładkami
- **Definicje formularzy** — CRUD: nazwa, kotwica CTA, dynamiczne pola (typ, etykieta, placeholder, wymagane), tekst submit, wiadomość sukcesu, aktywny/nieaktywny
- **Zebrane leady** — tabela leadów z formularzy stron partnerskich

### 3. `PartnerFormModal` — modal formularza na stronie partnera
- Pobiera definicję po `cta_key`, renderuje pola dynamicznie
- Po submit wywołuje edge function `save-partner-lead` → zapis do `team_contacts` partnera

### 4. Kotwice CTA w sekcjach
- `HeaderSection`, `HeroSection`, `CtaBannerSection` — przyciski z URL `#<cta_key>` otwierają modal formularza
- Wzorzec identyczny jak `#ankieta` → `onSurveyOpen`

### 5. Leady w kontaktach prywatnych partnera
- Pod-zakładka "Z Mojej Strony Partnera" w Pure-kontaktach (zaimplementowana wcześniej)
