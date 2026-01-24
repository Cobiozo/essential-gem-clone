

# Plan: Bezpieczne linki ZW + Zarządzanie kodami

## Rekomendowane rozwiązanie

Po analizie **wybieram zachowanie czytelnego URL z wymuszeniem kodu OTP** jako najlepsze rozwiązanie. Powody:

1. **Obecny system już wymaga kodu OTP** - samo poznanie URL `/zdrowa-wiedza/{slug}` nie daje dostępu
2. **Prostsze wdrożenie** - nie trzeba generować tokenów i zarządzać dodatkowymi parametrami
3. **Lepszy UX** - użytkownik widzi przyjazny URL z nazwą materiału
4. **Bezpieczeństwo zachowane** - dostęp tylko z ważnym kodem OTP, po wygaśnięciu brak dostępu

Jedyna potrzebna zmiana w linkach to **naprawa domeny** na `purelife.info.pl`.

---

## Zakres zmian

### 1. Naprawa domeny w linkach

**Plik:** `supabase/functions/generate-hk-otp/index.ts`

Zamiana:
```typescript
// PRZED (linia 152):
const shareUrl = `${supabaseUrl.replace('.supabase.co', '.lovable.app')}/zdrowa-wiedza/${knowledge.slug}`;

// PO:
const { data: settingsData } = await supabaseAdmin
  .from('page_settings')
  .select('app_base_url')
  .limit(1)
  .maybeSingle();

const baseUrl = settingsData?.app_base_url || 'https://purelife.info.pl';
const shareUrl = `${baseUrl}/zdrowa-wiedza/${knowledge.slug}`;
```

**Aktualizacja w bazie danych:**
```sql
UPDATE page_settings 
SET app_base_url = 'https://purelife.info.pl'
WHERE app_base_url = 'https://purelife.lovable.app';
```

---

### 2. Rozszerzenie tabeli `hk_otp_codes`

Nowe kolumny dla soft-delete użytkownika:

```sql
ALTER TABLE hk_otp_codes 
ADD COLUMN is_deleted_by_user BOOLEAN DEFAULT false,
ADD COLUMN deleted_by_user_at TIMESTAMPTZ;
```

---

### 3. Historia kodów użytkownika

**Nowy komponent:** `src/components/healthy-knowledge/MyHkCodesHistory.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│ 📋 Moje kody Zdrowej Wiedzy                                 │
├─────────────────────────────────────────────────────────────┤
│ [Aktywne (3)] [Archiwum (12)]                               │
├─────────────────────────────────────────────────────────────┤
│ 🔍 Szukaj po odbiorcy, materiale...                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ZW-AB12-CD   │ Testowanie Zdrowa Wiedza                 │ │
│ │ Odbiorca: Jan Kowalski         │ ⏰ 23h │ 1/3 sesji    │ │
│ │ [📋 Kopiuj link] [📋 Kopiuj wiadomość] [🗑️ Usuń]       │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ZW-XY34-ZZ   │ Podstawy suplementacji    │ ⏳ Wygasły   │ │
│ │ Odbiorca: Anna Nowak           │ 3/3 sesji              │ │
│ │ [🗑️ Usuń z historii]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Funkcje:**
- Zakładka "Aktywne" - kody niewygasłe, nieunieważnione
- Zakładka "Archiwum" - wygasłe lub unieważnione
- Kopiowanie linku i pełnej wiadomości do schowka
- Soft-delete (usuwa tylko z widoku użytkownika, admin nadal widzi)
- Wyszukiwanie po nazwie odbiorcy/materiale

**Integracja z MyAccount:**
- Nowa zakładka "Moje kody ZW" widoczna dla partnerów i adminów

---

### 4. Panel admina - rozszerzenie

**Rozbudowa:** `src/components/admin/HealthyKnowledgeManagement.tsx`

Obecna zakładka "Kody OTP" zostanie rozbudowana o:

```
┌─────────────────────────────────────────────────────────────────────┐
│ Kody OTP - Zarządzanie                                              │
├─────────────────────────────────────────────────────────────────────┤
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ Wszystkie    │ │ Aktywne      │ │ Wykorzystane │ │ Wygasłe      │ │
│ │    247       │ │     45       │ │    156       │ │     46       │ │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│ Filtruj: [Rola ▼] [Materiał ▼] [Status ▼]                           │
│ 🔍 Szukaj partnera (imię, email, EQ ID)...                          │
├─────────────────────────────────────────────────────────────────────┤
│ Kod       │ Partner        │ Rola    │ Materiał    │ Status │ Akcje │
│───────────┼────────────────┼─────────┼─────────────┼────────┼───────│
│ ZW-AB12-CD│ Jan Kowalski   │ Partner │ Materiał X  │ Aktywny│ [⋮]   │
│ ZW-XY34-ZZ│ Anna Nowak     │ Admin   │ Materiał Y  │ Wygasły│ [⋮]   │
└─────────────────────────────────────────────────────────────────────┘
```

**Nowa zakładka "Statystyki":**

```
┌─────────────────────────────────────────────────────────────────────┐
│ 📈 Statystyki udostępnień                                           │
├─────────────────────────────────────────────────────────────────────┤
│ Okres: [Ostatnie 7 dni ▼] [30 dni] [Wszystko]                       │
├─────────────────────────────────────────────────────────────────────┤
│ TOP 5 najbardziej aktywnych partnerów:                              │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ 1. Jan Kowalski (Partner) - 45 kodów, 32 użycia               │   │
│ │ 2. Anna Nowak (Admin) - 28 kodów, 21 użyć                     │   │
│ │ 3. Piotr Wiśniewski (Partner) - 15 kodów, 12 użyć             │   │
│ └───────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│ TOP 5 najczęściej udostępnianych materiałów:                        │
│ ┌───────────────────────────────────────────────────────────────┐   │
│ │ 1. "Jak zacząć z EQ" - 78 udostępnień                         │   │
│ │ 2. "Podstawy suplementacji" - 56 udostępnień                  │   │
│ │ 3. "Zdrowy styl życia" - 34 udostępnień                       │   │
│ └───────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│ Podział wg roli:                                                    │
│ [=========Partner 65%=========][====Admin 25%====][Spec 10%]        │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 5. Polityki RLS

