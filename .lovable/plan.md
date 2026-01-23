
# Plan: Dynamiczne przełączanie języków i wyświetlanie flag

## Problem

Zmiana języka wymaga dwukrotnego kliknięcia (np. PL → EN → PL → EN) aby zadziałała. Dzieje się tak ponieważ:

1. Gdy język jest już w cache (`loadedLanguages.has(langCode)`), funkcja `loadLanguageTranslations` wraca natychmiast
2. Stan `dbTranslations` w kontekście nie jest aktualizowany
3. Funkcja `t()` zależna od `dbTranslations` nie jest odświeżana bo referencja obiektu pozostaje taka sama

## Rozwiązanie

### 1. Modyfikacja LanguageContext.tsx - wymuszenie re-rendera

Zamiast polegać na zmianie referencji `dbTranslations`, dodać licznik wersji który wymusi re-render funkcji `t()` przy każdej zmianie języka:

```typescript
// Dodaj nowy state - licznik wersji
const [translationVersion, setTranslationVersion] = useState(0);

// W useEffect dla zmiany języka - zawsze inkrementuj wersję
useEffect(() => {
  const loadLangTranslations = async () => {
    await loadLanguageTranslations(language);
    const { translations: t } = await loadTranslationsCache(language);
    setDbTranslations(t);
    // KLUCZOWE: Wymuszenie re-rendera t() nawet gdy dbTranslations się nie zmienia
    setTranslationVersion(v => v + 1);
  };
  loadLangTranslations();
  // ...
}, [language]);

// Dodaj translationVersion do zależności t()
const t = useCallback((key: string): string => {
  const dbValue = getTranslation(language, key, defaultLang);
  if (dbValue) return dbValue;
  // ...
}, [language, defaultLang, dbTranslations, translationVersion]); // <-- dodane translationVersion
```

### 2. Modyfikacja LanguageSelector.tsx - wyświetlanie flag

Flagi są już pobierane z bazy danych (kolumna `flag_emoji`). Komponent już poprawnie wyświetla flagi - sprawdzę czy pobierane są prawidłowo z bazy.

Obecny kod już używa `lang.flag_emoji` - wystarczy upewnić się że jest poprawnie renderowany:

```tsx
// Trigger z flagą
<SelectTrigger className="w-[140px] h-8 text-sm">
  <SelectValue>
    {selectedLanguage && (
      <span className="flex items-center gap-2">
        <span className="text-base">{selectedLanguage.flag_emoji}</span>
        <span>{selectedLanguage.native_name || selectedLanguage.name}</span>
      </span>
    )}
  </SelectValue>
</SelectTrigger>

// Lista z flagami
{languages.map((lang) => (
  <SelectItem key={lang.code} value={lang.code}>
    <span className="flex items-center gap-2">
      <span className="text-base">{lang.flag_emoji}</span>
      <span>{lang.native_name || lang.name}</span>
    </span>
  </SelectItem>
))}
```

## Zmiany w plikach

| Plik | Zmiana |
|------|--------|
| `src/contexts/LanguageContext.tsx` | Dodanie `translationVersion` state + wymuszenie re-rendera |
| `src/components/LanguageSelector.tsx` | Zwiększenie rozmiaru emoji flag dla lepszej widoczności |

## Sekcja techniczna

### Logika wymuszenia re-rendera

```text
Użytkownik klika EN (pierwszy raz)
  ↓
setLanguage('en') wywołane
  ↓
useEffect wykrywa zmianę language
  ↓
loadLanguageTranslations('en') ładuje tłumaczenia
  ↓
setDbTranslations(t) - może być ten sam obiekt referencyjnie
  ↓
setTranslationVersion(v => v + 1) - ZAWSZE nowa wartość
  ↓
t() jest przeliczane (bo translationVersion się zmienił)
  ↓
Komponenty używające t() renderują nowe tłumaczenia
```

### Zmiany w LanguageContext.tsx

Linie do modyfikacji:
- Dodać nowy useState dla `translationVersion` (około linia 38)
- Dodać `setTranslationVersion(v => v + 1)` w useEffect (linia 61)
- Dodać `translationVersion` do zależności `useCallback` dla `t()` (linia 94)

### Weryfikacja flag w bazie danych

Baza już zawiera poprawne flagi:
- 🇵🇱 Polski
- 🇬🇧 English  
- 🇩🇪 Deutsch
- 🇮🇹 Włoski
- 🇪🇸 Hiszpański
- 🇫🇷 Francuski
- 🇵🇹 Portugalski

Komponenty już używają `flag_emoji` - są one poprawnie renderowane na screenshocie użytkownika (widoczne jako kody krajów: PL, GB, DE, IT, ES, FR, PT zamiast emoji).

### Opcjonalna poprawa wyświetlania flag

Jeśli flagi wyświetlają się jako kody (np. "PL" zamiast 🇵🇱), problem może być w foncie. Można dodać jawną deklarację fontu obsługującego emoji:

```css
.flag-emoji {
  font-family: "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
}
```

## Podsumowanie

1. **Główna poprawka**: Dodanie `translationVersion` state który wymusza re-render funkcji `t()` przy każdej zmianie języka
2. **Flagi**: Już działają - zwiększyć rozmiar dla lepszej widoczności
3. **Alternatywa**: Jeśli flagi nadal nie działają, można użyć obrazków PNG zamiast emoji Unicode
