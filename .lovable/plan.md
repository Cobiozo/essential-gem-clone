## Cel
W panelu „Lista uczestników" (`src/components/admin/paid-events/TicketVerification.tsx`) dodać możliwość eksportu aktualnie wyświetlanej listy uczestników do **Excel (.xlsx)**, **Word (.doc)** i **HTML (.html)**.

## Lokalizacja UI
Obok przycisku odświeżania (linia ~494) dodać `DropdownMenu` „Eksport" (ikona `Download`) z trzema pozycjami:
- Excel (.xlsx)
- Word (.doc)
- HTML (.html)

Przycisk wyłączony gdy `ordersLoading` lub `filteredOrders.length === 0`.

## Dane do eksportu
Eksportowane są aktualnie widoczne wiersze (`filteredOrders` – uwzględnia wyszukiwanie). Kolumny:
1. Lp.
2. Imię
3. Nazwisko
4. Email
5. Kod biletu
6. Check-in (Tak/Nie)
7. Data check-in (`pl-PL`, Europe/Warsaw, puste gdy brak)

Nazwa pliku: `uczestnicy-{slug(selectedEvent.title)}-{YYYY-MM-DD}.{ext}`.

## Implementacja (frontend only)
Nowy helper inline w komponencie – `exportAttendees(format: 'xlsx' | 'doc' | 'html')`:

- **xlsx**: użyć już zainstalowanej biblioteki `xlsx` (`import * as XLSX from 'xlsx'`). `XLSX.utils.aoa_to_sheet`, `XLSX.utils.book_new`, `XLSX.writeFile`. Pierwszy wiersz = nagłówki, kolumny auto-szerokość (`!cols`).
- **doc**: zbudować string HTML z tabelą (proste style inline) z prefiksem `<html xmlns:o=... xmlns:w=... xmlns="http://www.w3.org/TR/REC-html40">` i nagłówkiem zawierającym `<meta charset="utf-8">`. Pobierz jako Blob `application/msword` z rozszerzeniem `.doc` (otwiera się w Wordzie).
- **html**: ten sam HTML co dla Word, ale z dodatkowym tytułem `<h1>Lista uczestników – {title}</h1>` i metą daty eksportu; Blob `text/html;charset=utf-8`.

Pobieranie przez `URL.createObjectURL` + tymczasowy `<a download>` (dla xlsx używamy `XLSX.writeFile`, który sam pobiera).

Toast po sukcesie / błędzie (`useToast` jest już importowany).

## Co nie zmieniam
- Nic w backendzie/edge functions/DB.
- Lista, filtry, check-in – bez zmian; eksport tylko czyta `filteredOrders` i `selectedEvent`.
