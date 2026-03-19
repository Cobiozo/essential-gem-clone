
# Plan: naprawa accordion w sidebarze admina

## Diagnoza
Obecna logika w `src/components/admin/AdminSidebar.tsx` używa wielu niezależnych `Collapsible` i funkcji:
```ts
onOpenChange={() => toggleCategory(category.id)}
```
To ignoruje faktyczną wartość `open/closed` z Radix i powoduje rozjazd stanu przy przełączaniu sekcji. Efekt: zasada „tylko jedna sekcja rozwinięta naraz” nie jest stabilnie egzekwowana.

## Co zmienię

### 1. Uproszczę stan otwartej sekcji
Zamiast:
```ts
openCategories: Record<string, boolean>
```
wprowadzę pojedynczy stan:
```ts
openCategoryId: string | null
```
To lepiej oddaje wymaganie biznesowe: może być otwarta maksymalnie jedna sekcja.

### 2. Poprawię sterowanie rozwijaniem sekcji
W każdej kategorii ustawię kontrolowane otwieranie:
- sekcja otwarta, gdy `openCategoryId === category.id`
- kliknięcie sekcji ustawia:
  - `category.id`, jeśli ma się otworzyć
  - `null`, jeśli ma się zamknąć

Czyli logika będzie oparta o rzeczywiste `nextOpen` z `onOpenChange`, a nie o ręczne „toggle” bez znajomości nowego stanu.

### 3. Zachowam start z całkowicie zwiniętym menu
Na wejściu do `/admin`:
- sidebar ma być widoczny
- żadna sekcja nie ma być rozwinięta

To oznacza:
```ts
const [openCategoryId, setOpenCategoryId] = useState<string | null>(null)
```

### 4. Dopasuję ikonę strzałki do realnego stanu
Chevron będzie obracany na podstawie:
```ts
openCategoryId === category.id
```
żeby stan wizualny zawsze zgadzał się z zawartością.

### 5. Zachowam wyszukiwarkę
Podczas aktywnego wyszukiwania pozostawię obecne zachowanie:
- pokazywane są tylko pasujące elementy
- pasujące kategorie mogą być pokazane rozwinięte automatycznie

Po wyczyszczeniu wyszukiwania wraca normalna zasada accordion:
- wszystko zamknięte lub
- jedna sekcja otwarta ręcznie przez admina

## Pliki do zmiany
- `src/components/admin/AdminSidebar.tsx` — główna naprawa logiki otwierania sekcji
- opcjonalnie bez zmian w `src/pages/Admin.tsx`, jeśli sidebar jako całość ma pozostać widoczny i już ma `defaultOpen={true}`

## Efekt po wdrożeniu
- po wejściu do panelu admina żadna sekcja nie będzie rozwinięta
- admin sam wybiera, którą sekcję otworzyć
- otwarcie nowej sekcji automatycznie zamknie poprzednią
- wyszukiwarka nadal będzie działać niezależnie od tego mechanizmu
