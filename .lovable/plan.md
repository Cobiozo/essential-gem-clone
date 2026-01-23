

# Plan: Klikalna miniaturka z odtwarzaniem wideo

## Problem

Przycisk Play na miniaturce jest tylko wizualnym elementem bez funkcjonalności - kliknięcie w niego nic nie robi. Użytkownik oczekuje, że kliknięcie w miniaturkę (lub ikonę Play) uruchomi odtwarzanie materiału.

## Proponowane rozwiązanie

Dodanie kliknięcia w całą miniaturkę, które otworzy dialog podglądu i automatycznie rozpocznie odtwarzanie wideo/audio.

## Wizualne zachowanie

```text
PRZED:
┌────────────────────────────────┐
│                                │
│           [ ▶ ]                │  ← Tylko dekoracja, nic nie robi
│                                │
└────────────────────────────────┘

PO:
┌────────────────────────────────┐
│                                │
│           [ ▶ ]                │  ← Kliknięcie otwiera podgląd
│     (kursor: pointer)          │     i uruchamia odtwarzanie
│                                │
└────────────────────────────────┘
```

## Zmiany do wprowadzenia

### Plik: `src/pages/HealthyKnowledge.tsx`

**1. Dodanie kursora i handlera onClick do miniaturki (linie 242-276)**

Zamiast statycznego `div` z miniaturką, dodajemy:
- `cursor-pointer` dla wskazania klikalności
- `onClick={() => handleViewMaterial(material)}` aby otworzyć podgląd
- Efekt hover pozostaje bez zmian (scale, zmiana koloru Play)

```tsx
{/* Thumbnail/Cover Image - KLIKALNE */}
<div 
  className="relative aspect-video bg-muted overflow-hidden cursor-pointer"
  onClick={() => handleViewMaterial(material)}
>
  {/* Istniejąca zawartość miniaturki bez zmian */}
  {material.thumbnail_url ? (
    <img ... />
  ) : ...}
  
  {/* Play overlay - teraz reaguje na kliknięcie */}
  {(material.content_type === 'video' || material.content_type === 'audio') && (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="p-4 rounded-full bg-black/50 backdrop-blur-sm group-hover:bg-primary/80 transition-colors">
        <Play className="w-8 h-8 text-white" />
      </div>
    </div>
  )}
  ...
</div>
```

## Podsumowanie

| Element | Przed | Po |
|---------|-------|-----|
| Kliknięcie w miniaturkę | Brak reakcji | Otwiera dialog podglądu |
| Kliknięcie w Play | Brak reakcji | Otwiera dialog podglądu |
| Kursor na miniaturce | Domyślny | Pointer (rączka) |
| Przycisk "Podgląd" | Działa | Działa (bez zmian) |

Zmiana jest minimalna - wystarczy dodać `cursor-pointer` i `onClick` do istniejącego elementu miniaturki.

