

# Plan: Trzy ulepszenia stron partnerów

## 1. Upload obrazów z urządzenia w edytowalnych polach

**Problem:** Pola `image_url` i `hero_image_url` w edytorze inline (`EditableWrapper.tsx`) i edytorze bocznym (`PartnerPageInlineEditor.tsx`) używają zwykłego `<Input>` tekstowego — partner musi wkleić URL. Brak opcji przesłania pliku z komputera/telefonu.

**Rozwiązanie:** Dla pól zawierających `image` lub `logo` w nazwie (np. `image_url`, `hero_image_url`, `logo_image_url`) — renderować komponent z podwójną opcją: Input URL + przycisk Upload (korzystając z istniejącego bucketu `landing-images` w Supabase Storage).

**Pliki do zmiany:**
- `src/components/partner-page/EditableWrapper.tsx` — dodać `ImageUploadField` z `landing-images` bucket dla pól image/logo. Zamiast zwykłego `<Input>`, renderować Input + przycisk Upload (wzorowany na `ImageUploadField.tsx` z leader block-editors).
- `src/components/partner-page/PartnerPageInlineEditor.tsx` — analogiczna zmiana dla pól image w edytorze bocznym.

---

## 2. Wysyłka e-mail do partnera po wypełnieniu formularza

**Problem:** `ContactFormSection.tsx` symuluje wysyłkę (`setTimeout 800ms`) i nie wysyła żadnego e-maila. Po wypełnieniu formularza dane znikają.

**Rozwiązanie:** 
- Dodać prop `partnerEmail` do `ContactFormSection` i `ProductsWithFormSection`.
- Po submit formularza wywołać Edge Function `send-single-email` z treścią formularza na adres e-mail partnera.
- Pobrać e-mail partnera z tabeli `profiles` (kolumna `email`) na podstawie `user_id` ze strony partnerskiej.

**Pliki do zmiany:**
- `src/components/partner-page/sections/ContactFormSection.tsx` — dodać prop `partnerEmail`, wywołać `supabase.functions.invoke('send-single-email', ...)` z danymi formularza.
- `src/components/partner-page/sections/ProductsWithFormSection.tsx` — przekazać `partnerEmail` do `ContactFormSection`.
- `src/pages/PartnerPage.tsx` — pobrać e-mail właściciela z `profiles` i przekazać go do sekcji formularza.

---

## 3. Social media — edytowalne linki partnera

**Problem:** Footer ma hardkodowane linki social media w szablonie (`social: [{platform: "facebook", url: "https://facebook.com/purelife"}, ...]`). Partner nie może dodać swoich linków do FB, IG, LinkedIn, WhatsApp, Telegram itp.

**Rozwiązanie:**
- Dodać `editable_fields` do footera w szablonie: `["social.facebook", "social.instagram", "social.linkedin", "social.messenger"]` — każde pole to URL konkretnej platformy.
- W `EditableWrapper` i `PartnerPageInlineEditor` obsłużyć pola `social.*` — renderować input URL dla każdej platformy.
- W `FooterSection` mergować domyślne linki z szablonu z override'ami partnera z `custom_data`.
- Dodać platformy WhatsApp i Telegram do `SOCIAL_ICONS` i `SOCIAL_COLORS`.

**Pliki do zmiany:**
- `src/components/partner-page/sections/FooterSection.tsx` — dodać WhatsApp i Telegram ikony, mergować social z overrides.
- `src/components/partner-page/EditableWrapper.tsx` — obsługa pól `social.*`.
- `src/components/partner-page/PartnerPageInlineEditor.tsx` — obsługa pól `social.*`.
- Migracja SQL — dodać `editable_fields` do bloku footer w szablonie PureLifeCenter2026.
- `src/lib/mergePartnerConfig.ts` — dodać labele dla pól `social.*`.

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `EditableWrapper.tsx` | Upload obrazów + social URL fields |
| `PartnerPageInlineEditor.tsx` | Upload obrazów + social URL fields |
| `ContactFormSection.tsx` | Wysyłka email do partnera |
| `ProductsWithFormSection.tsx` | Przekazanie partnerEmail |
| `FooterSection.tsx` | WhatsApp/Telegram ikony, merge social overrides |
| `PartnerPage.tsx` | Pobranie email partnera, przekazanie do sekcji |
| `mergePartnerConfig.ts` | Labele dla social.* |
| Migracja SQL | editable_fields footera + social platforms |

