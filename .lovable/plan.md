
# Plan zmian: etykiety kalkulatorów + panel automatycznego czyszczenia danych

## Część 1 — Poprawka etykiet kalkulatorów w adnotacjach uprawnień

### Problem
W `src/hooks/useUserPermissions.ts` kalkulator jest opisany jako "Kalkulator", a kalkulator specjalisty jako "Kalkulator specjalisty". Użytkownik wyjaśnił:
- `calculator_user_access` → dla **influencerów** (CalculatorManagement = "Kalkulator Influencerów")
- `specialist_calculator_user_access` → dla **specjalistów** (druki/formularze)

### Zmiana w `src/hooks/useUserPermissions.ts`
```
'calculator_access'           → label: 'Kalkulator Influencerów'
'specialist_calculator_access' → label: 'Druki specjalisty'  (lub 'Kalkulator Specjalistów' — spójnie z SpecialistCalculatorManagement)
```

---

## Część 2 — Panel zarządzania automatycznym czyszczeniem danych

### Analiza danych w bazie (aktualny stan)

Na podstawie analizy bazy danych następujące tabele gromadzą dane historyczne / logi:

| Tabela | Rekordów | Najstarszy rekord | Typ danych |
|--------|----------|-------------------|------------|
| `email_logs` | 1 858 | 2025-12-23 | Logi wysłanych emaili |
| `google_calendar_sync_logs` | 1 787 | 2026-01-18 | Logi synchronizacji kalendarza |
| `cron_job_logs` | 462 | 2026-01-08 | Logi zadań cron |
| `user_notifications` | 892 | 2025-12-23 | Powiadomienia (265 nieprzeczytanych) |
| `medical_chat_history` | 133 | 2025-12-11 | Historia czatu AI medycznego |
| `reflink_events` | 248 | 2026-01-08 | Zdarzenia kliknięć linków |
| `banner_interactions` | 441 | 2025-12-17 | Interakcje z banerami |
| `push_notification_logs` | 90 | 2026-02-06 | Logi push notyfikacji |
| `events` (minione) | **128** z 147 | 2026-01-13 | Minione wydarzenia |
| `event_registrations` (do minionych) | **531** | — | Rejestracje na minione wydarzenia |
| `role_chat_messages` | 18 | 2026-01-27 | Wiadomości czatu roli |
| `private_chat_messages` | 14 | 2025-12-24 | Prywatne wiadomości |
| `ai_compass_contact_history` | 31 | 2025-12-16 | Historia kontaktów AI compass |
| `i18n_translations` | 17 528 | — | **Największa tabela** — tłumaczenia (nie kasować — dane statyczne) |

### Największy potencjał oszczędności:
1. **`email_logs`** — 1858 rekordów, czysto historyczne logi
2. **`google_calendar_sync_logs`** — 1787 rekordów, techniczne logi
3. **`events` (minione)** — 128 minionych wydarzeń + 531 rejestracji
4. **`user_notifications`** — 892 powiadomień, w tym 627 już przeczytanych

### Architektura rozwiązania

Nowy komponent **`DataCleanupManagement`** w panelu administracyjnym (w istniejącej zakładce "Zadania Cron" lub nowej zakładce "Zarządzanie danymi").

Komponent zawiera listę kategorii danych do czyszczenia, każda z:
- Nazwą i opisem
- Aktualną liczbą rekordów kwalifikujących się do usunięcia
- Przełącznikiem (Switch) włączającym automatyczne czyszczenie
- Ustawieniem progu wiekowego (np. "usuń starsze niż 30/60/90/180 dni")
- Przyciskiem "Wyczyść teraz" (jednorazowe uruchomienie ręczne)

**Gdzie dodać tab:** Najlepiej jako nową pod-zakładkę w `CronJobsManagement` lub jako osobna zakładka w admin panelu.

### Kategorie czyszczenia do decyzji admina

