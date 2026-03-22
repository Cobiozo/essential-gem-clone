

# Formularze na stronie partnera — system definicji formularzy z kotwicami CTA

## Obecny stan
- Zakładka "Formularze" zawiera `PartnerFormsManager` — wyświetla jedynie listę zebranych leadów
- Brak systemu definicji formularzy konfigurowalnych przez admina
- Przyciski CTA obsługują kotwicę `#ankieta` (otwiera modal ankiety) — ten sam wzorzec zastosujemy do formularzy

## Cel
Admin tworzy formularze w zakładce "Formularze", każdy z unikalną kotwicą CTA (np. `darmowy-poradnik`). Gdy przycisk na stronie partnera ma URL `#darmowy-poradnik`, kliknięcie otwiera modal z tym formularzem. Po wypełnieniu dane zapisują się jako kontakt prywatny partnera (`contact_source: 'Strona partnerska'`).

## Zmiany

### 1. Nowa tabela `partner_page_forms` (migracja SQL)
```
id, name, cta_key (unique), fields (jsonb), submit_text, success_message, 
is_active, created_at, updated_at
```
Pole `fields` — tablica obiektów: `{ label, type (text/email/tel/textarea), placeholder, required }`.
Pole `cta_key` — kotwica CTA (np. `darmowy-poradnik`), unikalna, używana jako `#darmowy-poradnik` w URL przycisków.

RLS: select dla wszystkich (anonimowe strony), insert/update/delete tylko admin.

### 2. Przebudowa `PartnerFormsManager.tsx`
Dwie pod-zakładki:
- **Definicje formularzy** — CRUD formularzy: nazwa, kotwica CTA, lista pól (dodawanie/usuwanie/edycja), tekst przycisku, wiadomość sukcesu, aktywny/nieaktywny
- **Zebrane leady** — obecna tabela leadów (przeniesiona do osobnego komponentu `PartnerLeadsList`)

### 3. Nowy komponent `PartnerFormModal.tsx`
Modal wyświetlany na stronie partnera po kliknięciu przycisku z kotwicą formularza:
- Pobiera definicję formularza z `partner_page_forms` po `cta_key`
- Renderuje pola dynamicznie z konfiguracji `fields`
- Po submit: wywołuje edge function `save-partner-lead` z danymi + `contact_reason` = nazwa formularza

### 4. Modyfikacja sekcji ze wsparciem CTA
Wzorzec identyczny jak `#ankieta` → `onSurveyOpen`:
- `PartnerPage.tsx`: pobiera aktywne formularze, tworzy mapę `cta_key → form`, przekazuje callback `onFormOpen(ctaKey)` do sekcji
- `HeaderSection`, `HeroSection`, `CtaBannerSection`: rozszerzenie `handleClick` — jeśli URL to `#<cta_key>` pasujący do formularza, otwiera `PartnerFormModal`
- Nowy prop `formKeys?: string[]` + `onFormOpen?: (key: string) => void`

### 5. Stan formularza w `PartnerPage.tsx`
```
const [formDefs, setFormDefs] = useState<FormDef[]>([]);
const [activeFormKey, setActiveFormKey] = useState<string | null>(null);
```
- Fetch `partner_page_forms` where `is_active = true` on mount
- `handleFormOpen(ctaKey)` → `setActiveFormKey(ctaKey)`
- Render `<PartnerFormModal>` gdy `activeFormKey !== null`

## Pliki do utworzenia
- `src/components/partner-page/sections/PartnerFormModal.tsx`
- `src/components/admin/PartnerLeadsList.tsx` (wydzielona tabela leadów)

## Pliki do modyfikacji
- `src/components/admin/PartnerFormsManager.tsx` — przebudowa na edytor formularzy + pod-zakładka leadów
- `src/pages/PartnerPage.tsx` — fetch form defs, stan modala, przekazanie callbacków
- `src/components/partner-page/sections/HeaderSection.tsx` — obsługa `onFormOpen`
- `src/components/partner-page/sections/HeroSection.tsx` — obsługa `onFormOpen`
- `src/components/partner-page/sections/CtaBannerSection.tsx` — obsługa `onFormOpen`

## Migracja SQL
Tabela `partner_page_forms` + RLS policies.

