

# Plan: Raport i statystyki rejestracji + Ranking partnerów

## Co dodajemy

Nowy komponent `EventRegistrationReport.tsx` wyświetlany po wybraniu wydarzenia, zawierający:

### 1. Karty statystyk
- Łącznie zapisanych (użytkownicy + goście)
- Aktywnych (status = registered)
- Anulowanych
- Goście (liczba guest registrations)

### 2. Wykresy (recharts)
- **Kołowy**: użytkownicy vs goście
- **Kołowy**: rozkład ról (admin/partner/specjalista/klient)
- **Słupkowy**: rejestracje w czasie (po dniach)

### 3. Ranking Top 10 partnerów — skuteczność zapraszania
Tabela posortowana po liczbie zaproszonych gości (`invited_by_user_id`), pokazująca:
- Pozycja
- Imię i nazwisko partnera
- Liczba zaproszonych gości
- Liczba aktywnych (status=registered)
- % skuteczności (aktywni / zaproszeni)

Dane obliczane z `guestRegistrations` — grupowanie po `invited_by_user_id`, join z profilem zapraszającego.

### 4. Eksport XLSX pełnego raportu
Przycisk eksportujący statystyki + dane rejestracji do pliku Excel.

## Pliki

| Plik | Akcja |
|---|---|
| `src/components/admin/EventRegistrationReport.tsx` | Nowy — karty, wykresy, ranking, eksport |
| `src/components/admin/EventRegistrationsManagement.tsx` | Import + render raportu między wyborem wydarzenia a tabelami |

Wszystkie dane już są pobierane — obliczenia po stronie klienta w `useMemo`.

