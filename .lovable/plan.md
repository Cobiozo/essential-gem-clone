
# Plan: Naprawa podglądu strony rejestracji PureLink

## Diagnoza problemu

Iframe w dialogu podglądu nie wyświetla strony `/auth?ref=KOD`, ponieważ:

1. Iframe ładuje stronę w kontekście aktualnej sesji (użytkownik jest zalogowany)
2. Strona `Auth.tsx` (linie 280-285) sprawdza czy użytkownik jest zalogowany:
   ```tsx
   if (user && rolesReady) {
     navigate(redirectPath); // Przekierowuje do /
   }
   ```
3. W efekcie iframe natychmiast wykonuje redirect i pokazuje pustą zawartość (strona główna nie mieści się poprawnie w iframe lub strona nawiguje)

## Rozwiązanie

Dodać parametr `preview=true` do URL w iframe, który:
1. Dezaktywuje automatyczne przekierowanie zalogowanych użytkowników
2. Pozwoli na wyświetlenie formularza rejestracji niezależnie od stanu sesji

### Zmiany w kodzie:

**Plik 1: `src/components/user-reflinks/ReflinkPreviewDialog.tsx`**

Zmienić URL w iframe z:
```tsx
const previewUrl = `/auth?ref=${reflinkCode}`;
```
Na:
```tsx
const previewUrl = `/auth?ref=${reflinkCode}&preview=true`;
```

**Plik 2: `src/pages/Auth.tsx`**

Zmodyfikować logikę przekierowania (linie 280-285):

```tsx
// Check if we're in preview mode (iframe preview for reflink)
const urlParams = new URLSearchParams(window.location.search);
const isPreviewMode = urlParams.get('preview') === 'true';

// SAFE NAVIGATION: Only redirect when BOTH user exists AND rolesReady is true
// BUT skip redirect if in preview mode (viewing reflink in iframe)
if (user && rolesReady && !isPreviewMode) {
  console.log('[Auth] user + rolesReady, navigating to:', redirectPath);
  navigate(redirectPath);
}
```

Przenieść `urlParams` przed warunkiem sprawdzającym isActivated (aby uniknąć duplikacji).

---

## Szczegóły implementacji

### ReflinkPreviewDialog.tsx

Linia 17 - zmiana:
```tsx
// Przed
const previewUrl = `/auth?ref=${reflinkCode}`;

// Po
const previewUrl = `/auth?ref=${reflinkCode}&preview=true`;
```

Linia 29 (przycisk "Otwórz w nowej karcie") - bez preview, żeby działało normalnie:
```tsx
const fullUrl = `${window.location.origin}/auth?ref=${reflinkCode}`;
```

### Auth.tsx

1. Przenieść deklarację `urlParams` wcześniej (przed `isActivated`)
2. Dodać zmienną `isPreviewMode`
3. Zmodyfikować warunek przekierowania

Linie 260-285 zmienione na:

```tsx
// Check URL parameters - single declaration for all uses
const urlParams = new URLSearchParams(window.location.search);
const isActivated = urlParams.get('activated') === 'true';
const returnTo = urlParams.get('returnTo');
const isPreviewMode = urlParams.get('preview') === 'true';

if (isActivated) {
  toast({
    title: t('auth.toast.accountActivated'),
    description: t('auth.toast.welcomeToPureLife'),
  });
  const newUrl = returnTo 
    ? `${window.location.pathname}?returnTo=${encodeURIComponent(returnTo)}`
    : window.location.pathname;
  window.history.replaceState({}, document.title, newUrl);
}

const redirectPath = returnTo || '/';

// Skip redirect if in preview mode (viewing reflink in iframe)
if (user && rolesReady && !isPreviewMode) {
  console.log('[Auth] user + rolesReady, navigating to:', redirectPath);
  navigate(redirectPath);
}
```

---

## Oczekiwany efekt

1. Kliknięcie ikony oka przy PureLinku otwiera dialog z podglądem
2. Iframe ładuje `/auth?ref=KOD&preview=true`
3. Strona Auth wykrywa `preview=true` i NIE przekierowuje zalogowanego użytkownika
4. Użytkownik widzi formularz rejestracji z wypełnionymi danymi (rola, opiekun)
5. Przycisk "Otwórz w nowej karcie" nadal otwiera normalny link (bez preview)

---

## Pliki do edycji

| Plik | Zmiana |
|------|--------|
| `src/components/user-reflinks/ReflinkPreviewDialog.tsx` | Dodanie `&preview=true` do URL iframe |
| `src/pages/Auth.tsx` | Dodanie warunku `!isPreviewMode` w logice przekierowania |
