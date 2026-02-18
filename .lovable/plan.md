
# Zaawansowane ustawienia spotkania: timer, uprawnienia i role

## Podsumowanie

Dodanie trzech duzych funkcjonalnosci do systemu spotkan wideo:
1. Timer spotkania z powiadomieniami (15 min i 5 min przed koncem) + wykrywanie kolizji
2. Kontrola uprawnien uczestnikow (czat, mikrofon, kamera, udostepnianie ekranu)
3. Rola wspolprowadzacego

---

## 1. Timer spotkania i powiadomienia o konczacym sie czasie

### Logika
- Wydarzenie w tabeli `events` ma kolumny `start_time`, `end_time` i `duration_minutes`
- Po dolaczeniu prowadzacego, komponent oblicza czas do zakonczenia na podstawie `end_time`
- Na 15 minut i 5 minut przed `end_time` prowadzacy (i wspolprowadzacy) widzi toast z informacja
- Prowadzacy decyduje kiedy zakonczyc - timer nie konczy spotkania automatycznie

### Wykrywanie kolizji
- Gdy spotkanie przekracza `end_time`, system sprawdza czy prowadzacy ma inne spotkanie w ciagu najblizszych 30 minut
- Jesli tak - wyswietla alert tylko prowadzacemu z informacja o kolizji (np. "Masz spotkanie 'XYZ' za 15 minut")
- Sprawdzenie odbywa sie co minute po przekroczeniu `end_time`

### Nowy komponent: `MeetingTimer.tsx`
- Wyswietla licznik czasu w headerze (obok tytulu spotkania)
- Zarzadza logika powiadomien i sprawdzania kolizji
- Widoczny dla wszystkich, ale alerty kolizji tylko dla prowadzacego

---

## 2. Kontrola uprawnien uczestnikow

### Nowa tabela w bazie danych: `meeting_room_settings`

```sql
CREATE TABLE meeting_room_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL UNIQUE,
  allow_chat boolean NOT NULL DEFAULT true,
  allow_microphone boolean NOT NULL DEFAULT true,
  allow_camera boolean NOT NULL DEFAULT true,
  allow_screen_share text NOT NULL DEFAULT 'host_only',
  -- 'host_only', 'all', lub JSON array user_ids
  allowed_screen_share_users text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Przed spotkaniem (MeetingLobby rozszerzenie)
- Jesli uzytkownik jest prowadzacym, w lobby widzi dodatkowa sekcje "Ustawienia spotkania":
  - Przelacznik: Czat (wl/wyl)
  - Przelacznik: Mikrofon uczestnikow (wl/wyl)
  - Przelacznik: Kamera uczestnikow (wl/wyl)
  - Radio: Udostepnianie ekranu - "Tylko prowadzacy" / "Wszyscy uczestnicy"
- Ustawienia zapisywane do `meeting_room_settings` przy dolaczeniu

### Podczas spotkania
- Nowy komponent `MeetingSettingsDialog.tsx` - dialog dostepny z kontrolek (nowy przycisk "Ustawienia" z ikona Settings)
- Prowadzacy moze zmieniac ustawienia w trakcie spotkania
- Zmiana ustawien broadcastowana przez Realtime do wszystkich uczestnikow
- Uczestnicy, ktorzy nie maja uprawnien do danej funkcji:
  - Przycisk mikrofonu/kamery/ekranu jest wyszarzony z tooltipem "Prowadzacy wylaczyl te funkcje"
  - Czat nie otwiera sie jesli jest wylaczony

### Udostepnianie ekranu - rozszerzenie
- Domyslnie: tylko prowadzacy moze udostepniac
- W ustawieniach: mozliwosc wlaczenia dla wszystkich lub wybranych uzytkownikow
- Przycisk "Ekran" w kontrolkach jest wyszarzony dla nieuprawnionych uczestnikow

---

## 3. Rola wspolprowadzacego

### Mechanizm
- Prowadzacy moze w panelu uczestnikow (hover) nadac role "Wspolprowadzacy" wybranemu uzytkownikowi
- Wspolprowadzacy ma te same uprawnienia co prowadzacy:
  - Wyciszanie uczestnikow
  - Zmiana ustawien spotkania
  - Zakonczenie spotkania
  - Widzi alerty timera i kolizji
- Rola broadcastowana przez Realtime i przechowywana w stanie spotkania
- W panelu uczestnikow wspolprowadzacy oznaczony etykieta "Wspolprowadzacy"

---

## Szczegoly techniczne

### Pliki do utworzenia:
1. **`src/components/meeting/MeetingTimer.tsx`** - komponent timera z logiką powiadomień i kolizji
2. **`src/components/meeting/MeetingSettingsDialog.tsx`** - dialog ustawień spotkania

### Pliki do zmiany:

1. **`src/pages/MeetingRoom.tsx`**
   - Pobranie danych wydarzenia (start_time, end_time, created_by/host_user_id) i przekazanie do VideoRoom
   - Okreslenie czy uzytkownik jest prowadzacym (isHost)

2. **`src/components/meeting/MeetingLobby.tsx`**
   - Dodanie sekcji ustawien dla prowadzacego (czat, mikrofon, kamera, udostepnianie)
   - Zapis ustawien do bazy przy dolaczeniu

3. **`src/components/meeting/VideoRoom.tsx`**
   - Integracja MeetingTimer w headerze
   - Stan ustawien spotkania (meetingSettings) - pobieranie i nasluchiwanie zmian
   - Broadcast eventow: `settings-changed`, `co-host-assigned`, `co-host-removed`
   - Listenery na te eventy
   - Blokowanie akcji na podstawie uprawnien (screen share, mute controls)
   - Przekazanie isHost/isCoHost do komponentow potomnych

4. **`src/components/meeting/MeetingControls.tsx`**
   - Nowy przycisk "Ustawienia" (ikona Settings) - widoczny tylko dla host/co-host
   - Wyszarzenie przyciskow (ekran, mikrofon, kamera) gdy brak uprawnien
   - Przycisk "Zakoncz" widoczny rowniez dla co-host

5. **`src/components/meeting/ParticipantsPanel.tsx`**
   - Przycisk "Nadaj/Odbierz wspolprowadzacego" na hover (dla hosta)
   - Etykieta "Wspolprowadzacy" / "Prowadzacy" przy nazwisku
   - Widocznosc przyciskow wyciszania tylko dla host/co-host

6. **`src/components/meeting/MeetingChat.tsx`**
   - Ukrycie pola wpisywania wiadomosci gdy czat jest wylaczony dla uczestnika

### Zmiany w bazie danych:

1. Utworzenie tabeli `meeting_room_settings` z politykami RLS
2. Polityki: odczyt dla uczestnikow spotkania, zapis tylko dla prowadzacego

### Broadcast events (Supabase Realtime):

```text
settings-changed    -> { settings: MeetingSettings }
co-host-assigned    -> { userId, peerId, displayName }
co-host-removed     -> { userId, peerId }
```

### Przeplyw danych:

```text
MeetingRoom.tsx
  |-- pobiera event data (start_time, end_time, isHost)
  |-- przekazuje do VideoRoom
        |-- VideoRoom zarzadza stanem ustawien
        |-- MeetingTimer - timer + kolizje (tylko host widzi alerty)
        |-- MeetingControls - wyszarzenie przyciskow wg uprawnien
        |-- MeetingSettingsDialog - zmiana ustawien (host/co-host)
        |-- ParticipantsPanel - nadawanie co-host
        |-- MeetingChat - blokada czatu wg uprawnien
```
