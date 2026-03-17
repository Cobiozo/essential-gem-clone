
Cel: naprawić zawieszoną wysyłkę maila oraz poprawić kolory kart „Mocne strony” i „Do rozwoju”.

Co znalazłem
- Frontend faktycznie ustawia `sending=false` w `finally`, więc problem nie wygląda na zwykły błąd stanu w React.
- W logach funkcji mailowej widać, że żądanie dochodzi do SMTP i zaczyna wysyłkę, ale nie ma logu sukcesu ani błędu — funkcja kończy się dopiero przy shutdownie.
- Najbardziej prawdopodobna przyczyna: mail jest zbyt ciężki, bo do HTML-a wkładany jest duży base64 z obrazem wygenerowanym przez `html2canvas`. To mocno zwiększa payload i może blokować/przeciągać wysyłkę.
- Zielona i czerwona karta na ekranie mają teraz jasne style Tailwinda (`bg-green-50/50`, `bg-red-50/50`), które nie pasują do ciemnego layoutu i wyglądają inaczej niż eksport.

Plan wdrożenia

1. Usprawnić wysyłkę maila w `AssessmentSummary.tsx`
- Rozdzielić obraz do pobrania i obraz do maila:
  - PNG do pobrania zostaje pełne, z całym podsumowaniem.
  - Do maila generować lżejszą grafikę tylko z kołem umiejętności, w mniejszym rozmiarze i skali.
- Nie wysyłać do maila ciężkiego zrzutu całego podsumowania jako base64.
- Dodać limit czasu po stronie klienta dla wywołania funkcji, żeby przy problemie loader zawsze kończył się błędem zamiast kręcić się bez końca.
- Zachować komunikat sukcesu: wysłano wyniki na wskazany adres.

2. Uszczelnić backend `send-single-email`
- Dodać jawne timeouty i bezpieczniejsze zakończenie połączenia SMTP, żeby funkcja nie wisiała przy dużych wiadomościach.
- Doprecyzować logowanie etapów po `DATA`, żeby łatwo było odróżnić:
  - problem z payloadem,
  - problem z odpowiedzią SMTP,
  - timeout funkcji.
- Jeśli trzeba, ograniczyć maksymalny rozmiar HTML wysyłanego w trybie `skip_template`.

3. Zachować grafikę kołową w mailu, ale w lekkiej formie
- W treści maila osadzić samo koło umiejętności jako mniejszy obraz.
- Tabelę wyników, średnią, sumę oraz sekcje mocnych stron i obszarów rozwoju zostawić jako normalny HTML tekstowy.
- To spełni wymaganie „mail ma mieć grafikę kołową”, ale bez ryzyka przeciążenia wiadomości.

4. Poprawić kolory kart „Mocne strony” i „Do rozwoju”
- Zmienić widoczne karty na ciemniejsze, bardziej premium kolory spójne z resztą ekranu:
  - „Mocne strony”: ciemne zielone tło + subtelna zielona ramka + zielone liczby.
  - „Do rozwoju”: przygaszone ciemne czerwono-różowe / bordowe tło + subtelna czerwona ramka + czerwone liczby.
- Ujednolicić te kolory także w eksporcie PNG i treści maila, żeby wszędzie wyglądały tak samo.

Pliki do zmiany
- `src/components/skills-assessment/AssessmentSummary.tsx`
- `supabase/functions/send-single-email/index.ts`

Efekt końcowy
- Mail przestaje wisieć na „Wysyłanie...”.
- Użytkownik dostaje poprawny toast sukcesu albo czytelny błąd.
- Mail zawiera grafikę kołową, ale w lekkiej wersji.
- Zielona i czerwona karta wyglądają poprawnie i spójnie z ciemnym designem.
