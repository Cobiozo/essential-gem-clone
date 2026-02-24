

## 1. Logo we wszystkich szablonach email

### Problem
Tylko 5 z 23 szablonow email ma logo Pure Life Center w naglowku. Pozostale 18 szablonow nie ma logo.

### Rozwiazanie
Dodanie do kazdego szablonu bez logo naglowka z logo w formacie zgodnym z istniejacym wzorcem (szablon `activation_email`):

```text
<div style="background-color: #ffc105; padding: 20px; text-align: center;">
  <img src="https://xzlhssqqbajqhnsmbucf.supabase.co/storage/v1/object/public/training-media/1766508615455-8wv0cee7jwr.png" 
       alt="Pure Life Center" style="max-height: 50px; margin-bottom: 10px;" />
  <h1 style="color: #ffffff; margin: 0; font-size: 24px;">TYTUL</h1>
</div>
```

### Szablony do aktualizacji (18 sztuk)
- `individual_meeting_booked` - Nowa rezerwacja spotkania
- `training_new_lessons` - Nowe materialy szkoleniowe
- `admin_approval` - Pelne zatwierdzenie konta
- `webinar_confirmation` - Potwierdzenie rejestracji na webinar
- `individual_meeting_confirmed` - Potwierdzenie rezerwacji spotkania
- `training_assigned` - Powiadomienie o przypisanym szkoleniu
- `admin_notification` - Powiadomienie od administratora
- `meeting_reminder_15min` - Przypomnienie o spotkaniu (15 min)
- `meeting_reminder_1h` - Przypomnienie o spotkaniu (1h)
- `meeting_reminder_24h` - Przypomnienie o spotkaniu (24h)
- `training_reminder` - Przypomnienie o szkoleniu
- `webinar_reminder_1h` - Przypomnienie o webinarze (1h)
- `webinar_reminder_24h` - Przypomnienie o webinarze (24h)
- `system_reminder` - Przypomnienie systemowe (juz ma logo ale brak standaryzacji)
- `password_reset_admin` - Reset hasla przez administratora
- `individual_meeting_cancelled` - Spotkanie odwolane
- `specialist_message` - Wiadomosc do specjalisty
- `guardian_approval` - Zatwierdzenie przez opiekuna

Kazdy szablon zostanie zaktualizowany migracja SQL (UPDATE na tabeli `email_templates`), dodajac naglowek z logo na poczatku `body_html`.

---

## 2. Strzalki do zmiany kolejnosci lekcji w panelu admina

### Problem
Aktualnie pozycja lekcji jest ustalana recznym wpisywaniem numeru. Admin chce przyciskow strzalek (gora/dol) obok kazdej lekcji do szybkiego przenoszenia.

### Rozwiazanie

#### Plik: `src/components/admin/TrainingManagement.tsx`

**Nowa funkcja `moveLessonPosition`:**
- Przyjmuje `lessonId` i `direction` ('up' lub 'down')
- Zamienia pozycje dwoch sasiednich lekcji w bazie
- Aktualizuje obie lekcje jednym batch update
- Odswierza liste lekcji po zmianie

```text
Logika:
1. Znajdz lekcje o danym ID w tablicy lessons (posortowanej wg position)
2. Znajdz sasiada (poprzedni lub nastepny w tablicy)
3. Zamien ich wartosci position w bazie (swap)
4. Wywolaj fetchLessons() zeby odswierzyc widok
```

**Dodanie przyciskow w UI lekcji (linia ~1594):**
- Przed przyciskami "Edytuj" i "Usun" dodac dwa przyciski:
  - Strzalka w gore (ChevronUp) - dezaktywowana dla pierwszej lekcji
  - Strzalka w dol (ChevronDown) - dezaktywowana dla ostatniej lekcji
- Styl: male przyciski ghost, rozmiar icon

**Import:** Dodanie `ChevronUp, ChevronDown` z lucide-react.

### Wplyw na postep uzytkownikow

Zmiana kolejnosci lekcji **nie wplywa** na dotychczasowy postep:
- Postep sledzony jest po `lesson_id` (UUID), nie po `position`
- Tabela `training_progress` przechowuje `lesson_id` + `is_completed`
- Zmiana `position` lekcji zmienia tylko kolejnosc wyswietlania
- Certyfikaty pozostaja wazne -- logika certyfikatow opiera sie na dacie `issued_at`
- Nowa lekcja (niezaleznie od pozycji) wymaga nadrobienia, ale certyfikat nie traci waznosci
- Usuniecie lekcji nie wplywa na postep ani certyfikaty

To juz jest zaimplementowane w obecnej logice i nie wymaga zmian.

### Pliki do zmian
- **Edycja:** `src/components/admin/TrainingManagement.tsx` (funkcja moveLessonPosition + przyciski strzalek)
- **Migracja SQL:** aktualizacja 18 szablonow email (dodanie logo do naglowka)
