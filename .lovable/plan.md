

# Panel konfiguracji dostawcy AI w CMS Admina

## Koncepcja
Nowa zakładka "Dostawca AI" w sekcji System panelu admina. Pozwala na szybką zmianę dostawcy AI bez modyfikacji kodu. **Domyślnie** system używa Lovable AI Gateway (jak dotychczas) — konfiguracja w panelu jest opcjonalnym override.

## Zmiany

### 1. Migracja — tabela `ai_provider_config`

```sql
CREATE TABLE public.ai_provider_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name text NOT NULL DEFAULT 'Lovable AI Gateway',
  api_url text NOT NULL DEFAULT 'https://ai.gateway.lovable.dev/v1/chat/completions',
  api_key_encrypted text, -- NULL = użyj LOVABLE_API_KEY
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  is_active boolean NOT NULL DEFAULT false,
  last_test_at timestamptz,
  last_test_result boolean,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tylko 1 rekord aktywny
CREATE UNIQUE INDEX idx_ai_provider_single_active 
  ON ai_provider_config (is_active) WHERE is_active = true;

-- RLS: tylko admin
ALTER TABLE ai_provider_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access" ON ai_provider_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

Gdy `is_active = false` lub tabela pusta → edge functions używają `LOVABLE_API_KEY` + domyślny gateway (zero zmian w działaniu).

### 2. Shared helper — `supabase/functions/_shared/ai-provider.ts`

Funkcja `getAIConfig(supabase)` zwraca `{ apiUrl, apiKey, model }`:
- Pobiera z `ai_provider_config` gdzie `is_active = true`
- Jeśli brak aktywnego rekordu → fallback: `LOVABLE_API_KEY` + `ai.gateway.lovable.dev` + `gemini-2.5-flash`
- Deszyfruje `api_key_encrypted` za pomocą `pgcrypto` i secretu `AI_ENCRYPTION_KEY`

### 3. Aktualizacja 8 edge functions

Każda z 8 funkcji (`medical-assistant`, `support-chat`, `ai-compass`, `search-specialists`, `translate-content`, `background-translate`, `generate-daily-signal`, `generate-certificate-background`) dostanie minimalne zmiany:

```typescript
// PRZED:
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({ model: 'google/gemini-2.5-flash', ... }),
});

// PO:
import { getAIConfig } from '../_shared/ai-provider.ts';
const aiConfig = await getAIConfig(supabase);
const response = await fetch(aiConfig.apiUrl, {
  headers: { 'Authorization': `Bearer ${aiConfig.apiKey}` },
  body: JSON.stringify({ model: aiConfig.model, ... }),
});
```

Jeśli `getAIConfig` nie znajdzie aktywnej konfiguracji — zwraca dokładnie to co teraz (Lovable Gateway). **Zero zmian w zachowaniu bez aktywacji.**

### 4. Edge function `test-ai-provider`

Nowa funkcja do testowania połączenia. Przyjmuje `{ api_url, api_key, model }`, wysyła prosty prompt "Say hello" i zwraca sukces/błąd + czas odpowiedzi.

### 5. Komponent admina — `AiProviderManagement.tsx`

Formularz z polami:
- **Nazwa dostawcy** (text) — np. "OpenAI", "Google Gemini Direct"
- **API URL** (text) — np. `https://api.openai.com/v1/chat/completions`
- **Klucz API** (password input) — maskowany, szyfrowany w bazie
- **Model** (text) — np. `gpt-4o`, `gemini-2.5-flash`
- **Aktywny** (switch) — włącza/wyłącza override

Przyciski:
- **Testuj połączenie** — wywołuje `test-ai-provider`, pokazuje wynik
- **Zapisz** — upsert do `ai_provider_config`

Predefiniowane szablony (dropdown):
- Lovable AI Gateway (domyślny)
- OpenAI (`https://api.openai.com/v1/chat/completions`)
- Google Gemini (`https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`)
- Groq (`https://api.groq.com/openai/v1/chat/completions`)

Ważny komunikat w UI: "Wyłączenie tej opcji przywraca domyślne korzystanie z Lovable AI Gateway."

### 6. Sidebar — nowy wpis

W grupie "System" w `AdminSidebar.tsx`: dodać `{ value: 'ai-provider', labelKey: 'aiProvider', icon: Sparkles }`.

### 7. Szyfrowanie kluczy

- Migracja tworzy funkcję SQL `encrypt_api_key(key text)` i `decrypt_api_key(encrypted text)` używając `pgcrypto` + secret z Vault
- Edge functions deszyfrują klucz w runtime przez `supabase.rpc('decrypt_api_key', { encrypted })`
- Klucz szyfrujący: nowy secret `AI_ENCRYPTION_KEY` w Supabase Vault

## Co się NIE zmienia
- Wszystkie edge functions działają identycznie jak dotychczas gdy `is_active = false`
- `LOVABLE_API_KEY` pozostaje jako domyślny fallback
- Żaden istniejący flow nie jest modyfikowany

## Pliki do utworzenia/zmiany
| Plik | Akcja |
|------|-------|
| Migracja SQL | Nowa tabela + funkcje szyfrowania |
| `supabase/functions/_shared/ai-provider.ts` | Nowy shared helper |
| `supabase/functions/test-ai-provider/index.ts` | Nowa edge function |
| `src/components/admin/AiProviderManagement.tsx` | Nowy komponent |
| `src/components/admin/AdminSidebar.tsx` | Dodać wpis |
| `src/pages/Admin.tsx` | Import + renderowanie |
| 8 × edge functions | Zamiana hardcoded na `getAIConfig()` |

