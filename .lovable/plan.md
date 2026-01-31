

# Plan: Naprawa wyświetlania wideo na mobile - długie tytuły

## Problem ze screenshota

Na iPhonie wideo jest ucięte bo:

1. **Długi tytuł lekcji** "CZEGO NIE MÓWIĆ O OMEGA-3? CZ. 1 (OBIETNICE EFSA)" rozciąga CardHeader i wypycha wideo poza ekran
2. **Lista lekcji** na mobile jest wyświetlana nad wideo, zabierając cenną przestrzeń 
3. **Tytuł nie zawija się** - brak `break-words` powoduje że długie słowa rozciągają kontener
4. **Brak ograniczenia linii** - tytuł może mieć dowolną liczbę linii

## Rozwiązanie

### 1. Zawijanie i ograniczenie tytułu lekcji

W `CardHeader` dla lekcji (linia 1262-1263):

```tsx
// PRZED
<div className="flex items-center justify-between">
  <CardTitle>{currentLesson.title}</CardTitle>
  ...
</div>

// PO
<div className="flex items-start justify-between gap-2">
  <CardTitle className="break-words line-clamp-2 text-lg sm:text-xl lg:text-2xl flex-1 min-w-0">
    {currentLesson.title}
  </CardTitle>
  ...
</div>
```

Zmiany:
- `items-center` → `items-start` (wyrównanie do góry gdy tytuł jest wieloliniowy)
- `gap-2` - odstęp między tytułem a przyciskami
- `break-words` - zawijanie długich słów
- `line-clamp-2` - maksymalnie 2 linie z wielokropkiem
- `text-lg sm:text-xl lg:text-2xl` - mniejszy font na mobile
- `flex-1 min-w-0` - pozwala na kurczenie się tytułu

### 2. Zwijana lista lekcji na mobile

Zamiast wyświetlać całą listę lekcji na górze na mobile, zrobimy ją zwijalną (collapsible):

```tsx
// Na mobile: lista lekcji w zwijanym panelu
<div className="lg:col-span-1">
  <Card>
    <Collapsible defaultOpen={false} className="lg:hidden">
      <CollapsibleTrigger asChild>
        <CardHeader className="cursor-pointer">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Lekcje ({currentLessonIndex + 1}/{lessons.length})</CardTitle>
            <ChevronDown className="h-4 w-4 transition-transform" />
          </div>
        </CardHeader>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <CardContent>...</CardContent>
      </CollapsibleContent>
    </Collapsible>
    
    {/* Na desktop: normalna lista */}
    <div className="hidden lg:block">
      <CardHeader><CardTitle>Lekcje</CardTitle></CardHeader>
      <CardContent>...</CardContent>
    </div>
  </Card>
</div>
```

### 3. Mniejszy padding na mobile

Zmniejszyć padding w głównym kontenerze na mobile:

```tsx
// PRZED
<div className="container mx-auto px-4 py-8">

// PO  
<div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
```

### 4. Kompaktowy header lekcji na mobile

CardHeader z mniejszym paddingiem na mobile:

```tsx
<CardHeader className="p-4 sm:p-6">
```

---

## Szczegóły techniczne

### Plik: `src/pages/TrainingModule.tsx`

| Lokalizacja | Zmiana |
|-------------|--------|
| Linia ~1197 | Zmniejszyć padding: `px-2 sm:px-4 py-4 sm:py-8` |
| Linia ~1199-1257 | Dodać `Collapsible` wrapper dla listy lekcji na mobile |
| Linia ~1261-1263 | CardHeader: `p-4 sm:p-6` |
| Linia ~1262 | Flex: `items-start gap-2` zamiast `items-center` |
| Linia ~1263 | CardTitle: dodać `break-words line-clamp-2 text-lg sm:text-2xl flex-1 min-w-0` |
| Linia ~1301 | CardContent: `p-4 sm:p-6` |

### Import do dodania

```tsx
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
```

---

## Rezultat

Po zmianach:

1. **Długi tytuł** - będzie zawijany i ograniczony do 2 linii z wielokropkiem
2. **Lista lekcji na mobile** - domyślnie zwinięta, użytkownik może rozwinąć gdy potrzebuje
3. **Więcej miejsca na wideo** - dzięki kompaktowym marginesom i ukrytej liście lekcji
4. **Wideo nie będzie ucinane** - więcej przestrzeni dla playera

