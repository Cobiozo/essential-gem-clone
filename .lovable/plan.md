

## Plan: Kompletne delegowane uprawnienia administracyjne dla lidera

### Koncepcja

Rozszerzenie tabeli `leader_permissions` o maksymalny zestaw flag delegujacych dostep do wybranych funkcji CMS admina. Lider **nie** staje sie adminem -- pozostaje partnerem, ale w Panelu Lidera pojawiaja sie dodatkowe zakladki z ograniczonymi widokami tych samych narzedzi, dzialajacymi wylacznie w zakresie jego zespolu. O wlaczeniu kazdego uprawnienia decyduje admin w CMS (zakladka "Panel Lidera").

---

### Istniejace uprawnienia (juz zaimplementowane)

| Flaga w `leader_permissions` | Opis |
|------------------------------|------|
| `individual_meetings_enabled` | Spotkania indywidualne |
| `tripartite_meeting_enabled` | Spotkania trojstronne |
| `partner_consultation_enabled` | Konsultacje partnerskie |
| `can_view_team_progress` | Podglad postepu szkolen |
| `can_view_org_tree` | Moja struktura |
| `can_approve_registrations` | Zatwierdzanie rejestracji |
| `can_broadcast` | Nadawanie broadcast |
| `can_host_private_meetings` | Hosting spotkan prywatnych |
| Kalkulator Influencerow | Osobna tabela `calculator_user_access` |
| Kalkulator Specjalistow | Osobna tabela `specialist_calculator_user_access` |

---

### Nowe uprawnienia do dodania

Na podstawie analizy wszystkich modulow CMS admina, ponizej lista **wszystkich** mozliwych do delegowania uprawnien:

#### Grupa 1: Wydarzenia i spotkania

| Nowa flaga | Opis | Co odblokuje w Panelu Lidera |
|------------|------|------------------------------|
| `can_create_team_events` | Tworzenie webinarow/szkolen dla zespolu | Formularz WebinarForm/TeamTrainingForm -- lider jako host, zespol jako odbiorcy |
| `can_manage_event_registrations` | Podglad rejestracji na swoje wydarzenia | Lista zarejestrowanych na wydarzenia lidera |

#### Grupa 2: Szkolenia i wiedza

| Nowa flaga | Opis | Co odblokuje w Panelu Lidera |
|------------|------|------------------------------|
| `can_manage_team_training` | Zarzadzanie szkoleniami zespolu | Przypisywanie modulow szkoleniowych czlonkom, podglad i reset postepu |
| `can_manage_knowledge_base` | Zarzadzanie baza wiedzy dla zespolu | Dodawanie/edycja zasobow wiedzy widocznych dla zespolu |

#### Grupa 3: Komunikacja i powiadomienia

| Nowa flaga | Opis | Co odblokuje w Panelu Lidera |
|------------|------|------------------------------|
| `can_send_team_notifications` | Wysylanie powiadomien do zespolu | Formularz wysylki powiadomien in-app do czlonkow zespolu |
| `can_send_team_emails` | Wysylanie emaili do zespolu | Formularz wysylki emaili grupowych do czlonkow zespolu |
| `can_send_team_push` | Wysylanie push do zespolu | Formularz push notification do czlonkow zespolu |

#### Grupa 4: Kontakty i dane zespolu

| Nowa flaga | Opis | Co odblokuje w Panelu Lidera |
|------------|------|------------------------------|
| `can_view_team_contacts` | Podglad kontaktow zespolu | Rozszerzony widok czlonkow z danymi kontaktowymi (email, telefon, eq_id) |
| `can_manage_team_contacts` | Zarzadzanie kontaktami zespolu | Edycja danych kontaktowych, dodawanie notatek |

#### Grupa 5: Narzedzia i tresc

| Nowa flaga | Opis | Co odblokuje w Panelu Lidera |
|------------|------|------------------------------|
| `can_manage_daily_signal` | Tworzenie Sygnalu Dnia | Formularz tworzenia/edycji Sygnalu Dnia (globalny, nie per zespol) |
| `can_manage_important_info` | Zarzadzanie waznymi informacjami | Tworzenie waznych informacji widocznych dla zespolu lub globalnie |
| `can_manage_team_reflinks` | Zarzadzanie reflinkami zespolu | Podglad i zarzadzanie reflinkami czlonkow zespolu |