```
1. Logi emaili (email_logs)
   Aktualnie: 1 858 rekordów (od 23.12.2025)
   Zalecenie: kasować starsze niż 90 dni
   
2. Logi synchronizacji Google Calendar (google_calendar_sync_logs)
   Aktualnie: 1 787 rekordów (od 18.01.2026)
   Zalecenie: kasować starsze niż 30 dni
   
3. Logi zadań Cron (cron_job_logs)
   Aktualnie: 462 rekordów (od 08.01.2026)
   Zalecenie: kasować starsze niż 30 dni
   
4. Minione wydarzenia + rejestracje (events + event_registrations)
   Aktualnie: 128 minionych wydarzeń, 531 rejestracji
   Zalecenie: kasować wydarzenia starsze niż 90 dni (+ kaskadowo rejestracje)
   
5. Przeczytane powiadomienia użytkowników (user_notifications WHERE is_read=true)
   Aktualnie: 627 przeczytanych z 892 wszystkich
   Zalecenie: kasować przeczytane starsze niż 60 dni
   
6. Interakcje z banerami (banner_interactions)
   Aktualnie: 441 rekordów
   Zalecenie: kasować starsze niż 60 dni
   
7. Logi push notyfikacji (push_notification_logs)
   Aktualnie: 90 rekordów
   Zalecenie: kasować starsze niż 30 dni
   
8. Historia czatu AI medycznego (medical_chat_history)
   Aktualnie: 133 rekordów (od 11.12.2025)
   Zalecenie: kasować starsze niż 180 dni (dane sensytywne — dłuższy okres)
   
9. Historia kontaktów AI Compass (ai_compass_contact_history)
   Aktualnie: 31 rekordów
   Zalecenie: kasować starsze niż 90 dni
   
10. Zdarzenia linków referencyjnych (reflink_events)
    Aktualnie: 248 rekordów
    Zalecenie: kasować starsze niż 90 dni
```

### Zmiany w kodzie

**Nowe pliki:**
- `src/components/admin/DataCleanupManagement.tsx` — główny komponent panelu

**Modyfikacje:**
- `src/hooks/useUserPermissions.ts` — poprawka etykiet kalkulatorów
- `src/pages/Admin.tsx` — dodanie nowej zakładki "Zarządzanie danymi" w admin sidebarze
- `src/components/admin/AdminSidebar.tsx` — dodanie pozycji w menu

**Jak działa czyszczenie:**
- Konfiguracja (które tabele + ile dni) przechowywana w tabeli `data_cleanup_settings` (nowa, 1 wiersz na kategorię)
- Komponent UI pokazuje konfigurację + statystyki live (ile rekordów zostanie usuniętych)
- Przycisk "Wyczyść teraz" wywołuje nową Edge Function `cleanup-database-data`
- Edge Function wykonuje DELETE z warunkiem `created_at < NOW() - interval '${days} days'`
- Automatyczne czyszczenie — dodanie nowego wpisu do `cron_settings` obsługiwanego przez istniejący mechanizm cron

**Nowa migracja SQL:**
```sql
CREATE TABLE data_cleanup_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_key text UNIQUE NOT NULL,
  label text NOT NULL,
  table_name text NOT NULL,
  condition text, -- np. 'is_read = true' dla filtrowania
  retention_days integer NOT NULL DEFAULT 90,
  is_auto_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Zmiany w UI (minione wydarzenia)

Minione wydarzenia **już znikają** z widoków użytkownika (filtrowane przez `end_time >= NOW()`), ale **pozostają w bazie**. Po włączeniu czyszczenia będą kasowane z bazy po upływie ustawionego okresu — co automatycznie usunie je z widoków admin (`EventRegistrationsManagement`).

### Podsumowanie plików

| Plik | Zmiana |
|------|--------|
| `src/hooks/useUserPermissions.ts` | Poprawka etykiet: "Kalkulator Influencerów" i "Druki specjalisty" |
| `src/components/admin/DataCleanupManagement.tsx` | Nowy komponent — panel konfiguracji czyszczenia |
| `supabase/functions/cleanup-database-data/index.ts` | Nowa Edge Function wykonująca DELETE |
| `src/pages/Admin.tsx` | Dodanie zakładki "Zarządzanie danymi" |
| `src/components/admin/AdminSidebar.tsx` | Dodanie pozycji menu |
| migracja SQL | Tabela `data_cleanup_settings` |
