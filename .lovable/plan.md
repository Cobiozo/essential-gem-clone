
## Naprawa podwójnego uploadu plików w MediaUpload

### Analiza problemu

Na zrzucie FTP widać pliki o identycznym rozmiarze ale różnych nazwach (różne timestampy), wgrywane w odstępie sekund. Problem wynika z kilku luk w zabezpieczeniach przed duplikatami:

1. **Brak blokady na poziomie komponentu `MediaUpload`** -- `uploadLockRef` w `useLocalStorage` jest per-instancja hooka, ale sam `MediaUpload` nie blokuje ponownego wywołania `uploadMedia` zanim poprzedni upload się zakończy.

2. **Re-render powodujący ponowne wywołanie** -- Gdy `onMediaUploaded` aktualizuje stan rodzica, `MediaUpload` się re-renderuje. Jeśli plik input nie jest jeszcze wyczyszczony, może dojść do ponownego triggera.

3. **Brak deduplikacji po stronie serwera** -- VPS (server.js) zawsze generuje nową nazwę z timestampem, więc nigdy nie wykryje duplikatu.

### Rozwiązanie

**Plik: `src/components/MediaUpload.tsx`**

1. Dodac `isUploadingRef` (useRef) jako dodatkową blokadę na poziomie komponentu MediaUpload:
```text
const isUploadingRef = useRef(false);
```

2. W `handleFileSelect` -- natychmiast wyczyścić input PRZED rozpoczęciem uploadu i sprawdzić blokadę:
```text
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;
  
  // Natychmiast wyczyść input - zapobiega ponownemu triggerowi przy re-renderze
  if (fileInputRef.current) {
    fileInputRef.current.value = '';
  }
  
  // Blokada na poziomie komponentu
  if (isUploadingRef.current) {
    console.warn('Upload already in progress, ignoring duplicate');
    return;
  }
  isUploadingRef.current = true;
  
  uploadMedia(file).finally(() => {
    isUploadingRef.current = false;
  });
};
```

3. W `uploadMedia` -- dodac sprawdzenie `isUploading` z hooka na samym początku:
```text
const uploadMedia = async (file: File) => {
  if (!file || isUploading) return;
  // ...reszta logiki
};
```

4. Naprawić hardcoded `id="media-upload"` -- zmienić na dynamiczne ID (useId lub usunąć), bo wiele instancji MediaUpload na stronie współdzieli ten sam ID co może powodować problemy:
```text
const inputId = useRef(`media-upload-${Math.random().toString(36).slice(2)}`);
// ...
<Input id={inputId.current} .../>
```

**Plik: `src/hooks/useLocalStorage.ts`**

5. Dodac dodatkowe zabezpieczenie -- sprawdzenie nazwy pliku i rozmiaru przed uploadem (debounce check):
```text
const lastUploadRef = useRef<{ name: string; size: number; time: number } | null>(null);

// Na początku uploadFile:
const now = Date.now();
if (lastUploadRef.current && 
    lastUploadRef.current.name === file.name && 
    lastUploadRef.current.size === file.size && 
    now - lastUploadRef.current.time < 10000) {
  throw new Error('Duplikat uploadu wykryty - ten sam plik został właśnie przesłany.');
}
lastUploadRef.current = { name: file.name, size: file.size, time: now };
```

### Podsumowanie zmian

- **MediaUpload.tsx**: Natychmiastowe czyszczenie inputa, ref-based blokada, dynamiczny ID
- **useLocalStorage.ts**: Detekcja duplikatów po nazwie+rozmiarze w oknie 10 sekund
- Razem te zabezpieczenia pokrywają trzy warstwy: komponent UI, hook uploadu, i logikę deduplikacji
