

# Rozbudowa karty alertu bezpieczeństwa

## Problem
Karta alertu wyświetla tylko: typ alertu, imię użytkownika, datę, miasta i 1 adres IP. Brakuje:
- Pełnej historii logowań (wszystkie IP, urządzenia, przeglądarki, systemy)
- Nieudanych prób logowania
- Możliwości zablokowania użytkownika bezpośrednio z alertu

## Dane dostępne w bazie
Tabela `login_audit_log` zawiera bogate dane: `ip_address`, `device_type`, `os_name`, `browser_name`, `city`, `country`, `login_status`, `failure_reason`, `device_hash`, `user_agent`. Wszystko jest już zbierane — wystarczy je wyświetlić.

## Plan zmian

### 1. Rozbudowa karty alertu (`SecurityAlerts.tsx`)

Każda karta alertu zostanie rozszerzona o rozwijalną sekcję "Szczegóły" z:

**Sekcja informacji z `details` JSONB (już zapisane przez track-login):**
- Urządzenie: `device_type` (desktop/mobile/tablet)
- System: `os_name` (Windows/macOS/iOS/Android)
- Przeglądarka: `browser_name` (Chrome/Safari/Edge)
- Kraj: `country`

**Sekcja "Ostatnie logowania" — pobierana z `login_audit_log`:**
- Tabela z ostatnimi 10-20 logowaniami użytkownika
- Kolumny: Data, IP, Miasto, Urządzenie, OS, Przeglądarka, Status (success/failed), Powód błędu
- Kolorowanie: czerwone tło dla failed, żółte dla suspicious
- Unikalne IP wyróżnione, aby łatwo zobaczyć ile różnych adresów

**Przycisk "Zablokuj użytkownika":**
- Czerwony przycisk obok "Rozwiąż"
- Wywołuje istniejący RPC `admin_toggle_user_status(target_user_id, new_status: false)`
- Dialog potwierdzenia przed blokadą
- Po blokadzie automatycznie oznacza alert jako rozwiązany

### 2. Query — dodatkowe dane

W `queryFn` alertów, po pobraniu alertów i profili, dodatkowo pobieramy `login_audit_log` dla każdego `user_id` z alertów (ostatnie 20 wpisów per user). Dane grupowane w mapę `loginHistory[user_id]`.

### Plik do zmiany
- `src/components/admin/security/SecurityAlerts.tsx` — rozbudowa karty + dodatkowe query + przycisk blokady

### UI
- Karta domyślnie kompaktowa (jak teraz)
- Kliknięcie "Pokaż szczegóły" rozwija sekcję z urządzeniem, tabelą logowań i przyciskiem blokady
- Użycie `Collapsible` z shadcn lub prostego `useState` toggle

