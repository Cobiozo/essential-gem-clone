
# Plan: Moduł "Zdrowa Wiedza" z systemem OTP

## Cel

Stworzenie bezpiecznego modułu do udostępniania materiałów edukacyjnych (multimedia, dokumenty tekstowe) z:
- Kontrolą widoczności per rola użytkownika
- Niezależnym systemem kodów OTP do udostępniania materiałów osobom spoza platformy
- Możliwością generowania spersonalizowanych wiadomości z kodem dostępu
- Pełną izolacją od istniejącego systemu InfoLinków

## Architektura rozwiązania

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    MODUŁ "ZDROWA WIEDZA"                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐    ┌────────────────────┐    ┌────────────────┐ │
│  │ Panel Admin   │───▶│ healthy_knowledge  │◀───│ Frontend       │ │
│  │ (zarządzanie) │    │ (tabela główna)    │    │ /zdrowa-wiedza │ │
│  └───────────────┘    └────────────────────┘    └────────────────┘ │
│                              │                         │           │
│                              ▼                         ▼           │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │                 SYSTEM OTP (niezależny)                        ││
│  ├────────────────────────────────────────────────────────────────┤│
│  │  ┌──────────────────┐   ┌──────────────────────────────────┐  ││
│  │  │ hk_otp_codes     │──▶│ hk_otp_sessions                  │  ││
│  │  │ (kody dostępu)   │   │ (sesje zewnętrznych użytkowników)│  ││
│  │  └──────────────────┘   └──────────────────────────────────┘  ││
│  │         ▲                                                      ││
│  │         │                                                      ││
│  │  ┌──────────────────┐   ┌──────────────────────────────────┐  ││
│  │  │ Edge Function:   │   │ Edge Function:                   │  ││
│  │  │ generate-hk-otp  │   │ validate-hk-otp / verify-hk-sess │  ││
│  │  └──────────────────┘   └──────────────────────────────────┘  ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Strona publiczna: /zdrowa-wiedza/:slug                      │  │
│  │  (weryfikacja OTP + wyświetlanie treści)                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Zmiany w bazie danych

### 1. Tabela główna: `healthy_knowledge`

```sql
CREATE TABLE public.healthy_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Podstawowe informacje
  title TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  
  -- Typ i źródło materiału
  content_type TEXT NOT NULL DEFAULT 'document', -- 'video', 'audio', 'document', 'image', 'text'
  media_url TEXT,           -- URL do pliku w storage
  text_content TEXT,        -- Treść tekstowa (dla typu 'text')
  file_name TEXT,
  file_size INTEGER,
  duration_seconds INTEGER, -- Dla video/audio
  
  -- Widoczność (role wewnątrz platformy)
  visible_to_admin BOOLEAN DEFAULT true,
  visible_to_partner BOOLEAN DEFAULT false,
  visible_to_client BOOLEAN DEFAULT false,
  visible_to_specjalista BOOLEAN DEFAULT false,
  visible_to_everyone BOOLEAN DEFAULT false,
  
  -- Ustawienia OTP (dla udostępniania zewnętrznego)
  allow_external_share BOOLEAN DEFAULT false,  -- Czy można udostępniać na zewnątrz
  otp_validity_hours INTEGER DEFAULT 24,       -- Ważność kodu OTP
  otp_max_sessions INTEGER DEFAULT 3,          -- Max użyć jednego kodu
  share_message_template TEXT,                 -- Szablon wiadomości do wysłania
  
  -- Metadane
  category TEXT,
  tags TEXT[],
  position INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indeksy
CREATE INDEX idx_healthy_knowledge_slug ON healthy_knowledge(slug);
CREATE INDEX idx_healthy_knowledge_active ON healthy_knowledge(is_active);
CREATE INDEX idx_healthy_knowledge_position ON healthy_knowledge(position);
```

### 2. Tabela kodów OTP: `hk_otp_codes`

```sql
CREATE TABLE public.hk_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES healthy_knowledge(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES auth.users(id),  -- Kto wygenerował kod
  
  code TEXT NOT NULL UNIQUE,             -- Format: ZW-XXXX-XX (unikalne globalnie)
  expires_at TIMESTAMPTZ NOT NULL,
  is_invalidated BOOLEAN DEFAULT false,
  used_sessions INTEGER DEFAULT 0,
  
  -- Opcjonalne: dane odbiorcy
  recipient_name TEXT,
  recipient_email TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy
CREATE INDEX idx_hk_otp_codes_code ON hk_otp_codes(code);
CREATE INDEX idx_hk_otp_codes_knowledge ON hk_otp_codes(knowledge_id);
CREATE INDEX idx_hk_otp_codes_partner ON hk_otp_codes(partner_id);
CREATE INDEX idx_hk_otp_codes_expires ON hk_otp_codes(expires_at);
```

