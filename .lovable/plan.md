## Cel

Lista modułów w „Moderatorzy panelu CMS" ma odzwierciedlać 1:1 cały panel administratora — każdy element paska bocznego, każda zakładka i pod-zakładka. Admin ma móc bardzo szczegółowo włączyć moderatorowi dowolny moduł.

## Zakres zmiany (jeden plik)

`src/components/admin/ModeratorsManagement.tsx` — rozszerzyć stałą `MODULES` (oraz w razie potrzeby `ACTION_LABELS`) tak, aby pokrywała wszystkie pozycje z `AdminSidebar.tsx`. Klucze modułów = `value` zakładki w sidebarze (czyli te same, które już sprawdza `useModeratorAccess.can(item.value)` przy filtrowaniu sidebara). Grupy w UI = nazwy kategorii sidebara.

## Pełna mapa modułów (grupy 1:1 z sidebarem)

Strona i wygląd: `content`, `layout`, `pages`, `html-pages`, `colors`, `settings`, `dashboard-footer`, `sidebar-icons`.

Użytkownicy: `users`, `user-stats`, `account`, `leader-panel-management`, `platform-teams`. (`moderators` celowo pominięte — zostaje wyłącznie dla admina, jak teraz w `AdminSidebar`.)

Szkolenia i wiedza: `training`, `certificates`, `knowledge`, `healthy-knowledge`, `media-library`.

Wydarzenia i narzędzia: `events`, `event-registrations`, `paid-events`, `meeting-guests`, `daily-signal`, `important-info`, `news-ticker`, `calculator`, `specialist-calculator`, `partner-pages`, `organization-tree`, `purebox`.

Komunikacja: `translations`, `team-contacts`, `chat-permissions`, `notifications`, `push-notifications`, `emails`, `email-delivery`, `support`, `cookies`.

System: `system-health`, `activity-log`, `maintenance`, `cron-jobs`, `google-calendar`, `ai-compass`, `ai-provider`, `data-cleanup`, `security`, `api-integrations`, `mobile-bottom-nav`, `intro-video`.

Dodatkowo, jako odrębne moduły poza sidebarem (osobne podstrony admina): `news_hub` (Centrum Aktualności – już jest).

## Pod-akcje (`actions`)

Dobrane realistycznie per moduł:
- Treści/strony/wydarzenia/szkolenia/wiedza: `create`, `edit`, `delete`, dodatkowo `publish` tam, gdzie ma sens (`news_hub`, `pages`, `events`, `paid-events`, `training`, `knowledge`, `healthy-knowledge`).
- Listy/rejestracje (`event-registrations`, `meeting-guests`, `users`, `user-stats`, `activity-log`, `email-delivery`, `support`): `view`, `edit`, `delete` / `reply` / `export` zależnie od kontekstu.
- Konfiguracje (`layout`, `colors`, `settings`, `dashboard-footer`, `sidebar-icons`, `cookies`, `maintenance`, `cron-jobs`, `google-calendar`, `ai-provider`, `mobile-bottom-nav`, `intro-video`, `news-ticker`, `daily-signal`, `important-info`, `translations`): tylko `edit` (on/off + ewentualnie `edit`).
- Powiadomienia / e-maile: `send`, `edit`.
- Zarządzanie kontami i bezpieczeństwo (`account`, `users`, `security`, `api-integrations`, `data-cleanup`): pozostają widoczne jako moduły, ale tylko `view` jako pod-akcja (zgodnie z dotychczasową regułą „akcje krytyczne tylko admin"). Klucz główny modułu (= pełen dostęp) i tak będzie ignorowany przez RLS/edge functions dla operacji destrukcyjnych — UI nie ma tego ukrywać; admin sam decyduje, co włączyć.

Whitelista konkretnych ID (`supportsIds: true`) — dla modułów, w których to ma sens: `news_hub`, `pages`, `html-pages`, `events`, `paid-events`, `training`, `knowledge`, `healthy-knowledge`, `partner-pages`.

## Etykiety

Etykiety modułów po polsku, spójne z sidebarem (`hardcodedLabels` + tłumaczenia). Dodać brakujące do `ACTION_LABELS`: `export` („Eksport"), `manage` („Zarządzanie").

## Czego NIE zmieniamy

- `useModeratorAccess` — już używa kluczy = `value` zakładki, więc po dodaniu modułów filtr sidebara „po prostu zadziała".
- `admin-set-moderator` edge function — zapisuje dowolne klucze w `modules` JSONB.
- Schematu bazy.

## Test po wdrożeniu

1. Otworzyć Admin → Moderatorzy → karta moderatora pokazuje 6 grup pokrywających cały sidebar.
2. Włączenie np. `platform-teams` u moderatora → po przelogowaniu moderator widzi w sidebarze „Zespoły platformy".
3. `moderators` nie pojawia się na liście do nadania.
