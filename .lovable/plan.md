## Cel

Zastąpić obecny "Eksport CSV" w widoku **Zgłoszenia** (lista submissions konkretnego formularza) profesjonalnym eksportem **Excel (.xlsx)** — analogicznym stylistycznie do eksportu w "Statystykach partnerów".

## Zakres zmian

**Plik:** `src/components/admin/paid-events/event-forms/EventFormSubmissions.tsx`

1. Zamienić funkcję `exportCsv` na `exportXlsx` używającą `xlsx-js-style` (biblioteka jest już zainstalowana).
2. Zamienić przycisk "Eksport CSV" na "Eksport Excel" z ikoną `FileSpreadsheet`.
3. Nazwa pliku: `zgloszenia-{slug}-{YYYY-MM-DD}.xlsx`.

## Struktura arkusza

**Sekcja 1 — Nagłówek brandowy (gold #D4AF37):**
- Tytuł: `Zgłoszenia: {form.title}`
- Podtytuł: nazwa wydarzenia / slug
- Data wygenerowania (pl-PL)
- Liczba zgłoszeń (po zastosowanych filtrach)

**Sekcja 2 — Podsumowanie (kafelki):**
- Wszystkich: X
- Opłaconych: X (zielone)
- Oczekujących: X (żółte)
- Anulowanych: X (czerwone)
- Zwróconych: X (niebieskie)

**Sekcja 3 — Tabela zgłoszeń** (zamrożone nagłówki, naprzemienne tło wierszy, granice):

Kolumny stałe:
| Lp. | Data zgłoszenia | Imię | Nazwisko | Email | Telefon | Status płatności | Status email | Email potwierdzony | Anulowane (data) | Anulowane przez | Partner — imię | Partner — nazwisko | Partner — email | …pola dynamiczne z `fields_config` |

**Formatowanie warunkowe:**
- `Status płatności = Opłacone` → bold, zielone tło `#D1FAE5`
- `Status płatności = Oczekuje` → żółte tło `#FEF3C7`
- `Status płatności = Anulowane` → czerwone, jasne tło `#FEE2E2`
- `Status płatności = Zwrócone` → niebieskie tło `#DBEAFE`
- Statusy mailowe (Wysłany/Potwierdzony/Anulowane) — odpowiednie kolory tekstu
- Nagłówek tabeli: granat `#1E3A5F`, biały tekst, bold
- Naprzemienne tło wierszy `#F8FAFC` / białe
- Wszystkie etykiety statusów po polsku (mapowane przez `PAYMENT_LABELS`)

**Layout:**
- Szerokości kolumn dopasowane do typu danych (data ~20, email ~30, status ~14 itd.)
- Freeze panes na nagłówku tabeli
- Borders cienkie szare na wszystkich komórkach danych
- Stopka: "Wygenerowano w panelu Pure Life — {data}"

## Eksportowane dane

- Stosujemy aktualnie **przefiltrowany** zbiór (`filtered`) — szanuje wybór statusu i wyszukiwarkę, dokładnie jak teraz CSV.
- Pola dynamiczne (`form.fields_config`) dołączane jako dodatkowe kolumny po danych partnera.

## Bez zmian

- Logika pobierania danych, filtrów i mapowania partnerów pozostaje bez zmian.
- Brak migracji bazy, brak zmian w innych plikach.
