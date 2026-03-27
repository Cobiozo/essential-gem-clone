

## Diagnoza: Dlaczego upload MP4 do playlisty trwa tak długo

### Przebieg uploadu MP4 krok po kroku

```text
1. Użytkownik wybiera plik MP4 (np. 15MB)
2. MediaUpload.tsx → uploadMedia() → useLocalStorage.uploadFile()
3. Plik > 2MB → trafia na ścieżkę VPS (fetch('/upload'))
4. fetch('/upload') → BRAK TIMEOUT — czeka do odpowiedzi serwera lub zerwania połączenia
5. VPS server.js przetwarza upload bez streamingu — cały plik w pamięci
6. Po zakończeniu uploadu → MediaUpload tworzy <video> element
   i ładuje METADATA z przesłanego URL (pełne pobranie nagłówków wideo z VPS)
7. Dopiero po załadowaniu metadata → wywołanie onMediaUploaded → formularz się aktualizuje
```

### Zidentyfikowane przyczyny wolnego uploadu

**1. Brak timeout na fetch('/upload')** (linia 166 useLocalStorage.ts)
- `fetch('/upload', { method: 'POST', body: formData })` — zero timeout
- Jeśli VPS odpowiada wolno (przeciążony, wolne IO), żądanie wisi bez limitu
- Użytkownik nie wie, czy upload trwa czy się zawiesił

**2. Sztuczny progress — brak realnego śledzenia postępu**
- Progress skacze: 10% → 30% → (czekanie na odpowiedź) → 80% → 100%
- `fetch()` API nie obsługuje `onUploadProgress` — nie da się śledzić realnego postępu wysyłania
- Użytkownik widzi 30% przez kilkadziesiąt sekund bez żadnej zmiany

**3. Detekcja metadanych wideo PO uploadzie — dodatkowe opóźnienie**
- Po zakończeniu uploadu, `MediaUpload.tsx` (linia 142-153) tworzy `<video>` element i ładuje metadata z przesłanego URL
- Przeglądarka musi pobrać nagłówki wideo z VPS (kolejne żądanie HTTP), co przy dużych plikach na wolnym serwerze trwa
- Dopiero po `onloadedmetadata` formularz się aktualizuje — użytkownik czeka dwukrotnie

**4. Folder 'training-media' — hardcoded dla WSZYSTKICH uplooadów**
- `MediaUpload` zawsze uploaduje do folderu `training-media` (linia 126), niezależnie od kontekstu (akademia, webinar, wiedza)
- To nie wpływa na prędkość, ale zaśmieca jeden folder

### Plan naprawy (bez zmiany zasady upload)

**Krok 1: Dodać AbortController z timeout 5 minut do fetch VPS**
- W `useLocalStorage.ts` owinąć `fetch('/upload')` w `AbortController` z 5-minutowym limitem
- Dzięki temu upload nie wisi w nieskończoność

**Krok 2: Zamienić fetch na XMLHttpRequest dla realnego progress**
- `XMLHttpRequest` obsługuje `upload.onprogress` — pokazuje realny % wysłanych bajtów
- Użytkownik zobaczy płynny pasek postępu zamiast skoków 10→30→czekanie→80

**Krok 3: Detekcja duration z pliku LOKALNEGO zamiast z URL po uploadzie**
- W `MediaUpload.tsx` przed wywołaniem `uploadFile()`, stworzyć `<video>` element z `URL.createObjectURL(file)` 
- Pobrać `duration` z pliku lokalnego (natychmiast, bez HTTP) 
- Po uploadzie od razu wywołać `onMediaUploaded(url, type, alt, duration)` bez czekania na ponowne ładowanie z serwera
- To eliminuje drugie oczekiwanie po uploadzie

### Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/hooks/useLocalStorage.ts` | Timeout 5min + XMLHttpRequest z realnym progress |
| `src/components/MediaUpload.tsx` | Detekcja duration z lokalnego pliku przed uploadem |

### Efekt
- Upload tego samego pliku będzie trwał tyle samo (ograniczenie łącza), ale:
  - pasek postępu będzie realny i płynny
  - timeout zapobiegnie zawieszeniu
  - brak dodatkowego oczekiwania po uploadzie na metadata
  - użytkownik dostanie feedback natychmiast po zakończeniu transferu

