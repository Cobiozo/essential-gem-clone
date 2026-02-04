
# Plan: Zmiana brandingu "Pure Life" → "Pure Life Center" + Optymalizacja OG dla WhatsApp

## Zasady zmiany nazwy

| Kontekst | Aktualna wartość | Nowa wartość |
|----------|------------------|--------------|
| Platforma (samodzielne "Pure Life") | `Pure Life` | `Pure Life Center` |
| Zespół (z słowem "Zespół") | `Zespół Pure Life` | **BEZ ZMIAN** |
| Podpisy email z "Zespół" | `Zespół Pure Life` | **BEZ ZMIAN** |
| Hosty/fallbacki z "Zespół" | `Zespół Pure Life` | **BEZ ZMIAN** |

---

## Część 1: Zmiany brandingu "Pure Life" → "Pure Life Center"

### Pliki frontendowe do modyfikacji:

| Plik | Linia | Zmiana |
|------|-------|--------|
| `index.html` | 22-30 | Title, meta, og:title → "Pure Life Center" |
| `src/components/Header.tsx` | 205 | `PURE LIFE` → `PURE LIFE CENTER` |
| `src/components/homepage/Footer.tsx` | 15, 20 | Logo text i copyright |
| `src/components/dashboard/DashboardSidebar.tsx` | 567, 574 | Logo alt i tekst brandu |
| `src/components/dashboard/widgets/DashboardFooterSection.tsx` | 140, 142 | Logo text i copyright |
| `src/components/admin/AdminSidebar.tsx` | 294 | Logo alt text |
| `src/pages/Auth.tsx` | 754-755 | Logo alt i nagłówek |
| `src/pages/MyAccount.tsx` | 425-426, 477-478 | Nagłówki |
| `src/pages/SpecialistCalculator.tsx` | 25, 28 | Logo alt i nagłówek |
| `src/components/calculator/CommissionCalculator.tsx` | 60, 63 | Logo alt i nagłówek |
| `src/components/specialist-calculator/FranchiseUpsell.tsx` | 13 | "partner Pure Life" → "partner Pure Life Center" |
| `src/components/onboarding/TourWelcomeDialog.tsx` | 32 | "Witaj w Pure Life!" → "Witaj w Pure Life Center!" |
| `src/components/cms/ColorSchemeEditor.tsx` | 23 | "Pure Life (Domyślna)" → "Pure Life Center (Domyślna)" |

### Tłumaczenia (`src/hooks/useTranslations.ts`):

| Linia | Język | Zmiana |
|-------|-------|--------|
| 1036 | PL | `Asystent Pure Life` → `Asystent Pure Life Center` |
| 1111 | DE | `Pure Life Assistent` → `Pure Life Center Assistent` |
| 1150 | EN | `Pure Life Assistant` → `Pure Life Center Assistant` |

### Edge Functions (Supabase):

| Plik | Zmiana |
|------|--------|
| `supabase/functions/support-chat/index.ts` | System prompt (linia 47, 51, 52) - "Pure Life" → "Pure Life Center" |
| `supabase/functions/generate-daily-signal/index.ts` | "platformy wellness Pure Life" → "platformy wellness Pure Life Center" (linia 42) |
| `supabase/functions/send-webinar-email/index.ts` | **BEZ ZMIAN** - używa "Zespół Pure Life" (linia 289) |
| `supabase/functions/send-webinar-confirmation/index.ts` | **BEZ ZMIAN** - używa "Zespół Pure Life" (linia 307) |
| `supabase/functions/send-certificate-email/index.ts` | **BEZ ZMIAN** - używa "Zespół Pure Life" (linia 363) |

### Szablony email (BEZ ZMIAN - używają "Zespół"):

| Plik | Status |
|------|--------|
| `src/components/admin/EmailBlockInserter.tsx` | **BEZ ZMIAN** - "Zespół Pure Life" (linia 413) |
| `src/components/admin/email-editor/defaultBlocks.ts` | **BEZ ZMIAN** - "Zespół Pure Life" (linie 94, 95) |

### Onboarding (BEZ ZMIAN - używa "zespołu"):

| Plik | Status |
|------|--------|
| `src/components/onboarding/tourSteps.ts` | **BEZ ZMIAN** - "od zespołu Pure Life" (linia 165) |

### Formularz opiekuna (BEZ ZMIAN - używa "Zespołu"):

| Plik | Status |
|------|--------|
| `src/components/auth/GuardianSearchInput.tsx` | **BEZ ZMIAN** - "Specjalista Zespołu Pure Life" (linia 92) |

---

## Część 2: Optymalizacja meta tagów OG dla WhatsApp

### Aktualizacja `index.html`:

