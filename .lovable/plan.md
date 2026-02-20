
# Naprawa kopiowania linków PureLinki na iOS/iPadOS

## Diagnoza — 3 problemy

### Problem 1 (KRYTYCZNY): Brak fallbacku dla iOS Safari
`navigator.clipboard.writeText()` na iOS Safari wymaga:
- Bezpośredniego wywołania z user gesture (klik), bez przerw `async/await` przed wywołaniem
- HTTPS (spełnione)
- iOS 13.4+ dla pełnej obsługi Clipboard API

Na starszych iOS i w niektórych kontekstach (np. WKWebView w aplikacji) `navigator.clipboard` zwraca `undefined` lub rzuca `NotAllowedError`. Brak fallbacku = ciche niepowodzenie.

**Dotknięte pliki:**
- `src/components/user-reflinks/UserReflinksPanel.tsx` — linia 184 (brak try/catch i brak fallbacku)
- `src/components/dashboard/widgets/ReflinksWidget.tsx` — linia 82 (brak fallbacku)

### Problem 2 (KRYTYCZNY): Brak try/catch w UserReflinksPanel
```typescript
// PRZED — brak obsługi błędu, setCopiedId i toast nigdy się nie wykonają gdy clipboard rzuci:
const handleCopy = async (reflink: UserReflink) => {
  const fullUrl = `${window.location.origin}/auth?ref=${reflink.reflink_code}`;
  await navigator.clipboard.writeText(fullUrl);  // ← rzuca na iOS, reszta nie działa
  setCopiedId(reflink.id);
  toast({ title: 'Skopiowano!', description: fullUrl });
```

### Problem 3 (WAŻNY): Niespójny format URL w ReflinksWidget
`ReflinksWidget` kopiuje `/ref/${code}` — ten route może nie istnieć lub obsługiwać inaczej.  
`UserReflinksPanel` (właściwa zakładka) kopiuje `/auth?ref=${code}` — to jest poprawna ścieżka rejestracji.

**Oba miejsca muszą używać tego samego formatu URL.**

---

## Rozwiązanie: Centralny helper `copyToClipboard`

Stworzenie jednego, niezawodnego helpera z pełnym wsparciem iOS w `src/lib/clipboardUtils.ts`:

```typescript
export async function copyToClipboard(text: string): Promise<boolean> {
  // Metoda 1: nowoczesne Clipboard API (Chrome, Firefox, iOS 13.4+)
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // fallthrough do metody 2
    }
  }

  // Metoda 2: document.execCommand fallback (iOS Safari < 13.4, WKWebView)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    // Ukryty element poza widokiem (ważne dla iOS — nie może być display:none)
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);

    // iOS wymaga setSelectionRange zamiast select()
    textArea.focus();
    textArea.setSelectionRange(0, text.length);

    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch (err) {
    return false;
  }
}
```

---

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `src/lib/clipboardUtils.ts` | NOWY — centralny helper z iOS fallbackiem |
| `src/components/user-reflinks/UserReflinksPanel.tsx` | Zastąpienie inline clipboard użyciem helpera + dodanie try/catch |
| `src/components/dashboard/widgets/ReflinksWidget.tsx` | Zastąpienie inline clipboard + naprawa URL z `/ref/` na `/auth?ref=` |

---

## Szczegóły zmian

### `src/lib/clipboardUtils.ts` (nowy plik)
Centralny helper `copyToClipboard(text)` z:
1. Próbą nowoczesnego `navigator.clipboard.writeText`
2. Fallbackiem z `textarea + setSelectionRange + document.execCommand('copy')` dla iOS Safari
3. Zwraca `boolean` — sukces/porażka

### `src/components/user-reflinks/UserReflinksPanel.tsx`
```typescript
// PRZED:
const handleCopy = async (reflink: UserReflink) => {
  const fullUrl = `${window.location.origin}/auth?ref=${reflink.reflink_code}`;
  await navigator.clipboard.writeText(fullUrl);
  setCopiedId(reflink.id);
  toast({ title: 'Skopiowano!', description: fullUrl });
  setTimeout(() => setCopiedId(null), 2000);
};

// PO:
const handleCopy = async (reflink: UserReflink) => {
  const fullUrl = `${window.location.origin}/auth?ref=${reflink.reflink_code}`;
  const success = await copyToClipboard(fullUrl);
  if (success) {
    setCopiedId(reflink.id);
    toast({ title: 'Skopiowano!', description: fullUrl });
    setTimeout(() => setCopiedId(null), 2000);
  } else {
    toast({ title: 'Błąd kopiowania', description: 'Nie udało się skopiować linku', variant: 'destructive' });
  }
};
```

### `src/components/dashboard/widgets/ReflinksWidget.tsx`
```typescript
// PRZED:
const getReflinkUrl = (code: string) => {
  return `${window.location.origin}/ref/${code}`;  // ← błędny format
};

const handleCopy = async (reflink: UserReflink) => {
  const url = getReflinkUrl(reflink.reflink_code);
  try {
    await navigator.clipboard.writeText(url);
    ...
  } catch (error) {
    console.error('Failed to copy:', error);  // ← ciche niepowodzenie bez UI feedback
  }
};

// PO:
const getReflinkUrl = (code: string) => {
  return `${window.location.origin}/auth?ref=${code}`;  // ← poprawny format
};

const handleCopy = async (reflink: UserReflink) => {
  const url = getReflinkUrl(reflink.reflink_code);
  const success = await copyToClipboard(url);
  if (success) {
    setCopiedId(reflink.id);
    toast({ title: t('dashboard.copied'), description: url });
    setTimeout(() => setCopiedId(null), 2000);
  } else {
    toast({ title: 'Błąd', description: 'Nie można skopiować na tym urządzeniu', variant: 'destructive' });
  }
};
```

---

## Dlaczego iOS/iPadOS nie kopiuje

iOS Safari ogranicza dostęp do schowka ze względów prywatności. `navigator.clipboard.writeText` jest asynchroniczne — iOS wymaga że wywołanie musi być natychmiastowe w ramach obsługi zdarzenia (click handler). Gdy wcześniej czeka się na inne `await`, iOS "traci ślad" user gesture i odmawia dostępu do schowka. Fallback z `textarea + execCommand` jest synchroniczny i działa we wszystkich wersjach iOS Safari.

---

## Po naprawie — weryfikacja

Po wdrożeniu należy przetestować na fizycznym iPhone/iPad:
1. Zakładka **PureLinki** → klik ikony kopiowania → pojawia się toast "Skopiowano!" + wklejenie linka w dowolne pole
2. **Dashboard widget** ReflinksWidget → klik kopiowania → ta sama weryfikacja
3. Upewnić się że URL ma format `/auth?ref=u-XXXX-EQID` (nie `/ref/`)

