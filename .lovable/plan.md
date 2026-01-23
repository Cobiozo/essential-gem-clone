

# Plan: Kompaktowe kafelki z inline odtwarzaniem wideo

## Problem

1. **Kliknięcie w miniaturkę otwiera dialog** - użytkownik chce odtwarzania bezpośrednio w miniaturce
2. **Za duże kafelki** - na telefonie mieści się tylko 1 pozycja, a powinny być 2-4

## Proponowane rozwiązanie

### 1. Inline odtwarzanie wideo w miniaturce

Kliknięcie w Play zamienia miniaturkę na odtwarzacz wideo bez otwierania dialogu:

```text
PRZED (kliknięcie):
┌────────────────┐     ┌─────────────────────────┐
│  [miniaturka]  │ ──► │   [DIALOG PODGLĄDU]     │
│      ▶         │     │      [VIDEO]            │
└────────────────┘     └─────────────────────────┘

PO (kliknięcie):
┌────────────────┐     ┌────────────────┐
│  [miniaturka]  │ ──► │   [VIDEO ▶]    │
│      ▶         │     │  (odtwarza)    │
└────────────────┘     └────────────────┘
```

**Mechanizm:**
- Dodanie stanu `playingId` - ID aktualnie odtwarzanego materiału
- Kliknięcie w Play ustawia `playingId = material.id`
- Zamiast miniaturki wyświetla się `<video>` lub `<audio>` z kontrolkami
- Zamknięcie (klik poza) resetuje `playingId`

### 2. Kompaktowy layout kafelków

**Grid na mobile:** `grid-cols-2` zamiast `grid-cols-1`

**Zmniejszone elementy:**
- Miniaturka: `aspect-[4/3]` zamiast `aspect-video` (16:9)
- Padding: mniejszy w CardHeader i CardContent
- Tytuł: `text-sm` zamiast `text-lg`, `line-clamp-1`
- Opis: ukryty na mobile
- Metadata: ukryta lub zminimalizowana na mobile
- Przyciski: mniejsze, tylko ikony na mobile

```text
MOBILE - PRZED (1 kafelek na ekran):
┌────────────────────────────────────────┐
│ ┌────────────────────────────────────┐ │
│ │                                    │ │
│ │         [DUŻA MINIATURKA]          │ │
│ │              ▶                     │ │
│ │                                    │ │
│ └────────────────────────────────────┘ │
│ [▶] Wideo                              │
│ Tytuł materiału który jest dłu...      │
│ Opis materiału edukacyjnego...         │
│ Kategoria · 5 min · 👁 12              │
│ [Podgląd]  [Udostępnij]                │
└────────────────────────────────────────┘

MOBILE - PO (2-4 kafelki na ekran):
┌──────────────────┐ ┌──────────────────┐
│ ┌──────────────┐ │ │ ┌──────────────┐ │
│ │   [mini]  ▶  │ │ │ │   [mini]  ▶  │ │
│ └──────────────┘ │ │ └──────────────┘ │
│ Tytuł materia... │ │ Inny materiał... │
│ [👁] [↗️]         │ │ [👁] [↗️]         │
└──────────────────┘ └──────────────────┘
┌──────────────────┐ ┌──────────────────┐
│ ...              │ │ ...              │
└──────────────────┘ └──────────────────┘
```

## Zmiany w kodzie

### Plik: `src/pages/HealthyKnowledge.tsx`

**1. Nowy stan dla inline odtwarzania:**
```tsx
const [playingId, setPlayingId] = useState<string | null>(null);
```

**2. Zmiana gridu:**
```tsx
// Przed:
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Po:
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
```

**3. Miniaturka z inline player:**
```tsx
<div className="relative aspect-[4/3] bg-muted overflow-hidden">
  {playingId === material.id && material.media_url ? (
    // Inline player
    <video 
      src={material.media_url}
      controls
      autoPlay
      className="w-full h-full object-contain bg-black"
      onEnded={() => setPlayingId(null)}
    />
  ) : (
    <>
      {/* Miniaturka jak dotychczas */}
      {material.thumbnail_url ? <img .../> : ...}
      
      {/* Play button - uruchamia inline */}
      {(material.content_type === 'video' || material.content_type === 'audio') && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setPlayingId(material.id);
          }}
        >
          <div className="p-2 sm:p-3 rounded-full bg-black/50">
            <Play className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
          </div>
        </div>
      )}
    </>
  )}
</div>
```

**4. Kompaktowy CardHeader:**
```tsx
<CardHeader className="p-2 sm:p-4 pb-1 sm:pb-2">
  {/* Ukryj badge typu na mobile */}
  <div className="hidden sm:flex items-center gap-2">
    ...
  </div>
  <CardTitle className="text-xs sm:text-base font-medium line-clamp-1 sm:line-clamp-2">
    {material.title}
  </CardTitle>
  {/* Opis tylko na desktop */}
  {material.description && (
    <CardDescription className="hidden sm:block line-clamp-2 text-xs">
      {material.description}
    </CardDescription>
  )}
</CardHeader>
```

**5. Kompaktowy CardContent:**
```tsx
<CardContent className="p-2 sm:p-4 pt-0">
  {/* Metadata ukryta na mobile */}
  <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground mb-3">
    ...
  </div>
  
  {/* Przyciski - ikony na mobile */}
  <div className="flex gap-1 sm:gap-2">
    <Button 
      variant="outline" 
      size="sm" 
      className="flex-1 h-7 sm:h-8 text-xs"
      onClick={() => handleViewMaterial(material)}
    >
      <Eye className="w-3 h-3 sm:mr-1" />
      <span className="hidden sm:inline">Podgląd</span>
    </Button>
    {canShare && material.allow_external_share && (
      <Button 
        size="sm" 
        className="flex-1 h-7 sm:h-8 text-xs"
        onClick={() => handleOpenShare(material)}
      >
        <Share2 className="w-3 h-3 sm:mr-1" />
        <span className="hidden sm:inline">Udostępnij</span>
      </Button>
    )}
  </div>
</CardContent>
```

## Podsumowanie zmian

| Element | Przed | Po |
|---------|-------|-----|
| Grid mobile | 1 kolumna | 2 kolumny |
| Proporcje miniaturki | 16:9 (aspect-video) | 4:3 (kompaktowe) |
| Kliknięcie w Play | Otwiera dialog | Odtwarza inline w kafelku |
| Tytuł mobile | text-lg, 2 linie | text-xs, 1 linia |
| Opis mobile | Widoczny | Ukryty |
| Metadata mobile | Widoczna | Ukryta |
| Przyciski mobile | Tekst + ikona | Tylko ikony |
| Padding | Standardowy | Zmniejszony na mobile |

