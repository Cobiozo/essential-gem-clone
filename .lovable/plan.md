
Cel: naprawić przypadek, w którym email 2h jest wysyłany, ale nadal nie zawiera linku do webinaru.

Co już potwierdziłem
- Konfiguracja wysyłki 2h jest już poprawna: `includeLink: true` w `send-bulk-webinar-reminders`.
- Funkcja `send-webinar-email` obsługuje już `reminder_2h`.
- Logi wysyłki pokazują, że emaile 2h zostały wysłane poprawnie do obu adresów.
- Prawdziwa przyczyna problemu jest w szablonie: `webinar_reminder_2h` nie zawiera `{{zoom_link}}`.
- Dla porównania szablony `webinar_reminder_1h` i `webinar_reminder_15min` zawierają `{{zoom_link}}`.
- Dodatkowo znalazłem event testowy w bazie bez `zoom_link`, więc przy wysyłce automatycznej trzeba też dopilnować danych wydarzenia.

Plan wdrożenia
1. Naprawić szablon `webinar_reminder_2h`
- Dodać do HTML przycisk/link oparty o `{{zoom_link}}`.
- Ujednolicić układ z szablonami 1h i 15min, żeby 2h wyglądał tak samo i zawsze prezentował CTA do dołączenia.

2. Dodać zabezpieczenie po stronie funkcji
- W `send-webinar-email` dodać fallback: jeśli typ to `reminder_2h` / `reminder_1h` / `reminder_15min`, przekazano `zoomLink`, ale szablon nie zawiera `{{zoom_link}}`, funkcja automatycznie doklei sekcję z linkiem na końcu wiadomości.
- To zabezpieczy system także na przyszłość, jeśli ktoś przypadkowo edytuje szablon i usunie placeholder.

3. Zweryfikować dane wydarzeń używanych przez automat
- Sprawdzić, czy właściwy webinar ma ustawione `zoom_link` albo `location`.
- Jeśli nie, automat 2h nadal wyśle mail bez linku, nawet przy poprawnym szablonie.

4. Potwierdzić spójność dla gości i zalogowanych
- Utrzymać jeden sam mechanizm dla obu grup: te same okna, ten sam szablon, ten sam warunek dodawania linku.

5. Weryfikacja po wdrożeniu
- Wysłać ponownie testy 2h do `byk1023@wp.pl` i `sebastiansnopek87@gmail.com`.
- Sprawdzić:
  - czy temat jest poprawny,
  - czy w treści pojawia się przycisk/link,
  - czy działa zarówno wysyłka ręczna, jak i scenariusz automatyczny dla wydarzenia z ustawionym `zoom_link`.

Zakres zmian
- Baza danych: aktualizacja rekordu szablonu `webinar_reminder_2h`.
- Kod: wzmocnienie `supabase/functions/send-webinar-email/index.ts`.
- Opcjonalnie kontrola danych wydarzenia w tabeli `events`.

Najważniejszy wniosek
- Sama zmiana `includeLink: true` była poprawna, ale nie wystarczyła, bo szablon `webinar_reminder_2h` nie ma miejsca, w którym ten link ma się wyświetlić. To jest główny powód obecnego błędu.