#### Grupa 6: Certyfikaty i raporty

| Nowa flaga | Opis | Co odblokuje w Panelu Lidera |
|------------|------|------------------------------|
| `can_view_team_reports` | Raporty i statystyki zespolu | Dashboard ze statystykami: aktywnosc, postepy, rejestracje czlonkow |
| `can_manage_certificates` | Zarzadzanie certyfikatami zespolu | Podglad i reczne wydawanie certyfikatow czlonkom zespolu |

---

### Architektura -- nieinwazyjna

```text
Admin CMS (pelny dostep)           Panel Lidera (ograniczony do zespolu)
+--------------------------+       +------------------------------+
| EventsManagement         |       | LeaderEventsView             |
| TrainingManagement       |       | LeaderTrainingMgmtView       |
| TeamContactsManagement   |       | LeaderTeamContactsView       |
| NotificationSystem       |       | LeaderNotificationsView      |
| DailySignalManagement    |       | LeaderDailySignalView        |
| ImportantInfoManagement  |       | LeaderImportantInfoView      |
| KnowledgeResources       |       | LeaderKnowledgeView          |
| EmailTemplates           |       | LeaderEmailView              |
| PushNotifications        |       | LeaderPushView               |
| ReflinksManagement       |       | LeaderReflinksView           |
| CertificateEditor        |       | LeaderCertificatesView       |
+--------------------------+       +------------------------------+
           |                                    |
           +-------> Te same tabele DB <--------+
                     (RLS filtruje po user_id)
```

**Kluczowa zasada**: Istniejace komponenty admina NIE sa modyfikowane. Tworzymy nowe, lekkie komponenty lidera ktore reuzuja istniejace formularze ale z ograniczeniami:
- `host_user_id` / `created_by` = zawsze lider
- Widzi tylko dane swojego zespolu (lista user_id z drzewa organizacji)
- Nie moze zmieniac globalnych ustawien

---

### Zmiany w bazie danych

Migracja -- 14 nowych kolumn w `leader_permissions`:

```text
ALTER TABLE leader_permissions ADD COLUMN
  can_create_team_events boolean DEFAULT false,
  can_manage_event_registrations boolean DEFAULT false,
  can_manage_team_training boolean DEFAULT false,
  can_manage_knowledge_base boolean DEFAULT false,
  can_send_team_notifications boolean DEFAULT false,
  can_send_team_emails boolean DEFAULT false,
  can_send_team_push boolean DEFAULT false,
  can_view_team_contacts boolean DEFAULT false,
  can_manage_team_contacts boolean DEFAULT false,
  can_manage_daily_signal boolean DEFAULT false,
  can_manage_important_info boolean DEFAULT false,
  can_manage_team_reflinks boolean DEFAULT false,
  can_view_team_reports boolean DEFAULT false,
  can_manage_certificates boolean DEFAULT false;
```

Nowe RLS policies na tabelach `events`, `training_assignments`, `user_notifications` itp. -- pozwalajace liderom z odpowiednia flaga na ograniczone operacje CRUD.

Logowanie kazdej akcji do `platform_team_actions` z nowymi `action_type`: `create_event`, `assign_training`, `send_notification`, `send_email`, `send_push`, `create_daily_signal`, `create_important_info`, `manage_reflink`, `issue_certificate`.

---

### Nowe pliki -- komponenty Panelu Lidera

