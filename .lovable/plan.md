
# Plan: Naprawa ładowania wideo w Zdrowa Wiedza

## Zdiagnozowany problem

### Przyczyna główna
1. **Bucket `healthy-knowledge` jest PRYWATNY** (`public: false` w bazie)
2. **W bazie `media_url` zapisany jest jako URL "public"**:
   ```
   https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/healthy-knowledge/materials/xxx.mp4
   ```
3. **SecureMedia.tsx próbuje wygenerować signed URL** client-side używając `supabase.storage.createSignedUrl()`
4. **Niezalogowany użytkownik zewnętrzny nie ma uprawnień** - wywołanie kończy się błędem, fallback do oryginalnego URL też nie działa (bucket prywatny = 403)

### Przepływ błędu
```text
Partner generuje kod OTP
        ↓
Zewnętrzna osoba wchodzi na /zdrowa-wiedza/{slug}
        ↓
Wpisuje kod ZW-XXXX-XX
        ↓
validate-hk-otp zwraca media_url (format /object/public/...)
        ↓
SecureMedia.tsx próbuje createSignedUrl() CLIENT-SIDE
        ↓
❌ Brak uprawnień (użytkownik niezalogowany)
        ↓
Fallback do oryginalnego URL
        ↓
❌ Bucket prywatny = 403 Forbidden
        ↓
"Nie można załadować wideo"
```

---

## Rozwiązanie

### Strategia: Server-side Signed URL Generation

Edge function `validate-hk-otp` i `verify-hk-session` używają `SUPABASE_SERVICE_ROLE_KEY` - mają pełne uprawnienia do bucket storage. Będą generować signed URL po stronie serwera i zwracać go klientowi.

---

### Zmiana 1: `validate-hk-otp/index.ts`

Przed zwróceniem odpowiedzi, funkcja wygeneruje signed URL:

```typescript
// Po pobraniu knowledge z bazy, przed return:

let signedMediaUrl = knowledge.media_url;

if (knowledge.media_url?.includes('supabase.co') && knowledge.media_url.includes('/storage/v1/object/')) {
  try {
    const urlObj = new URL(knowledge.media_url);
    // Extract bucket and file path from URL (handle both /public/ and /sign/ formats)
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    
    if (pathMatch) {
      const [, bucket, filePath] = pathMatch;
      
      // Generate signed URL valid for 2 hours (longer than typical session)
      const { data: signedData, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(decodeURIComponent(filePath), 7200); // 2 hours
      
      if (!signError && signedData?.signedUrl) {
        signedMediaUrl = signedData.signedUrl;
        console.log(`Generated signed URL for ${bucket}/${filePath.substring(0, 30)}...`);
      } else {
        console.warn('Failed to generate signed URL:', signError);
      }
    }
  } catch (urlError) {
    console.error('Error parsing media URL for signing:', urlError);
  }
}

// Return signed URL instead of original
return new Response(JSON.stringify({
  success: true,
  session_token: sessionToken,
  expires_at: expiresAt.toISOString(),
  remaining_seconds: remainingSeconds,
  content: {
    id: knowledge.id,
    title: knowledge.title,
    description: knowledge.description,
    content_type: knowledge.content_type,
    media_url: signedMediaUrl,  // ← SIGNED URL zamiast oryginalnego
    text_content: knowledge.text_content,
    duration_seconds: knowledge.duration_seconds,
  }
}));
```

---

### Zmiana 2: `verify-hk-session/index.ts`

Ta sama logika - przy weryfikacji istniejącej sesji również zwraca świeży signed URL:

