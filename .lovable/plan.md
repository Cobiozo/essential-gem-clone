

# Plan: 5 zmian w systemie

## 1. Domyślne otwieranie sidebar (nie dropdown)

**Problem**: Kliknięcie ikony czatu otwiera dropdown z opcjami zamiast od razu sidebar.

**Rozwiązanie**: W `DashboardTopbar.tsx` zmienię przycisk czatu z `DropdownMenu` na prosty `Button` z `onClick={chatSidebar.toggleDocked}`. Opcja PiP zostanie przeniesiona do nagłówka panelu czatu (już tam jest jako ikona PictureInPicture2 w `ChatDockedPanel.tsx`).

---

## 2. Przycisk powrotu w kanale broadcast (np. Liderzy)

**Problem**: Po wejściu w kanał broadcast (np. "Liderzy") brak przycisku powrotu do listy — widoczny jest tylko na mobile (`md:hidden`).

**Rozwiązanie**: W `FullChatWindow.tsx` usunę klasę `md:hidden` z przycisku "Back", aby był zawsze widoczny. Alternatywnie, w `ChatPanelContent.tsx` już przekazuję `onBack={() => setView('list')}` — wystarczy że przycisk będzie renderowany zawsze.

---

## 3. Lupa PLC Omega Base na pulpicie, nie na czacie

**Problem**: Floating button `MedicalChatWidget` (lupa z animacją złotej monety) nakłada się na panel czatu.

**Rozwiązanie**: W `MedicalChatWidget.tsx` dodam logikę ukrywania floating buttona gdy czat sidebar jest otwarty. Zaimportuję `useChatSidebar` i gdy `isOpen === true`, ukryję przycisk lub przesunę go w lewo, żeby nie kolidował z panelem czatu.

---

## 4. Historia działań administratorów (Dziennik admina)

**Nowa funkcjonalność** wymagająca:

### Baza danych
- Nowa tabela `admin_activity_log`: `id`, `admin_user_id`, `action_type`, `action_description`, `target_table`, `target_id`, `details (jsonb)`, `created_at`
- RLS: admini widzą wszystkie wpisy

### Logowanie akcji
- Hook `useAdminActivityLog` z funkcją `logAdminAction(action_type, description, details)` 
- Wpinanie w kluczowe miejsca CMS: edycja użytkownika, zarządzanie szkoleniami, zmiana ustawień, zarządzanie reflinkami, itp.

### Panel CMS
- Nowa zakładka/sekcja w panelu Admin: "Dziennik działań"
- Tabela z kolumnami: Data, Admin, Akcja, Szczegóły
- Filtrowanie po adminie i typie akcji
- Paginacja

### Email codzienny o 7:00 CET
- Edge Function `send-admin-activity-digest` — zbiera wpisy z ostatnich 24h, formatuje i wysyła na email
- Cron job `pg_cron` uruchamiany o 7:00 CET codziennie

---

## 5. Wyłączenie wysyłania kopii certyfikatów na email

**Problem**: W `send-certificate-email/index.ts` (linie 314-326) po wysłaniu certyfikatu do użytkownika, wysyłana jest kopia CC na `support@purelife.info.pl`.

**Rozwiązanie**: Usunę blok kodu wysyłający CC do support (linie 314-326) z edge function i ponownie ją wdrożę.

---

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/DashboardTopbar.tsx` | Prosty toggle zamiast dropdown |
| `src/components/messages/FullChatWindow.tsx` | Przycisk powrotu zawsze widoczny |
| `src/components/MedicalChatWidget.tsx` | Ukrywanie/przesuwanie gdy czat otwarty |
| `supabase/functions/send-certificate-email/index.ts` | Usunięcie CC do support |
| Nowa migracja | Tabela `admin_activity_log` |
| Nowy: `src/hooks/useAdminActivityLog.ts` | Hook do logowania akcji |
| Nowy: `src/components/admin/AdminActivityLog.tsx` | Panel dziennika w CMS |
| `src/pages/Admin.tsx` | Dodanie zakładki dziennika |
| Nowy: `supabase/functions/send-admin-activity-digest/index.ts` | Codzienny email digest |