```sql
-- Partner widzi tylko swoje kody (oprócz soft-deleted)
CREATE POLICY "Partner can view own codes" ON hk_otp_codes
  FOR SELECT USING (
    partner_id = auth.uid() 
    AND is_deleted_by_user = false
  );

-- Admin widzi wszystkie kody
CREATE POLICY "Admin can view all codes" ON hk_otp_codes
  FOR SELECT USING (public.is_admin());

-- Partner może soft-delete swoje kody
CREATE POLICY "Partner can soft delete own codes" ON hk_otp_codes
  FOR UPDATE USING (partner_id = auth.uid());

-- Admin może wszystko (update, delete)
CREATE POLICY "Admin full access" ON hk_otp_codes
  FOR ALL USING (public.is_admin());
```

---

## Podsumowanie zmian

| Komponent | Typ | Opis |
|-----------|-----|------|
| `generate-hk-otp` | Modyfikacja Edge Function | Pobieranie domeny z `page_settings` |
| `page_settings` | Aktualizacja bazy | Zmiana na `purelife.info.pl` |
| `hk_otp_codes` | Rozszerzenie tabeli | Kolumny soft-delete |
| `MyHkCodesHistory.tsx` | Nowy komponent | Historia kodów użytkownika |
| `MyAccount.tsx` | Modyfikacja | Nowa zakładka "Moje kody ZW" |
| `HealthyKnowledgeManagement.tsx` | Rozszerzenie | Rozbudowany panel kodów + statystyki |
| RLS Policies | Nowe polityki | Kontrola dostępu do kodów |

---

## Przepływ użytkownika (bez zmian)

```
Partner generuje kod ZW-AB12-CD
        ↓
Kopiuje wiadomość z linkiem:
🔗 Link: https://purelife.info.pl/zdrowa-wiedza/testowanie-zdrowa-wiedza
🔑 Kod: ZW-AB12-CD
        ↓
Odbiorca wchodzi na link → widzi formularz kodu OTP
        ↓
Wpisuje kod → dostęp do materiału (max 3 sesje, czas ważności)
        ↓
Po wygaśnięciu kodu → "Kod wygasł" (link działa, ale trzeba nowy kod)
```

Bezpieczeństwo zapewnione przez:
- Wymagany kod OTP do każdego dostępu
- Limit sesji (domyślnie 3)
- Czas ważności kodu (domyślnie 24h)
- Po wygaśnięciu - brak dostępu nawet z tym samym linkiem