```typescript
// Przed zwróceniem content w odpowiedzi:

let signedMediaUrl = knowledge.media_url;

if (knowledge.media_url?.includes('supabase.co') && knowledge.media_url.includes('/storage/v1/object/')) {
  try {
    const urlObj = new URL(knowledge.media_url);
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)/);
    
    if (pathMatch) {
      const [, bucket, filePath] = pathMatch;
      
      const { data: signedData, error: signError } = await supabase.storage
        .from(bucket)
        .createSignedUrl(decodeURIComponent(filePath), 7200);
      
      if (!signError && signedData?.signedUrl) {
        signedMediaUrl = signedData.signedUrl;
      }
    }
  } catch (urlError) {
    console.error('Error signing media URL:', urlError);
  }
}

// Return with signed URL
content: {
  ...
  media_url: signedMediaUrl,
}
```

---

### Zmiana 3: `SecureMedia.tsx` - obsługa już podpisanego URL

Dodać wczesne wyjście dla URL które już są podpisane (zawierają `/object/sign/`):

```typescript
// W useEffect dla URL processing (linia ~232):

// Check if URL is already signed (from edge function)
if (mediaUrl.includes('/storage/v1/object/sign/')) {
  console.log('[SecureMedia] Using pre-signed URL from server');
  if (mounted) {
    setSignedUrl(mediaUrl);
    setLoading(false);
    // Set expiry time for refresh (assume 2 hours from now)
    setUrlExpiryTime(Date.now() + 7000000); // ~2 hours - 5 min buffer
    isSupabaseUrlRef.current = true;
  }
  return;
}

// Continue with existing logic for public URLs...
```

---

## Co nie zmienia się (bezpieczeństwo)

| Element | Status |
|---------|--------|
| Moduły szkoleniowe | ❌ Brak zmian - używają własnej logiki z zalogowanymi użytkownikami |
| InfoLinki | ❌ Brak zmian - nie używają SecureMedia dla storage |
| Wewnętrzny dashboard | ❌ Brak zmian - zalogowani mają uprawnienia do signed URL |
| Blokada prawego przycisku | ✅ Zachowana w SecureMedia |
| `controlsList="nodownload"` | ✅ Zachowana w SecureMedia |

---

## Przepływ po zmianach

```text
Partner generuje kod OTP
        ↓
Zewnętrzna osoba wchodzi na /zdrowa-wiedza/{slug}
        ↓
Wpisuje kod ZW-XXXX-XX
        ↓
validate-hk-otp:
  1. Waliduje kod ✓
  2. Tworzy sesję ✓
  3. Generuje signed URL (SERVICE_ROLE_KEY) ← NOWE
  4. Zwraca signed URL w content.media_url
        ↓
HealthyKnowledgePublicPage:
  - Otrzymuje gotowy signed URL
        ↓
SecureMedia.tsx:
  - Rozpoznaje /object/sign/ w URL
  - Używa go bezpośrednio (bez client-side podpisywania)
        ↓
✅ Wideo ładuje się i odtwarza z pełnymi kontrolkami
```

---

## Podsumowanie zmian

| Plik | Typ zmiany | Opis |
|------|------------|------|
| `supabase/functions/validate-hk-otp/index.ts` | Modyfikacja | Generowanie signed URL server-side przed return |
| `supabase/functions/verify-hk-session/index.ts` | Modyfikacja | Generowanie signed URL przy weryfikacji sesji |
| `src/components/SecureMedia.tsx` | Modyfikacja | Obsługa pre-signed URL (wczesne wyjście) |

### Kwestia slug vs token

Obecny system ze **slugiem** (`/zdrowa-wiedza/{slug}`) jest poprawny - slug identyfikuje KTÓRY materiał, a kod OTP daje DOSTĘP. Nie ma potrzeby zmieniać na 12-znakowy token, ponieważ:
- Sam slug nie daje dostępu do treści (wymaga kodu OTP)
- Kod OTP jest wymagany przy każdej sesji
- Slug jest czytelny dla użytkownika ("zdrowe-przepisy" zamiast "x7Hk2pLm9Qw3")

Jeśli chcesz ukryć tytuł materiału w URL, można to zrobić w przyszłości, ale nie jest to wymagane dla bezpieczeństwa.
