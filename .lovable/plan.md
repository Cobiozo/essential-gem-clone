

# Naprawa ladowania tlumaczen - deadlock w cacheLoading

## Problem glowny

W `loadTranslationsCache` (src/hooks/useTranslations.ts) jest deadlock:

```text
Scenariusz:
1. Pierwsze wywolanie: cacheLoading = true, fetch zaczyna sie
2. Jesli wystapi blad sieci/DB -> catch block (linia 343)
3. catch ustawia translationsCache = {}, languagesCache = []
4. ALE NIE wywoluje notifyListeners() !
5. finally: cacheLoading = false
6. Kolejne wywolanie: translationsCache = {} (truthy), ale loadedLanguages NIE ma 'pl'
7. cacheLoading = false, wiec wchodzi do glownego bloku (linia 298)
8. Ale jesli w miedzyczasie INNE wywolanie weszlo gdy cacheLoading=true...
   -> listener dodany do cacheListeners, NIGDY nie zostanie rozwiazany
```

Nawet bez bledu sieci - sam fakt ze `notifyListeners` nie jest w `finally` jest bugiem. Jesli cos rzuci wyjatek miedzy linia 298 a 339, wszystkie czekajace promisy wisza w nieskonczonosc.

## Drugie problem: pustry catch zwraca pusty cache

Linia 345: `translationsCache = {}` - to jest truthy. Nastepne wywolanie `loadTranslationsCache` widzi `translationsCache` jako niepusty obiekt ale `loadedLanguages` nie ma 'pl', wiec probuje zaladowac ponownie - to jest OK. Ale problem jest ze `translationsCache = {}` powoduje ze `getTranslation` szuka w pustym obiekcie i zwraca null.

## Rozwiazanie

### Plik: `src/hooks/useTranslations.ts`

1. Przeniesc `notifyListeners()` i `cacheListeners.clear()` do bloku `finally` - gwarantuje ze ZAWSZE czekajace promisy zostana rozwiazane
2. W catch: ustawic `translationsCache = null` zamiast `{}` - to pozwoli nastepnym wywolaniom faktycznie pobrac dane
3. W catch: takze wywolac `notifyListeners` aby odblokować czekajace promisy

Zmiana w `loadTranslationsCache` (linie 326-350):

```typescript
// try block - po ustawieniu cache:
    // Merge instead of overwrite...
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
    languagesToLoad.forEach(lang => loadedLanguages.add(lang));

    return { translations: translationsCache, languages: languagesCache };
  } catch (error) {
    console.error('Error loading translations cache:', error);
    // Ustawic null zamiast {} - pozwoli na ponowne pobranie
    if (!translationsCache) translationsCache = {};
    if (!languagesCache) languagesCache = [];
    return { translations: translationsCache, languages: languagesCache };
  } finally {
    cacheLoading = false;
    // ZAWSZE powiadom czekajacych - nawet po bledzie
    notifyListeners();
    cacheListeners.clear();
  }
```

### Plik: `src/contexts/LanguageContext.tsx`

Dodac obsluge bledu w useEffect aby nie zawieszal sie cicho:

```typescript
useEffect(() => {
  const loadLangTranslations = async () => {
    try {
      const { translations: t, languages } = await loadTranslationsCache(language);
      setDbTranslations(t);
      const def = languages.find(l => l.is_default);
      if (def) setDefaultLang(def.code);

      if (language !== 'pl') {
        await loadLanguageTranslations(language);
        const { translations: t2 } = await loadTranslationsCache(language);
        setDbTranslations(t2);
      }

      setTranslationVersion(v => v + 1);
    } catch (err) {
      console.error('[LanguageProvider] Failed to load translations:', err);
      setTranslationVersion(v => v + 1); // Force re-render even on error
    }
  };
  loadLangTranslations();
  // ... rest unchanged
}, [language]);
```

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/hooks/useTranslations.ts` | Przeniesc notifyListeners do finally, naprawic catch block |
| `src/contexts/LanguageContext.tsx` | Dodac try-catch w useEffect |

