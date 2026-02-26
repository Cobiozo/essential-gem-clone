
## Plan: Sekwencyjna implementacja 13 widoków delegowanych Panelu Lidera

### Podsumowanie sytuacji

Obecnie istnieje 13 komponentow-placeholderow w `src/components/leader/`. Kazdy musi zostac wypelniony logika operujaca na danych **wylacznie zespolu lidera** (lista user_id z `get_organization_tree`). Infrastruktura (baza danych, hook uprawnien, zakladki w LeaderPanel, admin toggles) jest juz gotowa.

### Wspolny wzorzec dla wszystkich widokow

Kazdy widok lidera:
1. Pobiera liste czlonkow zespolu przez `useOrganizationTree` (hook juz istnieje)
2. Filtruje dane z tabel Supabase do zakresu `user_id IN team_member_ids`
3. Loguje akcje do `platform_team_actions`
4. NIE modyfikuje istniejacych komponentow admina

### Kolejnosc implementacji (1 po 1, z audytem)

---

#### 1. LeaderEventsView -- Wydarzenia zespolu
**Co robi:** Lider tworzy webinary/szkolenia dla swojego zespolu (reuse `WebinarForm` i `TeamTrainingForm`).
- Formularz tworzenia z automatycznym `host_user_id = auth.uid()`
- Lista wydarzen lidera (filtr: `host_user_id = user.id`)
- Przyciski edycji i usuwania wlasnych wydarzen
- Logowanie do `platform_team_actions` z `action_type = 'create_event'`

#### 2. LeaderEventRegistrationsView -- Rejestracje
**Co robi:** Podglad osob zarejestrowanych na wydarzenia lidera.
- Selektor wydarzen (filtr: `host_user_id = user.id`)
- Tabela rejestracji (uzytkownicy + goscie) z danymi kontaktowymi
- Eksport do XLSX

#### 3. LeaderTrainingMgmtView -- Zarzadzanie szkoleniami
**Co robi:** Przypisywanie modulow szkoleniowych i podglad postepu.
- Lista czlonkow zespolu z postepem (reuse danych z `get_leader_team_training_progress`)
- Przypisywanie/usuwanie modulow czlonkom
- Reset postepu dla wybranego uzytkownika

#### 4. LeaderKnowledgeView -- Baza wiedzy
**Co robi:** Podglad zasobow wiedzy dostepnych dla zespolu.
- Lista zasobow z `knowledge_resources` (read-only widok)
- Filtrowanie po kategorii i statusie
- Brak tworzenia/edycji (tylko podglad)

#### 5. LeaderNotificationsView -- Powiadomienia in-app
**Co robi:** Wysylka powiadomien in-app do czlonkow zespolu.
- Formularz: tytul, tresc, ikona, modul zrodlowy
- Selektor odbiorcow (caly zespol lub wybrani)
- Insert do `user_notifications` z `sender_id = auth.uid()`
- Historia wyslanych powiadomien

#### 6. LeaderEmailView -- Emaile grupowe
**Co robi:** Wysylka emaili do czlonkow zespolu.
- Selektor szablonu email z `email_templates`
- Selektor odbiorcow z zespolu
- Wywolanie edge function `send-single-email` per odbiorca
- Podglad historii w `email_logs`

#### 7. LeaderPushView -- Push do zespolu
**Co robi:** Wysylka push notification do czlonkow zespolu.
- Formularz: tytul, tresc
- Selektor odbiorcow
- Wywolanie edge function `send-push-notification` per odbiorca

#### 8. LeaderTeamContactsView -- Kontakty zespolu
**Co robi:** Rozszerzony widok czlonkow z danymi kontaktowymi.
- Tabela czlonkow z: imie, nazwisko, email, telefon, eq_id, rola
- Wyszukiwanie i filtrowanie
- Jesli `can_manage_team_contacts`: edycja notatek
- Eksport do XLSX

#### 9. LeaderDailySignalView -- Sygnal Dnia
**Co robi:** Tworzenie i edycja Sygnalu Dnia.
- Lista istniejacych sygnalow z `daily_signals`
- Formularz dodawania nowego sygnalu (main_message, explanation, tip)
- Aktywacja/dezaktywacja sygnalow
- Logowanie do `platform_team_actions`

#### 10. LeaderImportantInfoView -- Wazne informacje
**Co robi:** Tworzenie waznych informacji (banerów).
- Formularz tworzenia z wyborem widocznosci per rola
- Lista istniejacych banerow lidera
- Edycja i usuwanie wlasnych banerow

#### 11. LeaderReflinksView -- Reflinki zespolu
**Co robi:** Podglad reflinków czlonkow zespolu.
- Tabela z `user_reflinks` filtrowana po `creator_user_id IN team_ids`
- Statystyki klikniec i rejestracji per czlonek
- Read-only (bez edycji)

#### 12. LeaderReportsView -- Raporty i statystyki
**Co robi:** Dashboard ze statystykami zespolu.
- Karty podsumowujace: liczba czlonkow, aktywnych, z postepem szkoleniowym
- Wykres postepow szkolen (recharts)
- Tabela aktywnosci czlonkow

#### 13. LeaderCertificatesView -- Certyfikaty
**Co robi:** Podglad certyfikatow czlonkow zespolu.
- Lista certyfikatow wydanych czlonkom (`user_certificates` filtr po team_ids)
- Read-only widok z informacja o module i dacie wydania

---

### Szczegoly techniczne

**Wspolny hook `useLeaderTeamMembers`** -- do stworzenia:
- Pobiera liste user_id czlonkow zespolu z `get_organization_tree`
- Cache'uje wynik na 2 minuty
- Uzywany przez wszystkie widoki lidera

**Logowanie akcji:**
```text
INSERT INTO platform_team_actions (leader_user_id, action_type, old_value, new_value)
VALUES (auth.uid(), 'create_event', NULL, event_title)
```

**Pliki do stworzenia:**
- `src/hooks/useLeaderTeamMembers.ts` -- wspolny hook pobierajacy team IDs
- 13 komponentow w `src/components/leader/` (nadpisanie placeholderow)

**Pliki bez zmian:**
- Wszystkie komponenty admina (EventsManagement, DailySignalManagement itd.)
- LeaderPanel.tsx (juz zintegrowany)
- LeaderPanelManagement.tsx (juz zintegrowany)
- useLeaderPermissions.ts (juz zintegrowany)

### Proces audytu kazdego modulu

Po implementacji kazdego widoku:
1. Sprawdzenie poprawnosci importow i TypeScript
2. Weryfikacja filtrowania danych do zakresu zespolu
3. Sprawdzenie logowania akcji do `platform_team_actions`
4. Sprawdzenie ze istniejace komponenty admina nie sa modyfikowane
5. Przeglad console logs pod katem bledow

### Raport koncowy

Po ukonczeniu wszystkich 13 modulow -- podsumowanie:
- Lista zaimplementowanych widokow
- Status kazdego modulu
- Ewentualne uwagi i ograniczenia
