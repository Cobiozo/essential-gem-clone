

# Generowanie spersonalizowanego PDF z mapowaniami przed wysyłką emaila

## Problem
Obecnie `save-partner-lead` wysyła surowy plik z biblioteki BP jako załącznik. Pliki BP mają mapowania (`bp_file_mappings`) z dynamicznymi zmiennymi partnera (`{{imie}}`, `{{email}}`, itp.), obrazami i kodami QR — ale te mapowania nie są nakładane na plik przed wysyłką. Lead dostaje "pusty" PDF bez spersonalizowanych danych.

## Rozwiązanie
Przenieść logikę generowania spersonalizowanego PDF do Edge Function `save-partner-lead`. Funkcja musi:
1. Pobrać dane profilu partnera (`profiles`)
2. Pobrać mapowania z `bp_file_mappings` dla danego pliku
3. Rozwiązać zmienne (`{{imie}}` → dane partnera)
4. Wygenerować PDF z nałożonymi elementami (tekst, obrazy, kody QR)
5. Wysłać wygenerowany PDF jako załącznik emaila

## Wyzwanie techniczne
Edge Functions (Deno) nie mają dostępu do DOM/Canvas. Certyfikaty używają klienckich bibliotek (jsPDF + Canvas). W Deno trzeba użyć biblioteki `pdf-lib` (dostępna na esm.sh), która pozwala:
- Załadować istniejący PDF
- Nakładać tekst z fontami
- Osadzać obrazy (PNG/JPG)
- Generować wielostronicowe dokumenty

Dla plików JPG/PNG (nie-PDF): `pdf-lib` tworzy nowy dokument i osadza obraz jako tło strony.

## Zmiany

### Plik: `supabase/functions/save-partner-lead/index.ts`

**Zmiana 1** — W `handleSendEmailWithFile` dodać parametr `partner_user_id` i nową logikę:

1. Pobrać profil partnera z `profiles` (imię, nazwisko, email, telefon, miasto, kraj, specjalizacja, opis, eq_id, avatar_url)
2. Pobrać wszystkie mapowania z `bp_file_mappings` dla `bpFileId` (mogą być wielostronicowe — `page_index`)
3. Jeśli brak mapowań → wysłać surowy plik jak dotychczas (fallback)
4. Jeśli są mapowania → wygenerować spersonalizowany PDF:

**Generowanie PDF (pdf-lib w Deno):**
- Import `pdf-lib` z esm.sh
- Dla PDF: załadować oryginalny PDF (`PDFDocument.load`), iterować strony
- Dla JPG/PNG: stworzyć nowy `PDFDocument`, osadzić obraz jako tło
- Dla każdej strony pobrać mapowanie (`page_index`), iterować elementy:
  - `text`: rozwiązać zmienne partnera, narysować tekst (`page.drawText`) z fontem, kolorem, wyrównaniem, rozmiarem
  - `image`: pobrać obraz z URL, osadzić w PDF (`doc.embedPng`/`embedJpg`), narysować
  - `qr_code`: wygenerować QR jako PNG (biblioteka `qrcode` na esm.sh), osadzić i narysować
- Konwertować układ współrzędnych: mapowania używają systemu canvas (842×595px, Y od góry), pdf-lib używa punktów (Y od dołu)
- Wyeksportować do `Uint8Array` i skonwertować na base64

**Zmiana 2** — Dodać helper `resolvePartnerVariables(text, profile)` w Edge Function (port logiki z `src/lib/partnerVariables.ts`)

**Zmiana 3** — Zaktualizować wywołanie `handleSendEmailWithFile` aby przekazać `partner_user_id`

### Przeliczanie współrzędnych
Mapowania z Fabric.js canvas (842×595px) → PDF:
- Canvas pixel → PDF point: przeskalować proporcjonalnie do rozmiaru strony PDF
- Odwrócić Y: `pdfY = pageHeight - (canvasY / canvasHeight * pageHeight) - elementHeight`

### Fonty w PDF
pdf-lib ma wbudowane standardowe fonty (Helvetica). Dla polskich znaków trzeba osadzić font Unicode — można pobrać font z zasobów projektu lub użyć `StandardFonts.Helvetica` z fallbackiem (polskie znaki mogą nie wyświetlać się poprawnie). Alternatywnie: osadzić Roboto z base64 (jak w certyfikatach).

## Pliki do zmiany
| Plik | Zmiana |
|------|--------|
| `supabase/functions/save-partner-lead/index.ts` | Dodanie generowania spersonalizowanego PDF z mapowaniami, resolver zmiennych, obsługa wielostronicowych plików |

## Po wdrożeniu
- Redeploy: `save-partner-lead`
- Test: wypełnić formularz na stronie partnera → sprawdzić czy email zawiera PDF z danymi partnera

