## Cel

1. **Linki udostępniania Bazy Wiedzy** mają zawierać EQ ID partnera, który wygenerował kod — tak aby jednoznacznie identyfikować autora udostępnienia.
2. **Formularz na stronie publicznej** ma być twardo wymagany — żadna metoda (paste, autofill, JS) nie może otworzyć materiału bez wypełnienia imienia, nazwiska, e-maila, telefonu i zaznaczenia zgody.

---

## Zakres zmian

### 1. Link z EQ ID partnera

**`supabase/functions/generate-hk-otp/index.ts`**
- Pobrać `eq_id` z tabeli `profiles` obok `first_name/last_name`.
- Zbudować `shareUrl` w formacie: `${baseUrl}/zdrowa-wiedza/${slug}?ref=${eq_id}` (fallback bez `?ref=` jeśli partner nie ma EQ ID).
- Zapisać `partner_eq_id` w rekordzie `hk_otp_codes` (nowa kolumna — migracja) dla audytu i szybkiego dopasowania po stronie serwera.

**Migracja SQL**
- `ALTER TABLE public.hk_otp_codes ADD COLUMN partner_eq_id text;`
- Backfill z `profiles.eq_id` po `partner_id`.

**`supabase/functions/validate-hk-otp/index.ts`**
- Przyjmować opcjonalny `ref_eq_id` z body i porównać z `hk_otp_codes.partner_eq_id`. W razie niezgodności — log ostrzeżenia (bez blokady, bo link jest głównie identyfikatorem partnera, nie sekretem — sekretem jest OTP).

**`src/pages/HealthyKnowledgePublicPage.tsx`**
- Odczytać `?ref=` z URL i przesłać jako `ref_eq_id` do `validate-hk-otp`.

### 2. Twarde wymuszenie wypełnienia formularza przed użyciem OTP

Aktualnie w `HealthyKnowledgePublicPage.tsx`:
- `handleCodePaste` po wklejeniu automatycznie wywołuje `handleOtpSubmit(cleaned)` **z argumentem `codeOverride`**.
- W `handleOtpSubmit` warunek `if (!isGuestFormValid() && !codeOverride)` — obecność `codeOverride` **omija walidację formularza**. To jest luka.

**Poprawki w `src/pages/HealthyKnowledgePublicPage.tsx`:**
- Usunąć `&& !codeOverride` — walidacja formularza obowiązuje ZAWSZE.
- Usunąć auto-submit po paste — po wklejeniu tylko wypełnić pole; użytkownik musi kliknąć przycisk „Odblokuj materiał" (który sam sprawdza `isGuestFormValid`).
- Pole OTP: `disabled` / `readOnly=false` ale z blokadą submitu, dopóki formularz nie jest kompletny; przycisk submit `disabled` gdy `!isGuestFormValid()`.
- Dodać wizualną informację „Najpierw wypełnij formularz i zaznacz zgodę, aby użyć kodu".

**Zabezpieczenie serwerowe (`validate-hk-otp`)** — nie ufamy klientowi:
- Walidować w edge function obecność i format: `guest_first_name` (min 2), `guest_last_name` (min 2), `guest_email` (regex), `guest_phone` (min 9 cyfr). Brak któregokolwiek → 400 z komunikatem, bez tworzenia sesji.
- (Zgodę traktujemy jako klientowe UX — serwer wymaga tylko kompletu danych; brak danych = brak dostępu.)

---

## Szczegóły techniczne

- Baza: nowa kolumna `partner_eq_id` w `hk_otp_codes` + backfill, bez zmiany RLS.
- Edge Function `generate-hk-otp`: dodaje `eq_id` do SELECT profilu, dokleja `?ref=<eq_id>` do `shareUrl`, zapisuje `partner_eq_id` w insert.
- Edge Function `validate-hk-otp`: wymaga kompletnych danych gościa (twarda walidacja); loguje mismatch `ref_eq_id`.
- Frontend `HealthyKnowledgePublicPage.tsx`: usunięcie auto-submitu po paste, wymuszenie `isGuestFormValid()` niezależnie od źródła kodu, przekazanie `?ref=` do walidacji.
- Frontend `HealthyKnowledge.tsx` — bez zmian (link generuje backend).

## Poza zakresem

- Zmiana wyglądu dialogu udostępniania.
- Zmiana ważności kodów / mechaniki OTP.
- Zmiany w V1/V2 landing page.