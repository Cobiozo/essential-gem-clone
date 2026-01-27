
# Plan: Naprawa błędu 401 w funkcji zoom-check-status

## Diagnoza problemu

Logi pokazują:
```
JWT verification failed: Auth session missing!
```

**Przyczyna**: Funkcja używa `SUPABASE_SERVICE_ROLE_KEY` do klienta weryfikującego JWT. Service role key nie ma kontekstu sesji użytkownika, więc `auth.getUser(token)` zawsze zwraca błąd "Auth session missing!".

**Działające rozwiązanie** (z `cancel-individual-meeting`):
Użyć **SUPABASE_ANON_KEY** do weryfikacji tokenu użytkownika, a dopiero potem service role do operacji bazodanowych.

---

## Rozwiązanie

### Zmiana w pliku `supabase/functions/zoom-check-status/index.ts`

**Linie 26-42 - Zmiana logiki weryfikacji JWT:**

```text
PRZED:
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabase.auth.getUser(token);

PO:
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Użyj ANON_KEY do weryfikacji JWT użytkownika
const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
const token = authHeader.replace('Bearer ', '');
const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

// ...walidacja...

// Użyj SERVICE_ROLE_KEY do operacji bazodanowych
const supabase = createClient(supabaseUrl, supabaseServiceKey);
```

---

## Zmiany szczegółowe

| Lokalizacja | Zmiana |
|-------------|--------|
| Linia ~27 | Dodanie `supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')` |
| Linia ~30 | Utworzenie `supabaseAuth` z anon key do weryfikacji użytkownika |
| Linia ~34 | Weryfikacja tokenu przez `supabaseAuth.auth.getUser(token)` |
| Po weryfikacji | Utworzenie `supabase` z service role key do operacji na bazie danych |

---

## Dlaczego to działa

- **ANON_KEY**: Klucz publiczny który działa z tokenami JWT użytkowników. `auth.getUser(token)` weryfikuje token względem serwera autoryzacji.
- **SERVICE_ROLE_KEY**: Klucz administratora który omija RLS, ale nie ma kontekstu sesji użytkownika. Używamy go tylko do operacji bazodanowych po pomyślnej weryfikacji.

---

## Oczekiwany rezultat

Po wdrożeniu poprawki:
- Funkcja będzie poprawnie weryfikować JWT użytkownika
- Administrator będzie mógł testować połączenie Zoom z panelu administracyjnego
- Błąd "Auth session missing!" zniknie
