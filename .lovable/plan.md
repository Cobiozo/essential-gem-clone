## Co naprawiamy

Z analizy kodu i logów Edge Function znaleziono cztery realne przyczyny:

1. **Drag pól nie działa** — w `EventTicketTemplatePanel.tsx` używamy `setPointerCapture` na przeciąganym elemencie, a `onPointerMove` jest podpięty na rodzicu (canvas). Po przechwyceniu wskaźnika eventy nie docierają już do rodzica → pole nie rusza się za myszą.
2. **Podgląd PDF zwraca błąd** („Edge Function returned a non-2xx status code"). Logi `generate-event-ticket-pdf` pokazują: `WinAnsi cannot encode "Ł"`. Standardowe fonty pdf-lib nie obsługują polskich znaków. Trzeba osadzić font Unicode (Roboto, już mamy w `src/assets/fonts/roboto-base64.ts`) przez `fontkit`.
3. **Upload PNG bez wyraźnego efektu** — bucket `event-tickets` i polityki RLS są OK, ale obecny `<Button asChild><span>…</span></Button>` wewnątrz `<Label>` w niektórych przeglądarkach nie wywołuje `input.click()`. Zamienimy na zwykły przycisk wywołujący `inputRef.current.click()` + dodamy walidację typu/komunikaty.
4. **Brak skanera QR z aparatu telefonu** — `TicketVerification.tsx` zakłada tylko sprzętowy czytnik kodów. Dodamy tryb skanowania kamerą.

---

## Plan zmian

### 1. `src/components/admin/paid-events/editor/EventTicketTemplatePanel.tsx`

- Upload: jawny `<input ref>` + `<Button onClick={() => inputRef.current?.click()}>`; pokazujemy nazwę pliku i miniaturę tła nad canvasem; toast błędu przy złym typie.
- Drag fix: usuwamy `setPointerCapture`; `onPointerMove`/`onPointerUp` rejestrujemy na `window` po `pointerdown`, odpinamy w `up`. Dzięki temu pole jedzie płynnie nawet przy szybkich ruchach poza canvas.
- Dodajemy uchwyt resize (róg) dla pola QR — ciągnięcie zmienia `width/height`.
- Po udanym uploadzie ustawiamy `background_url` i od razu zapisujemy szablon (autosave), żeby podgląd PDF używał nowego tła.
- Klik na pustym canvasie odznacza pole (`setSelectedField(null)`).

### 2. `supabase/functions/generate-event-ticket-pdf/index.ts`

- Importujemy `fontkit` (`npm:@pdf-lib/fontkit`) i osadzamy `Roboto-Regular` + `Roboto-Bold` z base64 (przenosimy stałą do funkcji jako osobny plik `_fonts.ts` w katalogu funkcji — Edge Functions nie czytają `src/`).
- `pdfDoc.registerFontkit(fontkit)` + `embedFont(robotoRegularBytes, { subset: true })`.
- Wszystkie `drawText` używają nowych fontów zamiast `StandardFonts.Helvetica*` → polskie znaki działają.
- Drobne: gdy `background_url` zawiera `?t=...`, pobieramy bez zmian (działa), ale dodajemy `try/catch` z czytelnym komunikatem.

### 3. Skaner QR z aparatu telefonu — `TicketVerification.tsx`

- Dodajemy bibliotekę `@yudiel/react-qr-scanner` (lekka, działa na mobile, używa `getUserMedia`).
- Nowy przycisk „Skanuj aparatem" otwiera `Dialog` z komponentem `<Scanner>` (kamera tylna, `facingMode: 'environment'`).
- Po wykryciu kodu QR: parsujemy URL `…/ticket/{code}`, wyciągamy `code`, automatycznie wywołujemy `verifyTicket(code, true)` (od razu check-in), zamykamy dialog i pokazujemy wynik tak jak teraz.
- Obsługa braku zgody na kamerę / braku HTTPS → komunikat „Włącz dostęp do kamery w przeglądarce telefonu".
- Pole tekstowe + sprzętowy czytnik nadal działa równolegle.

### 4. Drobne sprzątanie

- W panelu edytora pokazujemy hint: „Kliknij pole, aby je zaznaczyć; przeciągnij, aby ustawić pozycję. QR ma uchwyt do zmiany rozmiaru."
- Po `Zapisz szablon` odświeżamy `tpl` z bazy (źródło prawdy).

---

## Szczegóły techniczne (dla developera)

```text
EventTicketTemplatePanel
├── fileInputRef + handleClickUpload()
├── beginDrag(key) → window.addEventListener('pointermove'/'pointerup')
└── QR resize handle (bottom-right corner div, drag → width/height)

generate-event-ticket-pdf
├── _fonts.ts (Roboto-Regular base64, Roboto-Bold base64)
├── pdfDoc.registerFontkit(fontkit)
├── const font = await pdfDoc.embedFont(robotoBytes, { subset: true })
└── page.drawText(text, { font, ... })

TicketVerification
├── npm i @yudiel/react-qr-scanner
├── <Dialog> z <Scanner onScan={handleScanResult} constraints={{ facingMode: 'environment' }}>
└── handleScanResult(text) → extractCode(text) → verifyTicket(code, true)
```

QR w PDF od początku koduje URL `https://purelife.lovable.app/ticket/{code}`, więc skaner aparatem od razu zwróci poprawny kod.

Po zatwierdzeniu wdrażam wszystkie 4 zmiany w jednej iteracji i weryfikuję: upload → drag → Podgląd PDF (polskie znaki) → skan testowy aparatem.
