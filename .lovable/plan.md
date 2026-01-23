
# Plan: Naprawienie odtwarzania inline wideo

## Problem

Odtwarzanie inline w miniaturce nie działa, ponieważ:
1. Plik wideo jest w **prywatnym bucket** Supabase Storage (`healthy-knowledge`)
2. Bezpośredni URL (`media_url`) wymaga **signed URL** do odtworzenia
3. Obecnie używany jest surowy `<video src={material.media_url}>` - bez podpisanego URL

Dialog podglądu działa, bo używa komponentu `SecureMedia`, który automatycznie generuje signed URLs.

## Rozwiązanie

Zamienić surowy `<video>` i `<audio>` na komponent `SecureMedia` dla odtwarzania inline.

Dodatkowo: dla innych typów (document, image, text) - kliknięcie w miniaturkę otwiera dialog podglądu.

## Zmiany w kodzie

### Plik: `src/pages/HealthyKnowledge.tsx`

**Lokalizacja: linie 246-267 (inline player)**

Przed:
```tsx
{playingId === material.id && material.media_url ? (
  // Inline player
  material.content_type === 'video' ? (
    <video 
      src={material.media_url}
      controls
      autoPlay
      className="w-full h-full object-contain bg-black"
      onEnded={() => setPlayingId(null)}
    />
  ) : material.content_type === 'audio' ? (
    <div className="...">
      <audio 
        src={material.media_url}
        controls
        autoPlay
        ...
      />
    </div>
  ) : null
)
```

Po:
```tsx
{playingId === material.id && material.media_url ? (
  // Inline player using SecureMedia for signed URLs
  <div className="w-full h-full bg-black">
    <SecureMedia
      mediaUrl={material.media_url}
      mediaType={material.content_type as 'video' | 'audio'}
      className="w-full h-full object-contain"
    />
  </div>
)
```

**Lokalizacja: linie 290-312 (Play overlay click)**

Zmiana logiki onClick:
- Dla `video` i `audio` → uruchom inline playback (`setPlayingId(material.id)`)
- Dla innych typów → otwórz dialog podglądu (`handleViewMaterial(material)`)

Przed:
```tsx
{(material.content_type === 'video' || material.content_type === 'audio') && (
  <div 
    className="absolute inset-0 flex items-center justify-center cursor-pointer"
    onClick={(e) => {
      e.stopPropagation();
      setPlayingId(material.id);
      // Increment view count...
    }}
  >
    ...
  </div>
)}
```

Po - dodatkowy handler dla innych typów:
```tsx
{/* Play overlay - for video/audio only */}
{(material.content_type === 'video' || material.content_type === 'audio') && (
  <div 
    className="absolute inset-0 flex items-center justify-center cursor-pointer"
    onClick={(e) => {
      e.stopPropagation();
      setPlayingId(material.id);
      // Increment view count...
    }}
  >
    <div className="p-2 sm:p-3 rounded-full bg-black/50 backdrop-blur-sm group-hover:bg-primary/80 transition-colors">
      <Play className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
    </div>
  </div>
)}

{/* Click overlay for other types - opens preview dialog */}
{material.content_type !== 'video' && material.content_type !== 'audio' && (
  <div 
    className="absolute inset-0 cursor-pointer"
    onClick={(e) => {
      e.stopPropagation();
      handleViewMaterial(material);
    }}
  />
)}
```

## Alternatywnie: Przycisk zamknięcia inline playera

Dodanie przycisku X do zamknięcia inline playera i powrotu do miniaturki:

```tsx
{playingId === material.id && material.media_url ? (
  <div className="relative w-full h-full bg-black">
    <SecureMedia
      mediaUrl={material.media_url}
      mediaType={material.content_type as 'video' | 'audio'}
      className="w-full h-full object-contain"
    />
    {/* Close button */}
    <button
      className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white hover:bg-black/70"
      onClick={(e) => {
        e.stopPropagation();
        setPlayingId(null);
      }}
    >
      <X className="w-4 h-4" />
    </button>
  </div>
)
```

## Podsumowanie zmian

| Element | Przed | Po |
|---------|-------|-----|
| Inline video/audio | Surowy `<video>/<audio>` (nie działa) | `SecureMedia` (signed URL) |
| Kliknięcie miniaturki video/audio | Ustawia `playingId` (nie odtwarza) | Ustawia `playingId` + SecureMedia (odtwarza) |
| Kliknięcie miniaturki document/image/text | Brak reakcji | Otwiera dialog podglądu |
| Zamknięcie playera | Brak | Przycisk X w rogu |

## Import do dodania

```tsx
import { X } from 'lucide-react';  // Jeśli nie jest już zaimportowane
```

`SecureMedia` jest już zaimportowane w pliku (linia 17).
