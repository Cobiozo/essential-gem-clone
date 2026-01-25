
# Przełącznik języka dokumentów w Bibliotece

## Cel

Zastąpić automatyczne filtrowanie dokumentów po języku interfejsu na **manualny przełącznik flag** w wierszu z trybem widoku. Użytkownik będzie mógł wybrać, w jakim języku chce widzieć dokumenty, niezależnie od języka interfejsu.

---

## Obecna sytuacja

**Linia 168 w KnowledgeCenter.tsx:**
```typescript
const matchesLanguage = r.language_code === null || r.language_code === language;
```
- Dokumenty są automatycznie filtrowane po języku interfejsu (`language` z kontekstu)
- Użytkownik nie ma kontroli nad tym filtrem
- Flaga w headerze to zmiana języka interfejsu, nie filtr dokumentów

---

## Propozycja UI

W wierszu z przełącznikiem widoku (linie 439-454), po prawej stronie:

```
Widok: [Lista] [Siatka] [Grupy]     Dokumenty w języku: [🌐] [🇵🇱 PL] [🇬🇧 EN] [🇩🇪 DE] [🇮🇹 IT] [🇪🇸 ES] [🇫🇷 FR] [🇵🇹 PT]
```

- Każda flaga to mały przycisk z obrazkiem flagi i kodem języka
- Domyślnie wybrany język interfejsu użytkownika
- Opcja "🌐" pokazuje wszystkie dokumenty (bez filtrowania języka)
- Aktywny przycisk podświetlony (ring/border)

---

## Plan zmian

### Krok 1: Dodać stan filtra języka dokumentów

```typescript
// Domyślnie = język interfejsu
const [documentLanguage, setDocumentLanguage] = useState<string | 'all'>(language);

// Synchronizuj przy zmianie języka interfejsu (opcjonalnie)
useEffect(() => {
  setDocumentLanguage(language);
}, [language]);
```

### Krok 2: Zmodyfikować logikę filtrowania

```typescript
// Linia 168 - zmiana z 'language' na 'documentLanguage'
const matchesLanguage = 
  documentLanguage === 'all' || 
  r.language_code === null || 
  r.language_code === documentLanguage;
```

### Krok 3: Dodać przełącznik flag w wierszu widoku

Rozszerzyć linię 439-454 o sekcję z flagami po prawej stronie:

```tsx
{/* View mode toggle + Language filter */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
  {/* Widok - lewa strona */}
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground">Widok:</span>
    <Tabs value={viewMode} onValueChange={...}>
      {/* ... istniejące TabsTrigger */}
    </Tabs>
  </div>
  
  {/* Język dokumentów - prawa strona */}
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-sm text-muted-foreground whitespace-nowrap">
      Dokumenty w języku:
    </span>
    <div className="flex items-center gap-1">
      {/* Wszystkie języki */}
      <button
        onClick={() => setDocumentLanguage('all')}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
          documentLanguage === 'all' 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted hover:bg-muted/80"
        )}
      >
        🌐
      </button>
      
      {/* Flagi poszczególnych języków */}
      {[
        { code: 'pl', country: 'pl' },
        { code: 'en', country: 'gb' },
        { code: 'de', country: 'de' },
        { code: 'it', country: 'it' },
        { code: 'es', country: 'es' },
        { code: 'fr', country: 'fr' },
        { code: 'pt', country: 'pt' }
      ].map(lang => (
        <button
          key={lang.code}
          onClick={() => setDocumentLanguage(lang.code)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
            documentLanguage === lang.code 
              ? "ring-2 ring-primary bg-muted" 
              : "bg-muted/50 hover:bg-muted"
          )}
        >
          <img 
            src={`https://flagcdn.com/w20/${lang.country}.png`}
            alt={lang.code}
            className="w-5 h-3 object-cover rounded-sm"
          />
          <span className="uppercase font-medium">{lang.code}</span>
        </button>
      ))}
    </div>
  </div>
</div>
```

---

## Wizualizacja końcowa

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Widok: [≡] [⊞] [🏷]          Dokumenty w języku: [🌐] [🇵🇱 PL] [🇬🇧 EN] ... │
└─────────────────────────────────────────────────────────────────────────────┘
```

Na mobile przełączniki będą układać się w dwóch liniach (flex-wrap).

---

## Korzyści

1. **Jasna kontrola** - użytkownik wie, że filtruje dokumenty po języku
2. **Niezależność od interfejsu** - można mieć interfejs po polsku i widzieć dokumenty po niemiecku
3. **Opcja "Wszystkie"** - możliwość zobaczenia wszystkich dokumentów naraz
4. **Wizualna czytelność** - flagi z kodami języków są intuicyjne
5. **Spójność** - używamy tych samych flag co w reszcie aplikacji (flagcdn.com)

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/pages/KnowledgeCenter.tsx` | Dodanie stanu `documentLanguage`, modyfikacja filtrowania, nowy UI przełącznika flag |

---

## Sekcja techniczna

### Szczegółowe zmiany w KnowledgeCenter.tsx

**1. Import `cn` dla warunkowych klas (jeśli brak):**
```typescript
import { cn } from '@/lib/utils';
```

**2. Dodać stan po linii 49:**
```typescript
const [documentLanguage, setDocumentLanguage] = useState<string | 'all'>(language);
```

**3. Zmodyfikować linię 168:**
```typescript
// Było:
const matchesLanguage = r.language_code === null || r.language_code === language;

// Będzie:
const matchesLanguage = 
  documentLanguage === 'all' || 
  r.language_code === null || 
  r.language_code === documentLanguage;
```

**4. Zastąpić sekcję widoku (linie 438-454) nowym layoutem:**
```tsx
{/* View mode toggle + Language filter */}
<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4">
  <div className="flex items-center gap-2">
    <span className="text-sm text-muted-foreground">Widok:</span>
    <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'grid' | 'grouped')}>
      <TabsList className="h-8">
        <TabsTrigger value="list" className="h-6 px-2">
          <List className="h-4 w-4" />
        </TabsTrigger>
        <TabsTrigger value="grid" className="h-6 px-2">
          <LayoutGrid className="h-4 w-4" />
        </TabsTrigger>
        <TabsTrigger value="grouped" className="h-6 px-2">
          <Tag className="h-4 w-4" />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  </div>
  
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-sm text-muted-foreground whitespace-nowrap">
      Dokumenty w języku:
    </span>
    <div className="flex items-center gap-1">
      <button
        onClick={() => setDocumentLanguage('all')}
        className={cn(
          "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
          documentLanguage === 'all' 
            ? "bg-primary text-primary-foreground" 
            : "bg-muted hover:bg-muted/80"
        )}
        title="Wszystkie języki"
      >
        🌐
      </button>
      {[
        { code: 'pl', country: 'pl' },
        { code: 'en', country: 'gb' },
        { code: 'de', country: 'de' },
        { code: 'it', country: 'it' },
        { code: 'es', country: 'es' },
        { code: 'fr', country: 'fr' },
        { code: 'pt', country: 'pt' }
      ].map(lang => (
        <button
          key={lang.code}
          onClick={() => setDocumentLanguage(lang.code)}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors",
            documentLanguage === lang.code 
              ? "ring-2 ring-primary bg-muted" 
              : "bg-muted/50 hover:bg-muted"
          )}
          title={lang.code.toUpperCase()}
        >
          <img 
            src={`https://flagcdn.com/w20/${lang.country}.png`}
            alt={lang.code}
            className="w-5 h-3 object-cover rounded-sm"
          />
          <span className="uppercase font-medium">{lang.code}</span>
        </button>
      ))}
    </div>
  </div>
</div>
```
