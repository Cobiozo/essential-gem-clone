

# Dynamiczny import xlsx — plan i oczekiwane rezultaty

## Obecny stan
Wszystkie 3 komponenty z `import * as XLSX from 'xlsx'` sa juz w **lazy-loaded chunkach** (React.lazy):
- `LeaderTeamContactsView` — lazy w `LeaderPanel.tsx`
- `LeaderEventRegistrationsView` — lazy w `LeaderPanel.tsx`
- `PaidEventsOrders` — statyczny w `PaidEventsManagement`, ale caly admin jest lazy w `App.tsx`

**xlsx (~1MB) NIE jest w glownym bundle i NIE powoduje bialej karty.** Problem bialej karty byl spowodowany bugiem `isDev` w `useTranslations.ts` (juz naprawiony).

## Co zmiana da

| Metryka | Przed | Po |
|---------|-------|----|
| Initial bundle (strona startowa/login) | bez zmian | bez zmian |
| Chunk lidera (panel lidera) | zawiera xlsx ~1MB | ~1MB mniej |
| Chunk admina (panel admina) | zawiera xlsx ~1MB | ~1MB mniej |
| Eksport XLSX | natychmiastowy | +0.5-1s przy pierwszym kliknieciu (pobranie xlsx) |

**Realna korzysc**: szybsze ladowanie panelu lidera i admina o ~1MB (po zalogowaniu). Nie wplywa na strone startowa ani logowanie.

## Plan implementacji

### 1. LeaderTeamContactsView.tsx
- Usunac `import * as XLSX from 'xlsx'` (linia 10)
- W funkcji `exportToXlsx` zmienic na async:
```typescript
const exportToXlsx = async () => {
  const XLSX = await import('xlsx');
  // reszta kodu bez zmian
};
```

### 2. LeaderEventRegistrationsView.tsx
- Usunac `import * as XLSX from 'xlsx'` (linia 13)
- W funkcji `exportToXlsx` zmienic na async:
```typescript
const exportToXlsx = async () => {
  const XLSX = await import('xlsx');
  // reszta kodu bez zmian
};
```

### 3. PaidEventsOrders.tsx
- Usunac `import * as XLSX from 'xlsx'` (linia 13)
- W funkcji `exportToExcel` zmienic na async:
```typescript
const exportToExcel = async () => {
  const XLSX = await import('xlsx');
  // reszta kodu bez zmian
};
```

## Wazne zastrzezenie
Ta zmiana **nie naprawi bialej karty na produkcji**. Biala karta byla spowodowana bledem inicjalizacji zmiennej `isDev` w `useTranslations.ts` — ten bug zostal juz naprawiony w poprzedniej zmianie. Po zbudowaniu i wdrozeniu nowej wersji (z poprawka `isDev`) produkcja powinna dzialac poprawnie.

Dynamiczny import xlsx to **optymalizacja wydajnosci** (dobra praktyka), ale nie jest krytyczna.

