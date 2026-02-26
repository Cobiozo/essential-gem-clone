
## Baner informacyjny o systemie sekwencyjnego odsłaniania szkoleń

### Co zostanie dodane

Stały baner informacyjny z ikoną (i) na stronie Akademii (`/training`), widoczny dla wszystkich użytkowników, wyjaśniający zasady sekwencyjnego odblokowywania modułów.

### Treść baneru

Baner będzie zawierał:
- Ikonę Info w kółku (już zaimportowana jako `Info` z lucide-react)
- Tytuł: **"Jak działa system szkoleń?"**
- Treść wyjaśniająca:
  - Szkolenia odsłaniają się kolejno -- następne aktywuje się po ukończeniu poprzedniego (100%)
  - Dotyczy to wszystkich użytkowników, niezależnie od daty dołączenia
  - Jeśli masz rozpoczęte szkolenie z brakującymi lekcjami -- uzupełnij je, aby odblokować kolejne
  - Kolejność odsłaniania jest ustalana przez administratora

### Umiejscowienie

Baner zostanie dodany **pod sekcją tytułu "Akademia"** i selektorem języka (linia ~744), a **nad** istniejącymi banerami (język katalogu, brak szkoleń). Będzie widoczny zawsze gdy użytkownik ma ustawiony `trainingLanguage` i istnieją moduły z `unlock_order`.

### Szczegóły techniczne

**Plik: `src/pages/Training.tsx`**

1. Dodać nowy stan `showUnlockInfo` (domyślnie `true`, z możliwością zwinięcia przez użytkownika) lub opcjonalnie komponent `Collapsible`.

2. Wstawić baner po linii ~744 (po selektorze języka, przed banerem katalogu):

```text
{trainingLanguage && (
  <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 
       dark:border-blue-800 rounded-lg">
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 
           dark:bg-blue-800 flex items-center justify-center mt-0.5">
        <Info className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
      </div>
      <div className="text-sm text-blue-800 dark:text-blue-200">
        <p className="font-semibold mb-1">Jak działa system szkoleń?</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-300">
          <li>Szkolenia odsłaniają się kolejno -- następne staje się dostępne 
              po ukończeniu poprzedniego w 100%.</li>
          <li>Jeśli masz rozpoczęte szkolenie z brakującymi lekcjami, 
              uzupełnij je, aby móc przejść dalej.</li>
          <li>Kolejność szkoleń jest ustalana przez administratora 
              i obowiązuje wszystkich użytkowników.</li>
        </ul>
      </div>
    </div>
  </div>
)}
```

3. Baner nie będzie miał przycisku zamknięcia -- jest to stała informacja systemowa, widoczna za każdym razem gdy użytkownik wchodzi na stronę Akademii.

### Podsumowanie

Jedna zmiana w jednym pliku (`Training.tsx`) -- dodanie bloku informacyjnego HTML z ikoną (i) w kółku i trzema punktami wyjaśniającymi zasady sekwencyjnego odblokowywania. Bez zmian w logice, bazie danych ani innych komponentach.
