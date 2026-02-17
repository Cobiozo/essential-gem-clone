

# Naprawa ladowania tlumaczen - Race Condition

## Problem

Tlumaczenia nie laduja sie na zadnej stronie gdy uzytkownik ma wybrany jezyk inny niz polski (np. angielski). Interfejs pokazuje polski tekst pomimo wybranej flagi UK.

## Przyczyna

Race condition miedzy dwoma useEffect w LanguageContext.tsx:

1. **useEffect #1** (mount, linia 42): wywoluje `loadTranslationsCache()` z domyslnym `'pl'` - ustawia `cacheLoading = true`, zaczyna pobierac PL
2. **useEffect #2** (language='en', linia 53): wywoluje `loadLanguageTranslations('en')` - tworzy `translationsCache = {}`, laduje EN do cache, oznacza 'en' jako zaladowany
3. **useEffect #1 konczy sie**: robi `translationsCache = map` (tylko PL!) - **nadpisuje** dane EN, ktore wlasnie zostaly zaladowane
4. `loadedLanguages` nadal ma 'en' ale dane zniknely - przyszle wywolania pomijaja pobieranie bo mysla ze EN jest zaladowany

## Rozwiazanie

### Plik 1: `src/contexts/LanguageContext.tsx`

Usunac pierwszy useEffect (mount-only) i polaczyc jego logike z drugim useEffectem. Zamiast dwoch rownoleglych useEffectow ktore sie scigaja, bedzie jeden ktory laduje tlumaczenia dla aktualnego jezyka (wlacznie z polskim jako fallback):

```
// USUNAC useEffect z linii 42-50

// ZMODYFIKOWAC useEffect z linii 53-75:
useEffect(() => {
  const loadLangTranslations = async () => {
    // Jeden punkt wejscia - laduje PL + aktualny jezyk
    const { translations: t, languages } = await loadTranslationsCache(language);
    setDbTranslations(t);
    const def = languages.find(l => l.is_default);
    if (def) setDefaultLang(def.code);

    // Jesli jezyk != pl, doladuj lazy
    if (language !== 'pl') {
      await loadLanguageTranslations(language);
      const { translations: t2 } = await loadTranslationsCache(language);
      setDbTranslations(t2);
    }

    setTranslationVersion(v => v + 1);
  };
  loadLangTranslations();

  try {
    localStorage.setItem('pure-life-language', language);
    document.documentElement.lang = language;
  } catch (error) {
    console.warn('Failed to save language to localStorage');
  }
}, [language]);
```

### Plik 2: `src/hooks/useTranslations.ts`

Zmienic `loadTranslationsCache` aby MERGOWALO dane zamiast nadpisywac (linia 321):

```
// ZAMIAST: translationsCache = map;
// ZROBIC: merge z istniejacym cache
if (!translationsCache) {
  translationsCache = map;
} else {
  for (const lang of Object.keys(map)) {
    if (!translationsCache[lang]) translationsCache[lang] = {};
    for (const ns of Object.keys(map[lang])) {
      translationsCache[lang][ns] = { ...translationsCache[lang][ns], ...map[lang][ns] };
    }
  }
}
```

Dodatkowo w `loadLanguageTranslations` (linia 256-275) - dodac weryfikacje czy dane faktycznie sa w cache przed oznaczeniem jako zaladowane:

```
// Po linii 268, przed loadedLanguages.add(langCode):
// Weryfikuj czy dane faktycznie sa w cache
if (translationsCache[langCode] && Object.keys(translationsCache[langCode]).length > 0) {
  loadedLanguages.add(langCode);
} else {
  console.warn(`[i18n] Language ${langCode} loaded but no data in cache`);
}
```

### Plik 3: `src/components/dashboard/widgets/TrainingProgressWidget.tsx`

Hardcoded polski tekst na liniach 187:
- `'✓ Ukończono'` -> `t('dashboard.completed')`
- `` `${module.progress}% ukończono` `` -> `` `${module.progress}% ${t('dashboard.completed').toLowerCase()}` ``

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/contexts/LanguageContext.tsx` | Polaczenie dwoch useEffectow w jeden, eliminacja race condition |
| `src/hooks/useTranslations.ts` | Merge zamiast overwrite w loadTranslationsCache + weryfikacja w loadLanguageTranslations |
| `src/components/dashboard/widgets/TrainingProgressWidget.tsx` | Zamiana hardcoded polskiego tekstu na t() |