### 3. Tabela sesji: `hk_otp_sessions`

```sql
CREATE TABLE public.hk_otp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  otp_code_id UUID NOT NULL REFERENCES hk_otp_codes(id) ON DELETE CASCADE,
  
  session_token TEXT NOT NULL UNIQUE,
  device_fingerprint TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indeksy
CREATE INDEX idx_hk_sessions_token ON hk_otp_sessions(session_token);
CREATE INDEX idx_hk_sessions_expires ON hk_otp_sessions(expires_at);
```

### 4. Polityki RLS

```sql
-- healthy_knowledge: widoczność per rola
ALTER TABLE healthy_knowledge ENABLE ROW LEVEL SECURITY;

-- Admin: pełen dostęp
CREATE POLICY "Admin full access" ON healthy_knowledge
  FOR ALL TO authenticated
  USING (public.is_admin());

-- Czytanie dla ról (z uwzględnieniem visible_to_*)
CREATE POLICY "Role-based read" ON healthy_knowledge
  FOR SELECT TO authenticated
  USING (
    is_active = true AND (
      visible_to_everyone = true OR
      (visible_to_partner = true AND public.has_role(auth.uid(), 'partner')) OR
      (visible_to_client = true AND (public.has_role(auth.uid(), 'client') OR public.has_role(auth.uid(), 'user'))) OR
      (visible_to_specjalista = true AND public.has_role(auth.uid(), 'specjalista'))
    )
  );

-- hk_otp_codes: partner widzi tylko swoje
ALTER TABLE hk_otp_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partner sees own codes" ON hk_otp_codes
  FOR SELECT TO authenticated
  USING (partner_id = auth.uid() OR public.is_admin());

CREATE POLICY "Partner creates codes" ON hk_otp_codes
  FOR INSERT TO authenticated
  WITH CHECK (partner_id = auth.uid());

CREATE POLICY "Admin manages all codes" ON hk_otp_codes
  FOR ALL TO authenticated
  USING (public.is_admin());

-- hk_otp_sessions: dostęp tylko przez Edge Functions (service role)
ALTER TABLE hk_otp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON hk_otp_sessions
  FOR ALL TO service_role
  USING (true);
```

## Edge Functions

### 1. `generate-hk-otp` (generowanie kodu dla materiału)

```typescript
// Plik: supabase/functions/generate-hk-otp/index.ts

// Generuje kod w formacie ZW-XXXX-XX (ZW = Zdrowa Wiedza)
function generateOTPCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'ZW-';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  code += '-';
  for (let i = 0; i < 2; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Endpoint przyjmuje: { knowledge_id, recipient_name?, recipient_email? }
// Zwraca: { success, otp_code, expires_at, clipboard_message, share_url }
```

### 2. `validate-hk-otp` (walidacja kodu i tworzenie sesji)

```typescript
// Plik: supabase/functions/validate-hk-otp/index.ts

// Endpoint przyjmuje: { knowledge_slug, otp_code, device_fingerprint }
// Zwraca: { success, session_token, expires_at, content }
```

### 3. `verify-hk-session` (weryfikacja aktywnej sesji)

```typescript
// Plik: supabase/functions/verify-hk-session/index.ts

// Endpoint przyjmuje: { session_token, knowledge_slug }
// Zwraca: { valid, expires_at, remaining_seconds, content }
```

## Nowe komponenty React

### 1. Panel administracyjny: `HealthyKnowledgeManagement.tsx`

Lokalizacja: `src/components/admin/HealthyKnowledgeManagement.tsx`

Funkcjonalności:
- Lista materiałów z filtrowaniem/wyszukiwaniem
- Formularz dodawania/edycji materiału (upload plików)
- Edytor widoczności per rola
- Edytor szablonu wiadomości do udostępniania
- Podgląd materiału
- Statystyki (view_count, ilość wygenerowanych kodów)

### 2. Strona użytkownika: `HealthyKnowledge.tsx`

Lokalizacja: `src/pages/HealthyKnowledge.tsx`
Route: `/zdrowa-wiedza`

Funkcjonalności:
- Lista materiałów dostępnych dla roli użytkownika
- Karty z podglądem (tytuł, opis, typ, miniaturka)
- Przycisk "Udostępnij" (generuje OTP + kopiuje wiadomość)
- Dialog z edytowalnym szablonem wiadomości przed wysłaniem
- Odtwarzacz video/audio
- Wyświetlanie dokumentów/obrazów

