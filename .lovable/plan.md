
# Naprawa: pasek informacyjny na pulpicie użytkownika pokazuje tylko kropki

## Co najpewniej jest zepsute
Problem nie wygląda już na dane, tylko na renderowanie w trybie `scroll` na dashboardzie użytkownika.

Najbardziej prawdopodobna przyczyna:
- elementy tickera w marquee mogą się zwijać do szerokości `0` w kontenerze flex
- wtedy zostają widoczne prawie wyłącznie separatory `•`
- w podglądzie admina wygląda dobrze, bo układ i/lub zestaw elementów jest inny

Dodatkowo w hooku tickera rola nadal jest brana z `profile?.role`, mimo że aplikacja trzyma role w `user_roles`. To może powodować inny zestaw elementów dla użytkownika niż w rzeczywistym widoku.

## Plan wdrożenia

### 1. Usztywnić layout marquee, żeby elementy nie zapadały się do zera
**Pliki:**
- `src/components/news-ticker/NewsTicker.tsx`
- `src/components/news-ticker/TickerItem.tsx`

**Zmiany:**
- w trybie `scroll` nadać każdemu elementowi tickera klasy typu `flex-shrink-0` / `w-max` / `min-w-max`
- separator `•` też ustawić jako `shrink-0`
- kontener marquee doprecyzować pod poziomy przepływ (`items-center`, ewentualnie `w-max`)
- nie używać w marquee klas, które mogą ucinać szerokość całego itemu (`max-w-full overflow-hidden` na root dla scrolla)

Efekt: tekst i ikona każdego komunikatu zachowają swoją naturalną szerokość i nie znikną, nawet gdy komunikatów jest dużo.

### 2. Rozdzielić stylowanie dla trybu `scroll` oraz `rotate/static`
**Plik:**
- `src/components/news-ticker/TickerItem.tsx`

**Zmiany:**
- dodać osobny wariant renderowania dla marquee, np. przez prop `mode="scroll" | "wrap"`
- w `scroll`:
  - bez zawijania
  - bez `truncate`
  - bez klas ściskających szerokość
- w `rotate/static`:
  - zostawić obecne bezpieczne zawijanie dla mobile

Efekt: naprawa nie popsuje trybu rotacyjnego i statycznego.

### 3. Ujednolicić źródło roli użytkownika w tickerze
**Plik:**
- `src/components/news-ticker/useNewsTickerData.ts`

**Zmiany:**
- zamiast `profile?.role || 'user'` użyć `userRole?.role` z `useAuth()`
- zostawić zgodność z adminem przez `isAdmin`
- filtrowanie widoczności elementów wykonywać na tej samej roli, której używa reszta aplikacji

Efekt: dashboard partnera/specjalisty dostanie właściwy zestaw komunikatów, zgodny z konfiguracją.

## Zakres plików
| Plik | Zmiana |
|---|---|
| `src/components/news-ticker/NewsTicker.tsx` | usztywnienie marquee i separatorów |
| `src/components/news-ticker/TickerItem.tsx` | osobny wariant dla scroll vs wrap |
| `src/components/news-ticker/useNewsTickerData.ts` | rola z `userRole`, nie z `profile.role` |

## Oczekiwany rezultat
- na pulpicie głównym użytkowników będą widoczne pełne treści tickera, nie same kropki
- preview admina i realny dashboard użytkownika będą zachowywać się spójniej
- duża liczba komunikatów nie będzie już ściskać elementów do zera
