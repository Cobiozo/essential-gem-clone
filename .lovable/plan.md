

## Naprawa problemow z uploadem plikow na serwer VPS

### Zidentyfikowane problemy

**1. CORS blokuje POST i DELETE (KRYTYCZNY)**
W `server.js` linia 102, CORS zezwala tylko na `['GET', 'HEAD', 'OPTIONS']`. Brakuje `POST` i `DELETE`, wiec przegladarka blokuje upload i usuwanie plikow z domen Lovable/produkcyjnej.

**2. Brak autoryzacji endpointow upload/delete (BEZPIECZENSTWO)**
Endpointy `/upload` (POST), `/upload/:filename` (DELETE) i `/list-files` (GET) nie sprawdzaja zadnego tokenu -- kazdy moze uploadowac lub usuwac pliki.

**3. Krotki timeout serwera (DUZE PLIKI)**
Domyslny timeout Node.js to 2 minuty, ale dla plikow >100MB to moze byc za malo. Brak jawnego ustawienia timeout dla uploadu.

**4. Brak filtrowania typow MIME w multer (BEZPIECZENSTWO)**
Multer przyjmuje kazdy typ pliku -- brak `fileFilter`, co pozwala na upload np. plikow `.exe`.

**5. Duplikaty plikow (GLOWNY PROBLEM UZYTKOWNIKA)**
Przyczyny duplikatow:
- **Input file nie jest resetowany** po uplywie uploadu w `MediaUpload.tsx` -- klikniecie tego samego pliku ponownie nie triggeruje `onChange` (bo wartosc sie nie zmienila), ale React moze re-renderowac komponent
- **Brak blokady podwojnego klikniecia** -- uzytkownik moze kliknac "Upload" lub wybrac plik zanim poprzedni upload sie zakonczy
- **`useCallback` bez blokady rownoleglych wywolan** -- `uploadFile` w `useLocalStorage.ts` nie sprawdza czy juz trwa upload, wiec mozna uruchomic rownolegle kilka uploadow tego samego pliku
- **React re-render** -- zmiana stanu `isUploading`/`uploadProgress` moze powodowac re-render i ponowne wywolanie uploadMedia

---

### Plan zmian

#### 1. server.js -- CORS, timeout, MIME filter, autoryzacja

- **CORS**: Dodanie `POST` i `DELETE` do `methods`
- **Timeout**: Ustawienie `server.timeout = 10 * 60 * 1000` (10 minut) i `req.setTimeout()` w endpoincie upload
- **MIME filter**: Dodanie `fileFilter` do konfiguracji multer z lista dozwolonych typow (obraz, video, audio, dokumenty)
- **Autoryzacja**: Dodanie middleware sprawdzajacego naglowek `x-upload-key` z prostym kluczem API (ustawianym w zmiennej srodowiskowej `UPLOAD_API_KEY`), lub weryfikacja tokenu Supabase JWT

#### 2. src/hooks/useLocalStorage.ts -- blokada duplikatow

- Dodanie flagi `uploadInProgress` (ref) zabezpieczajacej przed rownoleglymi wywolaniami `uploadFile`
- Jesli upload juz trwa, nowe wywolanie jest odrzucane z komunikatem

#### 3. src/components/MediaUpload.tsx -- reset inputa, blokada podwojnego klikniecia

- Dodanie `useRef` na input file i resetowanie `input.value = ''` po kazdym uplyciu uploadu
- Dodanie `disabled={isUploading}` na przyciskach i inputach (czesciowo juz jest, ale trzeba upewnic sie ze pokrywa wszystkie sciezki)
- Wyczyszczenie event handlera zeby nie wywolywal `uploadMedia` wielokrotnie

---

### Szczegoly techniczne

**server.js -- CORS fix (linia 102):**
```
methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'DELETE'],
```

**server.js -- timeout (po linii 491):**
```
server.timeout = 10 * 60 * 1000; // 10 min
server.keepAliveTimeout = 65000;
```

**server.js -- multer fileFilter:**
```javascript
const allowedMimes = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/x-m4a',
  'application/pdf', 'application/msword', 'text/plain',
  // + formaty Office
];
fileFilter: (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) cb(null, true);
  else cb(new Error('Niedozwolony typ pliku'));
}
```

**useLocalStorage.ts -- blokada duplikatow:**
```typescript
const uploadLockRef = useRef(false);

const uploadFile = useCallback(async (...) => {
  if (uploadLockRef.current) {
    throw new Error('Upload juz trwa, poczekaj na zakonczenie');
  }
  uploadLockRef.current = true;
  try { ... } finally { uploadLockRef.current = false; }
}, []);
```

**MediaUpload.tsx -- reset inputa:**
```typescript
const fileInputRef = useRef<HTMLInputElement>(null);

// Po uplycie uploadu:
if (fileInputRef.current) fileInputRef.current.value = '';
```

### Pliki do zmian

| Plik | Zmiana |
|------|--------|
| `server.js` | CORS methods, timeout, multer fileFilter, opcjonalna autoryzacja |
| `src/hooks/useLocalStorage.ts` | Blokada rownoleglych uploadow (useRef lock) |
| `src/components/MediaUpload.tsx` | Reset inputa po uploadzie, ref na input element |