### 3. Strona publiczna: `HealthyKnowledgePage.tsx`

Lokalizacja: `src/pages/HealthyKnowledgePage.tsx`
Route: `/zdrowa-wiedza/:slug`

Funkcjonalności:
- Formularz wprowadzania kodu OTP (format ZW-XXXX-XX)
- Po walidacji: wyświetlenie treści (video/dokument/tekst)
- Timer odliczający pozostały czas sesji
- Animacja potwierdzenia (confetti)
- Obsługa różnych typów mediów

### 4. Widget dashboardu: `HealthyKnowledgeWidget.tsx`

Lokalizacja: `src/components/dashboard/widgets/HealthyKnowledgeWidget.tsx`

Funkcjonalności:
- Wyświetla wyróżnione materiały (is_featured)
- Szybkie linki do /zdrowa-wiedza
- Licznik nowych materiałów

### 5. Widget aktywnych kodów: `ActiveHkCodesWidget.tsx`

Lokalizacja: `src/components/dashboard/widgets/ActiveHkCodesWidget.tsx`

Funkcjonalności:
- Lista aktywnych kodów OTP wygenerowanych przez partnera
- Możliwość unieważnienia kodu
- Status (aktywny/wygasły/wykorzystany)

## Struktura plików

```text
src/
├── pages/
│   ├── HealthyKnowledge.tsx         # Lista materiałów (zalogowani)
│   └── HealthyKnowledgePage.tsx     # Strona z OTP (publiczna)
├── components/
│   ├── admin/
│   │   ├── HealthyKnowledgeManagement.tsx  # Panel admina
│   │   └── HkOtpCodesManagement.tsx        # Zarządzanie kodami OTP
│   └── dashboard/widgets/
│       ├── HealthyKnowledgeWidget.tsx      # Widget na dashboard
│       └── ActiveHkCodesWidget.tsx         # Aktywne kody OTP
├── types/
│   └── healthyKnowledge.ts          # Typy TypeScript
supabase/
├── functions/
│   ├── generate-hk-otp/
│   │   └── index.ts
│   ├── validate-hk-otp/
│   │   └── index.ts
│   └── verify-hk-session/
│       └── index.ts
└── config.toml                      # Konfiguracja funkcji
```

## Routing w App.tsx

```tsx
// Nowe route
<Route path="/zdrowa-wiedza" element={<HealthyKnowledge />} />
<Route path="/zdrowa-wiedza/:slug" element={<HealthyKnowledgePage />} />
```

## Integracja z istniejącym systemem

### AdminSidebar.tsx

Dodanie nowej pozycji w menu admina:
```tsx
{ value: 'healthy-knowledge', labelKey: 'admin.menu.healthyKnowledge', icon: Heart }
```

### DashboardSidebar.tsx

Dodanie pozycji w menu dashboardu:
```tsx
{ path: '/zdrowa-wiedza', label: 'Zdrowa Wiedza', icon: Heart }
```

### Dashboard.tsx

Dodanie widgetu:
```tsx
<HealthyKnowledgeWidget />
<ActiveHkCodesWidget />  // Dla partnerów
```

## Bezpieczeństwo

| Warstwa | Mechanizm |
|---------|-----------|
| Baza danych | RLS policies - dostęp per rola |
| Kody OTP | Unikalny prefix "ZW-" (brak kolizji z InfoLink "PL-") |
| Sesje | Walidacja server-side przez Edge Functions |
| Pliki | Supabase Storage z signed URLs |
| Frontend | Sprawdzanie roli przed renderowaniem komponentów |

### Izolacja od InfoLinków

- **Osobne tabele**: `hk_otp_codes` vs `infolink_otp_codes`
- **Osobne sesje**: `hk_otp_sessions` vs `infolink_sessions`
- **Różne prefixy kodów**: `ZW-XXXX-XX` vs `PL-XXXX-XX`
- **Osobne Edge Functions**: `generate-hk-otp` vs `generate-infolink-otp`
- **Osobne routes**: `/zdrowa-wiedza/:slug` vs `/infolink/:slug`

## Przepływ użytkownika

### Partner udostępnia materiał:

```text
1. Partner wchodzi na /zdrowa-wiedza
2. Wybiera materiał z listą allow_external_share=true
3. Klika "Udostępnij"
4. Otwiera się dialog z edytowalnym szablonem wiadomości
5. Klika "Generuj kod i kopiuj"
6. Edge Function generuje kod ZW-XXXX-XX
7. Wiadomość z linkiem + kodem kopiowana do schowka
8. Partner wysyła wiadomość (email/SMS/messenger)
```

