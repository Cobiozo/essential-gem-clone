
# Plan: Obrazki flag zamiast emoji w selektorze języków

## Problem

Emoji flag (🇵🇱, 🇬🇧, 🇩🇪) nie wyświetlają się poprawnie - mogą być renderowane jako kody tekstowe (PL, GB, DE) w zależności od systemu operacyjnego i dostępnych fontów. Na screenie referencyjnym widać prawdziwe obrazki flag w stylu prostokątnym z zaokrąglonymi rogami.

## Rozwiązanie

Zamiast emoji Unicode użyć obrazków flag z publicznego CDN **flagcdn.com** lub **flagpack.xyz**. Te serwisy udostępniają flagi wszystkich krajów w formatach SVG i PNG.

### Mapowanie kodów języków na kody krajów

| Język | Kod języka | Kod kraju (ISO 3166-1) |
|-------|------------|------------------------|
| Polski | pl | PL |
| English | en | GB |
| Deutsch | de | DE |
| Italiano | it | IT |
| Español | es | ES |
| Français | fr | FR |
| Português | pt | PT |

### Format URL dla flag

```text
https://flagcdn.com/w40/{kod_kraju_lowercase}.png
https://flagcdn.com/h20/{kod_kraju_lowercase}.png
```

Przykłady:
- 🇵🇱 → https://flagcdn.com/w40/pl.png
- 🇬🇧 → https://flagcdn.com/w40/gb.png
- 🇩🇪 → https://flagcdn.com/w40/de.png

## Zmiany w plikach

### 1. Modyfikacja `src/components/LanguageSelector.tsx`

Dodanie funkcji mapującej kod języka na kod kraju i użycie tagów `<img>` zamiast emoji:

```typescript
// Mapowanie kodów języków na kody krajów (dla flag)
const languageToCountry: Record<string, string> = {
  'pl': 'pl',
  'en': 'gb',
  'de': 'de',
  'it': 'it',
  'es': 'es',
  'fr': 'fr',
  'pt': 'pt'
};

// Funkcja generująca URL flagi
const getFlagUrl = (langCode: string): string => {
  const countryCode = languageToCountry[langCode] || langCode;
  return `https://flagcdn.com/w40/${countryCode}.png`;
};
```

### 2. Komponent flagi

Zamienić span z emoji na img:

```tsx
// Zamiast:
<span className="text-lg">{lang.flag_emoji}</span>

// Użyć:
<img 
  src={getFlagUrl(lang.code)} 
  alt={lang.name}
  className="w-6 h-4 object-cover rounded-sm shadow-sm"
/>
```

### 3. Styl flagi (jak na referencji)

- Szerokość: 24px (w-6)
- Wysokość: 16px (h-4)  
- Zaokrąglone rogi: rounded-sm
- Lekki cień: shadow-sm
- Dopasowanie: object-cover

### 4. Trigger - tylko flaga (jak na referencji)

Na screenie widać że w trybie zamkniętym wyświetla się TYLKO flaga (bez nazwy języka). Lista rozwijana pokazuje flagę + nazwę:

```tsx
// Trigger - tylko flaga
<SelectTrigger className="w-auto h-8 border-0 bg-transparent">
  <SelectValue>
    {selectedLanguage && (
      <img 
        src={getFlagUrl(selectedLanguage.code)} 
        alt={selectedLanguage.name}
        className="w-8 h-6 object-cover rounded shadow-sm"
      />
    )}
  </SelectValue>
</SelectTrigger>

// Lista - flaga + nazwa
<SelectItem>
  <span className="flex items-center gap-3">
    <img src={getFlagUrl(lang.code)} className="w-6 h-4 rounded-sm" />
    <span>{lang.native_name || lang.name}</span>
  </span>
</SelectItem>
```

## Sekcja techniczna

### Pełna struktura komponentu

```typescript
// Mapowanie język → kraj
const languageToCountry: Record<string, string> = {
  'pl': 'pl',
  'en': 'gb', // angielski → Wielka Brytania
  'de': 'de',
  'it': 'it',
  'es': 'es',
  'fr': 'fr',
  'pt': 'pt'
};

const getFlagUrl = (langCode: string): string => {
  const countryCode = languageToCountry[langCode] || langCode;
  return `https://flagcdn.com/w40/${countryCode}.png`;
};

// W komponencie:
<SelectTrigger className="w-auto h-8 border-0 bg-transparent px-1">
  <SelectValue>
    {selectedLanguage && (
      <img 
        src={getFlagUrl(selectedLanguage.code)} 
        alt={selectedLanguage.name}
        className="w-8 h-5 object-cover rounded shadow-sm"
      />
    )}
  </SelectValue>
</SelectTrigger>

<SelectContent align="end">
  {languages.map((lang) => (
    <SelectItem key={lang.code} value={lang.code}>
      <span className="flex items-center gap-3">
        <img 
          src={getFlagUrl(lang.code)} 
          alt={lang.name}
          className="w-6 h-4 object-cover rounded-sm shadow-sm"
        />
        <span>{lang.native_name || lang.name}</span>
      </span>
    </SelectItem>
  ))}
</SelectContent>
```

### Usunięcie ikony Globe

Na referencji nie ma ikony globusa - tylko sama flaga. Usunąć:
```tsx
// Usunąć:
<Globe className="h-4 w-4 text-muted-foreground" />
```

## Podsumowanie zmian

| Element | Było | Będzie |
|---------|------|--------|
| Trigger | Globe + emoji + nazwa | Tylko obrazek flagi |
| Lista | emoji + nazwa | Obrazek flagi + nazwa |
| Źródło flag | Unicode emoji | CDN flagcdn.com |
| Styl flag | brak | zaokrąglone rogi + cień |

## Plik do modyfikacji

- `src/components/LanguageSelector.tsx` - pełna przebudowa na obrazki flag
