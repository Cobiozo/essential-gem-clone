## Plan poprawki mobile UI

### 1. Górny pasek na stronie „Moje konto”
- Przebudować header w `src/pages/MyAccount.tsx` pod mobile, żeby elementy nie wychodziły poza ekran 390px.
- Na mobile zostawić kompaktowy układ: logo + nazwa po lewej oraz ikony akcji po prawej.
- Ukryć tekst w przyciskach „Akademia”, „Strona główna” i „Wyloguj” na mobile, zostawiając same ikony z dostępnością `aria-label`.
- Zmniejszyć odstępy, szerokość logo i typografię nazwy PURE LIFE CENTER na małych ekranach.
- Zachować pełne etykiety i obecny układ na desktopie.

### 2. Zakładki pod nagłówkiem
- Zamienić obecny zawijany blok zakładek na mobile w poziomy, przewijalny pasek chipów.
- Ustawić stałe, czytelne rozmiary triggerów: ikona + krótka etykieta bez nachodzenia tekstu.
- Dodać `overflow-x-auto`, `snap-x`, `shrink-0`, stabilne odstępy i dolny padding dla wygodnego przesuwania palcem.
- Na desktopie pozostawić obecny wielowierszowy układ zakładek.

### 3. Spójność i bezpieczeństwo zmian
- Nie zmieniać logiki konta, aktywnych zakładek, ról ani widoczności kart.
- Nie ruszać dolnego paska nawigacji ani routingu.
- Poprawić wyłącznie warstwę prezentacji w `MyAccount.tsx`, ewentualnie klasy pomocnicze tylko tam, gdzie są niezbędne.

### 4. Weryfikacja
- Sprawdzić, że w widoku 390x844 header mieści się w jednej linii i nic nie jest ucinane.
- Sprawdzić, że zakładki można przesuwać poziomo, aktywna zakładka jest widoczna, a tekst nie nachodzi na inne elementy.