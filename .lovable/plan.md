# Domyślny widok mapy wyśrodkowany na Polskę

## Zmiana
Plik: `src/components/admin/UserWorldMap.tsx`

W inicjalizacji stanu `position` zmienić wartości początkowe tak, aby mapa od razu pokazywała Europę ze środkiem na Polsce (jak na screenie):

```ts
const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({
  coordinates: [19, 52], // Polska (Warszawa ~ 21°E, 52°N — lekko na zachód, by Europa była wyśrodkowana)
  zoom: 4.5,
});
```

Analogicznie `handleReset` ma wracać do tych samych wartości:
```ts
animateTo({ coordinates: [19, 52], zoom: 4.5 }, 600);
```

## Bez zmian
- Cała pozostała logika mapy (klastrowanie, geokodowanie, animacje, filtr po kraju).

## Pliki
- `src/components/admin/UserWorldMap.tsx` — jedyna modyfikacja (2 linie).