```html
<title>Pure Life Center - Zmieniamy życie i zdrowie ludzi na lepsze</title>
<meta name="description" content="Pure Life Center - Zmieniamy życie i zdrowie ludzi na lepsze. Centrum wsparcia dla partnerów i specjalistów." />
<meta name="author" content="Pure Life Center" />
<meta name="keywords" content="Pure Life Center, omega-3, zdrowie, wellness, partner, specjalista" />

<meta property="og:title" content="Pure Life Center" />
<meta property="og:description" content="Zmieniamy życie i zdrowie ludzi na lepsze" />
<meta property="og:type" content="website" />
<meta property="og:url" content="https://purelife.info.pl" />
<meta property="og:image" content="[URL z page_settings.og_image_url]" />
<meta property="og:site_name" content="Pure Life Center" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Pure Life Center" />
<meta name="twitter:description" content="Zmieniamy życie i zdrowie ludzi na lepsze" />
<meta name="twitter:image" content="[URL z page_settings.og_image_url]" />
```

### Migracja bazy danych - nowe kolumny w `page_settings`:

```sql
ALTER TABLE page_settings 
ADD COLUMN IF NOT EXISTS og_title TEXT DEFAULT 'Pure Life Center',
ADD COLUMN IF NOT EXISTS og_description TEXT DEFAULT 'Zmieniamy życie i zdrowie ludzi na lepsze',
ADD COLUMN IF NOT EXISTS og_site_name TEXT DEFAULT 'Pure Life Center',
ADD COLUMN IF NOT EXISTS og_url TEXT DEFAULT 'https://purelife.info.pl';

UPDATE page_settings 
SET 
  og_title = 'Pure Life Center',
  og_description = 'Zmieniamy życie i zdrowie ludzi na lepsze',
  og_site_name = 'Pure Life Center',
  og_url = 'https://purelife.info.pl'
WHERE page_type = 'homepage';
```

### Rozszerzenie hooka `useDynamicMetaTags.ts`:

Dodanie obsługi nowych kolumn:
- Pobieranie `og_title`, `og_description`, `og_site_name`, `og_url` z bazy
- Dynamiczna aktualizacja meta tagów w document.head
- Obsługa fallbacków do wartości domyślnych

---

## Podsumowanie zmian

### Pliki do modyfikacji (17 plików):

**Frontend React:**
1. `index.html`
2. `src/components/Header.tsx`
3. `src/components/homepage/Footer.tsx`
4. `src/components/dashboard/DashboardSidebar.tsx`
5. `src/components/dashboard/widgets/DashboardFooterSection.tsx`
6. `src/components/admin/AdminSidebar.tsx`
7. `src/pages/Auth.tsx`
8. `src/pages/MyAccount.tsx`
9. `src/pages/SpecialistCalculator.tsx`
10. `src/components/calculator/CommissionCalculator.tsx`
11. `src/components/specialist-calculator/FranchiseUpsell.tsx`
12. `src/components/onboarding/TourWelcomeDialog.tsx`
13. `src/components/cms/ColorSchemeEditor.tsx`
14. `src/hooks/useTranslations.ts`
15. `src/hooks/useDynamicMetaTags.ts`

**Backend (Edge Functions):**
16. `supabase/functions/support-chat/index.ts`
17. `supabase/functions/generate-daily-signal/index.ts`

### Pliki BEZ ZMIAN (zachowują "Zespół Pure Life"):
- `src/components/homepage/TeamSection.tsx` - "Zespół Pure Life"
- `src/components/admin/EmailBlockInserter.tsx` - "Zespół Pure Life"
- `src/components/admin/email-editor/defaultBlocks.ts` - "Zespół Pure Life"
- `src/components/onboarding/tourSteps.ts` - "od zespołu Pure Life"
- `src/components/auth/GuardianSearchInput.tsx` - "Zespołu Pure Life"
- `supabase/functions/send-webinar-email/index.ts` - "Zespół Pure Life"
- `supabase/functions/send-webinar-confirmation/index.ts` - "Zespół Pure Life"
- `supabase/functions/send-certificate-email/index.ts` - "Zespół Pure Life"

---

## Oczekiwane rezultaty

1. **Branding platformy**: Wszystkie wizualne wystąpienia "Pure Life" (bez "Zespół") zmienione na "Pure Life Center"
2. **Zachowany Zespół**: Wszystkie miejsca z "Zespół Pure Life" pozostają bez zmian
3. **WhatsApp preview** pokazuje:
   - Logo: pobrane z `page_settings.og_image_url`
   - Tytuł: "Pure Life Center"
   - Opis: "Zmieniamy życie i zdrowie ludzi na lepsze"
4. **Dynamiczna konfiguracja**: Admin może zmienić OG tagi przez bazę danych