### Odbiorca zewnętrzny:

```text
1. Odbiorca klika link: purelife.lovable.app/zdrowa-wiedza/nazwa-materialu
2. Widzi formularz OTP
3. Wpisuje kod ZW-XXXX-XX
4. Edge Function waliduje kod i tworzy sesję
5. Widzi treść materiału (video/dokument/tekst)
6. Sesja wygasa po X godzinach
```

## Kategorie materiałów

```typescript
const HEALTHY_KNOWLEDGE_CATEGORIES = [
  'Zdrowie ogólne',
  'Suplementacja',
  'Odżywianie',
  'Aktywność fizyczna',
  'Wellbeing',
  'Produkty EQ',
  'Webinary archiwalne',
  'Materiały eksperckie',
  'Inne'
];
```

## Typy materiałów

```typescript
type ContentType = 'video' | 'audio' | 'document' | 'image' | 'text';
```

## Sekcja techniczna

### Typy TypeScript

```typescript
// src/types/healthyKnowledge.ts

export interface HealthyKnowledge {
  id: string;
  title: string;
  description: string | null;
  slug: string;
  content_type: 'video' | 'audio' | 'document' | 'image' | 'text';
  media_url: string | null;
  text_content: string | null;
  file_name: string | null;
  file_size: number | null;
  duration_seconds: number | null;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_client: boolean;
  visible_to_specjalista: boolean;
  visible_to_everyone: boolean;
  allow_external_share: boolean;
  otp_validity_hours: number;
  otp_max_sessions: number;
  share_message_template: string | null;
  category: string | null;
  tags: string[];
  position: number;
  is_active: boolean;
  is_featured: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface HkOtpCode {
  id: string;
  knowledge_id: string;
  partner_id: string;
  code: string;
  expires_at: string;
  is_invalidated: boolean;
  used_sessions: number;
  recipient_name: string | null;
  recipient_email: string | null;
  created_at: string;
  // Relacje
  healthy_knowledge?: HealthyKnowledge;
  partner?: { full_name: string; email: string };
}

export interface HkOtpSession {
  id: string;
  otp_code_id: string;
  session_token: string;
  device_fingerprint: string | null;
  expires_at: string;
  created_at: string;
  last_activity_at: string;
}
```

### Szablon wiadomości (domyślny)

```text
Cześć!

Mam dla Ciebie ciekawy materiał: "{title}"

{description}

Wejdź na link poniżej i użyj kodu dostępu:

🔗 Link: {share_url}
🔑 Kod dostępu: {otp_code}

⏰ Kod ważny przez {validity_hours} godzin.

Pozdrawiam,
{partner_name}
```

### Storage bucket

```sql
-- Bucket dla materiałów Zdrowa Wiedza
INSERT INTO storage.buckets (id, name, public)
VALUES ('healthy-knowledge', 'healthy-knowledge', false);

-- Polityka: tylko admin może uploadować
CREATE POLICY "Admin upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'healthy-knowledge' AND
    public.is_admin()
  );

-- Polityka: signed URLs przez Edge Functions
CREATE POLICY "Authenticated read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'healthy-knowledge');
```

## Podsumowanie zmian

| Kategoria | Elementy |
|-----------|----------|
| **Baza danych** | 3 nowe tabele + RLS + storage bucket |
| **Edge Functions** | 3 nowe funkcje (generate, validate, verify) |
| **Strony** | 2 nowe (`/zdrowa-wiedza`, `/zdrowa-wiedza/:slug`) |
| **Komponenty admin** | 2 nowe (management + OTP codes) |
| **Widgety dashboard** | 2 nowe (materiały + aktywne kody) |
| **Typy** | 1 nowy plik TypeScript |
| **Routing** | 2 nowe route w App.tsx |
| **Nawigacja** | Wpisy w AdminSidebar + DashboardSidebar |

## Kolejność implementacji

1. **Migracje SQL** - tabele, indeksy, RLS, storage
2. **Typy TypeScript** - definicje interfejsów
3. **Edge Functions** - generowanie i walidacja OTP
4. **Panel admina** - HealthyKnowledgeManagement
5. **Strona użytkownika** - HealthyKnowledge (lista)
6. **Strona publiczna** - HealthyKnowledgePage (OTP)
7. **Widgety dashboard** - integracja
8. **Routing** - wpisy w App.tsx
9. **Nawigacja** - menu w sidebarach
10. **Testy** - weryfikacja przepływu

