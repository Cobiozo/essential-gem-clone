
Naprawię to jednym spójnym mechanizmem opartym wyłącznie o realny czas trwania konkretnego pliku wideo.

1. Ustabilizuję źródło czasu trwania nagrania
- W formularzu dodawania nagrań usunę błędny fallback:
  `duration_seconds: durationSeconds || prev.duration_seconds`
- Zastąpię go logiką, która nigdy nie dziedziczy czasu z poprzedniego filmu.
- Jeśli metadane nowego pliku nie zostaną wykryte, zapis będzie miał `0`, a nie poprzednie `10:10`.

2. Wymuszę poprawny czas przed zapisem
- Przy dodawaniu/edycji nagrania zapis będzie możliwy tylko gdy:
  - czas został poprawnie wykryty, albo
  - admin wpisze go ręcznie.
- Dzięki temu nie będzie już sytuacji, że dwa różne filmy dostają ten sam błędny czas.

3. Podepnę cały webinar pod jedno źródło prawdy
- Ekran końcowy „Dziękujemy za uczestnictwo” będzie wyświetlany wyłącznie na podstawie `currentVideo.duration_seconds`.
- To już częściowo istnieje w `useAutoWebinarSync`, ale problemem są błędne dane w `duration_seconds`.
- Po naprawie formularza i walidacji, moment końca webinaru automatycznie zacznie odpowiadać realnej długości każdego filmu, np. 28:32 dla jednego i innej wartości dla kolejnego.

4. Poprawię podgląd admina
- Podgląd webinaru dostanie właściwą kategorię (`category={category}`), żeby ładował właściwą playlistę.
- W trybie preview dopilnuję, by odtwarzanie startowało stabilnie dla konkretnego filmu, bez szarego ekranu i bez mylącego zachowania.

5. Zadbam o już błędnie zapisane nagrania
- W widoku playlisty dodam jasny sygnał dla nagrań z `duration_seconds = 0` lub podejrzanie błędnym czasem.
- Dla już dodanych filmów poprawka będzie wymagała ponownego zapisania czasu dla tych konkretnych rekordów, bo obecnie mają zapisane złe dane.

Sekcje kodu do poprawy
- `src/components/admin/AutoWebinarManagement.tsx`
  - poprawa zapisu `duration_seconds`
  - blokada zapisu bez poprawnego czasu
  - przekazanie `category` do `AutoWebinarEmbed` w podglądzie
- `src/components/auto-webinar/AutoWebinarEmbed.tsx`
  - stabilizacja preview
- opcjonalnie ten sam bug także w:
  - `src/components/admin/TrainingManagement.tsx`
  bo tam jest identyczny wzorzec `durationSeconds || prev.video_duration_seconds`

Efekt końcowy
- każde nagranie ma własny realny czas,
- playlista pokazuje poprawne długości,
- ekran podziękowania pojawia się dopiero po faktycznym końcu danego filmu,
- preview działa na właściwej playliście i pokazuje poprawny materiał.
