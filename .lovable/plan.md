

# Poprawa layoutu panelu "Tresci dynamiczne"

## Problemy widoczne na screenshocie

1. **Zbyt wiele warstw kontrolek** - pasek postepu AI, selektor jezyka + przycisk AI + wyszukiwarka, a pod nimi jeszcze zakladki (Szkolenia/Baza wiedzy/Zdrowa Wiedza) - wszystko sie tloczy
2. **Elementy zle sie zawijaja** - na mniejszych ekranach przycisk "Tlumacz AI" i wyszukiwarka nakladaja sie na siebie
3. **Pasek postepu AI wyswietla sie i w TranslationsManagement i w DynamicContentTranslation** - podwojny komunikat
4. **TabsList wewnatrz TabsList** - zakladki glowne (Jezyki/Klucze/CMS/JSON/Tresci dynamiczne) + zakladki podrzedne (Szkolenia/Baza/Zdrowa) wyglada chaotycznie

## Rozwiazanie

### Plik: `src/components/admin/DynamicContentTranslation.tsx`

Przeprojektowanie layoutu:

1. **Kontrolki w jednym wierszu** - selektor jezyka i przycisk AI po lewej, wyszukiwarka po prawej, ale z lepszym breakpointem i rozmiarami:
   - Selektor jezyka: `w-[140px]` zamiast `w-48`
   - Przycisk AI: kompaktowy, bez tekstu na mobile (tylko ikona)
   - Wyszukiwarka: `flex-1` zamiast stalej szerokosci

2. **Sekcje zamiast zagniezdzonego Tabs** - zamiast Tabs wewnatrz Tabs, uzyc prostych przyciskow segmentowych (inline flex z `data-active` stylami) lub ToggleGroup z Radix. To usunie wizualny konflikt dwoch TabsList.

3. **Pasek postepu** - bardziej kompaktowy, w jednej linii z mniejszym paddingiem

4. **Mobile-first** - na mobile:
   - Kontrolki ukladaja sie pionowo: jezyk+AI w jednym wierszu, wyszukiwarka w drugim
   - Przyciski sekcji (Szkolenia/Baza/Zdrowa) jako pelna szerokosc, nie TabsList
   - Accordion items z wiekszymi obszarami dotykowymi (min-h-[44px])

### Konkretne zmiany w kodzie

**Kontrolki** (linie 364-398):
```
<div className="flex flex-col gap-2">
  <div className="flex items-center gap-2">
    <Select ...>
      <SelectTrigger className="w-[140px] h-9 text-sm">
    </Select>
    <Button size="sm" ...>
      <Bot className="w-4 h-4" />
      <span className="hidden sm:inline ml-1">Tlumacz AI</span>
    </Button>
    <div className="relative flex-1 min-w-0">
      <Search ... />
      <Input className="pl-8 h-9 text-sm" />
    </div>
  </div>
</div>
```

**Sekcje** (linie 402-416) - zamiana Tabs na proste przyciski:
```
<div className="flex gap-1 p-1 bg-muted rounded-lg">
  <button onClick={() => setActiveSection('training')}
    className={cn("flex-1 px-3 py-1.5 rounded text-sm font-medium transition-colors",
      activeSection === 'training' ? "bg-background shadow-sm" : "text-muted-foreground"
    )}>
    Szkolenia
  </button>
  ...
</div>
```

**Pasek postepu** (linie 346-361) - kompaktowy:
```
<div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
  <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
  <Progress value={progress} className="h-1.5 flex-1" />
  <span className="text-xs text-muted-foreground whitespace-nowrap">
    {activeJob.processed_keys}/{activeJob.total_keys}
  </span>
</div>
```

**Listy elementow** - kompaktniejsze naglowki sekcji i mniejsze paddingi w AccordionItem

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/admin/DynamicContentTranslation.tsx` | Przeprojektowanie layoutu kontrolek, zamiana zagniezdzonego Tabs na przyciski segmentowe, kompaktowy pasek postepu, mobile-first |

