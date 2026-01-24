
# Plan: Naprawa dostępu publicznego do Zdrowa Wiedza

## Diagnoza problemu

### Aktualny stan
Po analizie kodu i wykonaniu zrzutu ekranu potwierdzam, że:
1. **Ścieżka `/zdrowa-wiedza/` jest już dodana do `PUBLIC_PATHS`** (linia 33 w ProfileCompletionGuard.tsx)
2. **Zrzut ekranu z niezalogowanej sesji pokazuje formularz OTP** - strona działa poprawnie dla niezalogowanych użytkowników

### Prawdopodobne przyczyny problemu
1. **Zmiany nie są jeszcze opublikowane** - kod jest w trybie podglądu (preview), ale użytkownik testuje na produkcji (`purelife.info.pl`)
2. **Cache przeglądarki** - stara wersja strony jest w cache
3. **Użytkownik jest zalogowany** - i testuje jako zalogowany użytkownik

## Działania naprawcze

### 1. Publikacja zmian
Konieczne jest kliknięcie "Publish" (Publikuj) w interfejsie Lovable, aby zmiany z `ProfileCompletionGuard.tsx` trafiły na produkcję.

### 2. Weryfikacja działania (do wykonania po publikacji)

**Test dla niezalogowanego użytkownika:**
1. Otwórz przeglądarkę incognito/prywatną
2. Wejdź na: `https://purelife.info.pl/zdrowa-wiedza/testowanie-zdrowa-wiedza`
3. Oczekiwany wynik: Formularz OTP z polami na kod ZW-XXXX-XX

**Test dla zalogowanego użytkownika:**
1. Będąc zalogowanym, kliknij link do materiału
2. Oczekiwany wynik: Ten sam formularz OTP (publiczna ścieżka omija sprawdzanie profilu)

### 3. Porównanie z InfoLink

Obecna implementacja `/zdrowa-wiedza/` jest już identyczna z `/infolink/`:

| Aspekt | InfoLink | Zdrowa Wiedza |
|--------|----------|---------------|
| Publiczna ścieżka | `/infolink/` | `/zdrowa-wiedza/` |
| Wymaga OTP | Tak | Tak |
| Obsługa sesji | localStorage | sessionStorage |
| Formularz kodu | 8 znaków (PL-XXXX-XX) | 6 znaków (ZW-XXXX-XX) |
| Edge Functions | validate-infolink-otp | validate-hk-otp |

## Podsumowanie

**Kod jest już poprawny** - strona publiczna działa (potwierdzone zrzutem ekranu). Problem najprawdopodobniej wynika z **braku publikacji zmian na produkcję**.

### Następne kroki:
1. Opublikuj zmiany (kliknij "Publish")
2. Wyczyść cache przeglądarki lub użyj trybu incognito
3. Przetestuj link: `https://purelife.info.pl/zdrowa-wiedza/testowanie-zdrowa-wiedza`

Jeśli po publikacji problem nadal występuje, proszę o więcej szczegółów:
- Jaki dokładnie link testujesz?
- Czy jesteś zalogowany gdy testujesz?
- Jaki błąd lub przekierowanie widzisz?
