

# Plan: Wyświetlanie "Dnia dzisiejszego" w WelcomeWidget

## Podejście

Stworzyć statyczną mapę światowych/międzynarodowych dni przypisanych do dat (klucz: `MM-DD`), i wyświetlić odpowiedni wpis pod datą w WelcomeWidget. Podejście statyczne jest najszybsze, darmowe i nie wymaga API.

## Zmiany

### 1. Nowy plik: `src/utils/worldDays.ts`

Mapa ~150-200 najważniejszych międzynarodowych/światowych dni w formacie:

```typescript
export const WORLD_DAYS: Record<string, string[]> = {
  '01-01': ['Nowy Rok', 'Światowy Dzień Pokoju'],
  '01-27': ['Międzynarodowy Dzień Pamięci o Ofiarach Holokaustu'],
  '02-14': ['Walentynki', 'Międzynarodowy Dzień Epilepsji'],
  '03-08': ['Międzynarodowy Dzień Kobiet'],
  '03-20': ['Międzynarodowy Dzień Szczęścia', 'Pierwszy Dzień Wiosny'],
  // ... itd.
};

export function getTodayWorldDays(): string[] {
  const now = new Date();
  const key = `${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  return WORLD_DAYS[key] || [];
}
```

### 2. Edycja: `src/components/dashboard/widgets/WelcomeWidget.tsx`

Pod linią z `formattedDate` (linia 128-129) dodać wyświetlanie dnia:

```tsx
<p className="text-muted-foreground capitalize">
  {formattedDate}
</p>
{todayWorldDays.length > 0 && (
  <p className="text-sm text-gold/80 flex items-center gap-1.5">
    🎉 {t('dashboard.today_is') || 'Dziś jest'}: {todayWorldDays.join(' • ')}
  </p>
)}
```

Mapa będzie zawierać polskie i międzynarodowe święta/dni tematyczne — ok. 150+ wpisów pokrywających cały rok.

### Pliki do edycji:
1. **Nowy**: `src/utils/worldDays.ts`
2. **Edycja**: `src/components/dashboard/widgets/WelcomeWidget.tsx`

