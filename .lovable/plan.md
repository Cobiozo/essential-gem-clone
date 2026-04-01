

# Dwukolumnowy układ: użytkownicy z dostępem i bez dostępu

## Zmiana

Przebudować `AutoWebinarAccessManagement.tsx` z jednej tabeli na dwukolumnowy (grid) układ:

**Lewa kolumna** — "Wszyscy partnerzy" (bez dostępu):
- Lista partnerów z `can_access_auto_webinar === false`
- Wyszukiwarka filtruje tylko tę listę
- Switch do włączania dostępu

**Prawa kolumna** — "Z dostępem do Auto-Webinaru":
- Lista partnerów z `can_access_auto_webinar === true`
- Wyróżniona wizualnie (np. zielona ramka lub ikona potwierdzenia)
- Switch do wyłączania dostępu
- Licznik aktywnych użytkowników w nagłówku

Układ: `grid grid-cols-1 lg:grid-cols-2 gap-4` — dwie karty obok siebie na dużych ekranach, jedna pod drugą na mniejszych.

### Szczegóły

| Element | Opis |
|---------|------|
| Plik | `src/components/admin/AutoWebinarAccessManagement.tsx` |
| Podział danych | `filtered.filter(p => p.can_access_auto_webinar)` vs `filtered.filter(p => !p.can_access_auto_webinar)` |
| Wyszukiwarka | Jedna wspólna na górze, filtruje obie listy |
| Prawa kolumna | Badge z liczbą aktywnych, np. "Aktywni (3)" |

Zmiana dotyczy wyłącznie jednego pliku — przebudowa renderowania JSX.

