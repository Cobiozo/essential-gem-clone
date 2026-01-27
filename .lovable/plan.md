
# Plan: Naprawy dwóch problemów

## Problem 1: Zoom Check Status - NAPRAWIONY

Funkcja edge `zoom-check-status` została wdrożona z poprawką dual-client authentication (ANON_KEY dla weryfikacji JWT użytkownika). Teraz powinna działać poprawnie.

**Zalecenie:** Odśwież stronę admina i spróbuj ponownie przetestować połączenie Zoom.

---

## Problem 2: YouTube Live nie odtwarza

### Diagnoza

Link materiału "Sekrety kwasów omega-3":
```
https://www.youtube.com/live/_viv0nXi6eE?si=yxN6FtvinxW5bNgo&t=381
```

Funkcja `extractYouTubeId()` w `SecureMedia.tsx` nie obsługuje formatu `youtube.com/live/`. Aktualnie wspierane formaty:

| Format | Przykład | Status |
|--------|----------|--------|
| watch?v= | youtube.com/watch?v=VIDEO_ID | Obsługiwany |
| youtu.be | youtu.be/VIDEO_ID | Obsługiwany |
| embed | youtube.com/embed/VIDEO_ID | Obsługiwany |
| shorts | youtube.com/shorts/VIDEO_ID | Obsługiwany |
| **live** | youtube.com/live/VIDEO_ID | **BRAK** |

### Rozwiązanie

Dodanie `youtube\.com\/live\/` do pattern regex w funkcji `extractYouTubeId()`.

---

## Szczegóły techniczne

### Zmiana w pliku `src/components/SecureMedia.tsx`

**Linie 48-58 - Aktualizacja funkcji extractYouTubeId:**

Przed:
```tsx
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};
```

Po:
```tsx
const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }
  return null;
};
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/SecureMedia.tsx` | Dodanie `youtube\.com\/live\/` do regex pattern |

## Oczekiwany rezultat

- YouTube Live (jak "Sekrety kwasów omega-3") będzie poprawnie rozpoznawany i osadzany jako iframe
- ID wideo `_viv0nXi6eE` zostanie wyekstrahowane z linku `youtube.com/live/_viv0nXi6eE?...`
- Wideo będzie się odtwarzać w playerze Zdrowej Wiedzy
