
# Diagnoza i plan naprawy — dwa problemy

## Problem 1: "Czyszczenie danych" nic nie pokazuje

### Przyczyna
Edge function `cleanup-database-data` **nie jest wdrożona** w Supabase — brak jakichkolwiek logów bootu tej funkcji. Komponent `DataCleanupManagement` wywołuje ją przy ładowaniu (`fetchStats`) i jeśli funkcja nie odpowiada, wszystkie liczniki kończą z `count: 0` i `loading: false` bez widocznego błędu (try/catch łyka wyjątek cicho).

Mimo to dane konfiguracyjne (`data_cleanup_settings`) istnieją w bazie — 10 wierszy. Komponent poprawnie pobiera je z Supabase i powinien je wyświetlić. Brakuje tylko wdrożonej edge function.

### Naprawa
1. **Deploy edge function** `cleanup-database-data` — kod już istnieje w `supabase/functions/cleanup-database-data/index.ts`, wystarczy go wdrożyć.
2. **Poprawka UI** — dodać obsługę błędu ładowania statystyk, żeby admin widział kategorie (etykiety, ustawienia) nawet gdy edge function nie odpowiada, zamiast pustej strony.

---

## Problem 2: Jolanta Kusber (jolanta.kusber@gmx.de) nie dostała emaila

### Rzeczywisty stan z bazy danych
Jolanta **otrzymała email aktywacyjny** — baza `email_logs` wyraźnie pokazuje:

| Czas | Temat | Status |
|------|-------|--------|
| 19:42:33 | Aktywuj swoje konto w Pure Life | ✅ sent |
| 20:00:09 | Witamy w Pure Life, Jolanta! 🌿 | ✅ sent |
| 20:29:25 | Aktywuj swoje konto w Pure Life (ponowne) | ✅ sent |
| 20:31:21 | Zatwierdzona przez opiekuna | ✅ sent |
| 20:43:57 | Konto w pełni aktywne | ✅ sent |

Email aktywacyjny wyszedł **19 sekund po rejestracji** (19:42:33). Serwer SMTP potwierdził odbiór.

### Prawdopodobna przyczyna braku emaila w skrzynce
**Domena gmx.de ma bardzo surowe filtry SPF/DKIM.** Logi `send-approval-email` z tego samego serwera (s108.cyber-folks.pl) pokazały, że wiadomości tam docierają poprawnie — więc SMTP działa. Problem leży po stronie gmx.de:

- Email mógł trafić do **folderu SPAM** (gmx.de znany z agresywnego filtrowania wiadomości od polskich serwerów)
- Domena `purelife.info.pl` może nie mieć poprawnych rekordów **DMARC** skonfigurowanych dla gmx.de
- Możliwy **tymczasowy soft-bounce** — email został przyjęty przez serwer GMX ale odrzucony wewnętrznie

### Naprawa
Email aktywacyjny faktycznie dotarł. Administratorowi należy doradzić:
1. Poprosić Jolantę, żeby sprawdziła folder SPAM/Śmieci w GMX
2. Dodać `support@purelife.info.pl` do kontaktów/whitelist w GMX
3. Skorzystać z funkcji "Wyślij ponownie email aktywacyjny" (już zaimplementowanej w panelu)
4. Jako backup — admin może ręcznie potwierdzić email przez panel (`admin_confirm_user_email`)

W kodzie nie ma błędu — email wysłano prawidłowo. Jest to kwestia filtrów antyspamowych po stronie GMX.

---

## Zmiany w kodzie

### 1. Deploy edge function `cleanup-database-data`
Wdrożenie przez narzędzie `deploy_edge_functions` — żadnych zmian w kodzie.

### 2. Poprawka w `DataCleanupManagement.tsx`
Gdy edge function nie odpowiada lub zwraca błąd dla statystyk — komponent powinien:
- Nadal wyświetlać listę kategorii z ustawieniami
- Zamiast licznika pokazać "—" lub "Niedostępny"
- Nie chować całego UI za pustą stroną

Obecny problem: komponent wyświetla `loading` spinner podczas `fetchSettings`, ale jeśli `settings` jest puste (błąd), render zwraca tylko spinner lub nic. Trzeba dodać stany błędów.

### 3. Informacja o Jolancie
Brak zmian w kodzie — email wysłano poprawnie. W planie **nie ma zmian w logice wysyłki**.

---

## Pliki do zmiany

| Zmiana | Plik |
|--------|------|
| Deploy edge function | `supabase/functions/cleanup-database-data/index.ts` (bez zmian, tylko deploy) |
| Poprawka obsługi błędów UI | `src/components/admin/DataCleanupManagement.tsx` |

Nie są potrzebne migracje SQL ani zmiany w bazie danych.
