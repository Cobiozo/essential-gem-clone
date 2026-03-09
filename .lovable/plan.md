

# Powiększenie miniaturki do 256px

Zmienić rozmiar rozwiniętej miniaturki z `w-48 h-48` (192px) na `w-64 h-64` (256px) w `src/components/events/EventCardCompact.tsx`, linia 613.

```tsx
// Zmiana:
${isOpen ? 'w-48 h-48' : 'w-20 h-20'}
// Na:
${isOpen ? 'w-64 h-64' : 'w-20 h-20'}
```

Jeden plik, jedna linia.

