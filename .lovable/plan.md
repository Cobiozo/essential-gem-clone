

# Powiększenie miniaturki — większy rozmiar

Zmienić rozmiar rozwiniętej miniaturki z `w-32 h-32` (128px) na `w-48 h-48` (192px) w `src/components/events/EventCardCompact.tsx`, linia 613. Animacja `transition-all duration-300` już jest — zapewnia płynność.

```tsx
// Zmiana:
${isOpen ? 'w-32 h-32' : 'w-20 h-20'}
// Na:
${isOpen ? 'w-48 h-48' : 'w-20 h-20'}
```

Jedna zmiana, jeden plik.