| Plik | Uprawnienie | Opis |
|------|-------------|------|
| `src/components/leader/LeaderEventsView.tsx` | `can_create_team_events` | Tworzenie webinarow/szkolen z reuzyciem WebinarForm + TeamTrainingForm |
| `src/components/leader/LeaderEventRegistrationsView.tsx` | `can_manage_event_registrations` | Lista zarejestrowanych na wydarzenia lidera |
| `src/components/leader/LeaderTrainingMgmtView.tsx` | `can_manage_team_training` | Przypisywanie modulow, reset postepu |
| `src/components/leader/LeaderKnowledgeView.tsx` | `can_manage_knowledge_base` | Dodawanie zasobow wiedzy |
| `src/components/leader/LeaderNotificationsView.tsx` | `can_send_team_notifications` | Wysylka powiadomien in-app |
| `src/components/leader/LeaderEmailView.tsx` | `can_send_team_emails` | Wysylka emaili grupowych |
| `src/components/leader/LeaderPushView.tsx` | `can_send_team_push` | Wysylka push do zespolu |
| `src/components/leader/LeaderTeamContactsView.tsx` | `can_view_team_contacts` + `can_manage_team_contacts` | Widok/edycja kontaktow |
| `src/components/leader/LeaderDailySignalView.tsx` | `can_manage_daily_signal` | Tworzenie Sygnalu Dnia |
| `src/components/leader/LeaderImportantInfoView.tsx` | `can_manage_important_info` | Tworzenie waznych informacji |
| `src/components/leader/LeaderReflinksView.tsx` | `can_manage_team_reflinks` | Podglad reflinków zespolu |
| `src/components/leader/LeaderReportsView.tsx` | `can_view_team_reports` | Dashboard statystyk |
| `src/components/leader/LeaderCertificatesView.tsx` | `can_manage_certificates` | Podglad/wydawanie certyfikatow |

---

### Modyfikowane pliki

| Plik | Zmiana |
|------|--------|
| `src/hooks/useLeaderPermissions.ts` | Dodanie 14 nowych flag + rozszerzenie `isAnyLeaderFeatureEnabled` |
| `src/pages/LeaderPanel.tsx` | 13 nowych warunkowych zakladek w tablicy `availableTabs` |
| `src/components/admin/LeaderPanelManagement.tsx` | 14 nowych kolumn Switch w tabeli uprawnien admina |

---

### Bezpieczenstwo

- Lider pozostaje w roli `partner` -- zero zmian w systemie rol
- Kazda operacja DB jest filtrowana po `user_id` lidera (RLS policies)
- Np. `events`: lider moze INSERT/UPDATE/DELETE tylko gdzie `host_user_id = auth.uid()` AND posiada flage `can_create_team_events`
- Lider widzi tylko dane czlonkow swojego zespolu (lista z `get_organization_tree`)
- Kazda akcja logowana do `platform_team_actions`
- Admin w dowolnym momencie moze wylaczac/wlaczac kazde uprawnienie per lider

---

### Kolejnosc implementacji

1. Migracja DB -- 14 nowych kolumn + RLS policies na tabelach docelowych
2. `useLeaderPermissions.ts` -- rozszerzenie o nowe flagi
3. `LeaderPanelManagement.tsx` -- 14 nowych Switchów w tabeli admina
4. Komponenty liderskie (po 1-2 na iteracje):
   - Wydarzenia (`LeaderEventsView` + `LeaderEventRegistrationsView`)
   - Szkolenia (`LeaderTrainingMgmtView`)
   - Komunikacja (`LeaderNotificationsView` + `LeaderEmailView` + `LeaderPushView`)
   - Kontakty (`LeaderTeamContactsView`)
   - Tresc (`LeaderDailySignalView` + `LeaderImportantInfoView`)
   - Reflinki (`LeaderReflinksView`)
   - Raporty (`LeaderReportsView`)
   - Certyfikaty (`LeaderCertificatesView`)
   - Wiedza (`LeaderKnowledgeView`)
5. Integracja w `LeaderPanel.tsx` -- nowe zakladki
6. Logowanie akcji do `platform_team_actions`

---

### Podsumowanie

Lacznie 14 nowych delegowanych uprawnien daje liderowi mozliwosc korzystania z prawie wszystkich narzedzi CMS admina, ale wylacznie w zakresie swojego zespolu. Admin kontroluje kazde uprawnienie indywidualnie per lider. Podejscie jest nieinwazyjne -- istniejace komponenty admina nie sa modyfikowane, tworzymy nowe widoki lidera ktore reuzuja formularze z ograniczeniami.

