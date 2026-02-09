
# Plan: Naprawa wyświetlania treści na urządzeniach mobilnych

## Zidentyfikowane problemy

### Problem 1: KRYTYCZNY - Tabela modułów szkoleń w panelu administratora

**Lokalizacja:** `src/components/admin/TrainingManagement.tsx` (linie 1175-1285)

**Opis:** Na screenie widać tekst w kolumnach tabeli wyświetlany **pionowo** (litera pod literą) zamiast poziomo. Problem wynika z:
- Tabela z 5 kolumnami: "Nazwa modułu", "Lekcje", "Status", "Widoczność", "Akcje"
- Na małych ekranach komponent `Table` ma `overflow-auto`, ale kolumny mają sztywne szerokości (`w-20`, `w-28`, `w-36`)
- Gdy szerokość ekranu jest mniejsza niż suma minimalnych szerokości kolumn, tekst w nagłówkach kompresuje się pionowo

**Rozwiązanie:** Zamiana tabeli na responsywny układ kart dla urządzeń mobilnych - tabela będzie widoczna tylko na desktopie (`hidden md:block`), a karty na mobile.

---

### Problem 2: Długie tytuły lekcji w TrainingModule

**Lokalizacja:** `src/pages/TrainingModule.tsx` (linie 1384-1386)

**Opis:** Obecnie tytuł lekcji ma klasy `break-words line-clamp-2 text-lg sm:text-xl lg:text-2xl flex-1 min-w-0`. To jest poprawne podejście, ale na bardzo małych ekranach długie słowa (np. "OMEGA-3") mogą rozciągać kontener.

**Rozwiązanie:** Dodanie `overflow-hidden` i `word-break: break-word` do tytułu oraz upewnienie się, że nadrzędny flex container nie rozciąga się.

---

### Problem 3: Lista lekcji na bocznym panelu (mobile)

**Lokalizacja:** `src/pages/TrainingModule.tsx` (linie 1288-1298)

**Opis:** Tytuły lekcji na liście mają tylko `truncate`, co jest OK dla jednej linii, ale mogą rozciągać kontener gdy kontener ma zmienną szerokość.

**Rozwiązanie:** Dodanie `overflow-hidden` i `max-w-full` do kontenera tytułu.

---

### Problem 4: Inne tabele w panelu administracyjnym

**Lokalizacja:** Wiele plików w `src/components/admin/`:
- HealthyKnowledgeManagement.tsx
- HtmlPagesManagement.tsx
- WebinarList.tsx
- TeamTrainingList.tsx
- NotificationSystemManagement.tsx
- I inne...

**Opis:** Wszystkie te komponenty używają komponentu `Table` bez responsywnego fallbacku dla mobile.

**Rozwiązanie:** Globalny styl CSS dla tabel w panelu administratora - wymuszenie minimalnej szerokości tabeli i poziomego przewijania na mobile z wyraźnym wskaźnikiem.

---

## Szczegóły implementacji

### Zmiana 1: Responsywna tabela modułów szkoleń

**Plik:** `src/components/admin/TrainingManagement.tsx`

Zamiana sekcji tabeli (linie 1175-1285) na dwa warianty:
1. **Mobile (domyślne):** Lista kart z najważniejszymi informacjami
2. **Desktop (md:block):** Obecna tabela

```tsx
{/* Mobile: Card layout */}
<div className="space-y-3 md:hidden">
  {modules.map((module) => {
    const lessonCount = lessons.filter(l => l.module_id === module.id).length;
    return (
      <Card key={module.id} className={cn(!module.is_active && "opacity-60")}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{module.title}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant={module.is_active ? "default" : "secondary"} className="text-xs">
                  {module.is_active ? "Aktywny" : "Nieaktywny"}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {lessonCount} lekcji
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">
                {getVisibilityText(module)}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {/* Akcje w dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {/* ... akcje ... */}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  })}
</div>

{/* Desktop: Table layout */}
<div className="rounded-md border hidden md:block">
  <Table>
    {/* ... istniejąca tabela ... */}
  </Table>
</div>
```

---

### Zmiana 2: Lepsze zabezpieczenie tytułów lekcji

**Plik:** `src/pages/TrainingModule.tsx`

Linia 1384 - CardTitle:
```tsx
<CardTitle className="break-words line-clamp-2 text-lg sm:text-xl lg:text-2xl flex-1 min-w-0 overflow-hidden" style={{ wordBreak: 'break-word' }}>
  {currentLesson.title}
</CardTitle>
```

Linie 1288-1298 - lista lekcji mobile:
```tsx
<div className="flex items-center gap-2 mb-1 min-w-0">
  {/* icon */}
  <span className="text-sm font-medium truncate max-w-[calc(100%-24px)]">
    {lesson.title}
  </span>
</div>
```

---

### Zmiana 3: Globalny CSS dla tabel administracyjnych

**Plik:** `src/index.css`

Dodanie stylów wymuszających poprawne zachowanie tabel:

```css
/* Admin tables - ensure horizontal scroll on small screens */
@media (max-width: 767px) {
  /* Table containers in admin should have horizontal scroll indicator */
  .rounded-md.border:has(table) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  
  /* Table cells should not wrap text vertically */
  table th,
  table td {
    white-space: nowrap;
  }
  
  /* But allow specific cells to wrap */
  table th.allow-wrap,
  table td.allow-wrap {
    white-space: normal;
  }
  
  /* Minimum table width to prevent column compression */
  table {
    min-width: 600px;
  }
}
```

---

### Zmiana 4: Poprawa nagłówków tabeli

**Plik:** `src/components/admin/TrainingManagement.tsx`

Dodanie `whitespace-nowrap` do nagłówków tabeli:

```tsx
<TableHead className="whitespace-nowrap">{t('admin.training.moduleName')}</TableHead>
<TableHead className="w-20 text-center whitespace-nowrap">{t('admin.training.lessons')}</TableHead>
<TableHead className="w-28 whitespace-nowrap">{t('admin.training.status')}</TableHead>
<TableHead className="whitespace-nowrap">{t('admin.training.visibleTo')}</TableHead>
<TableHead className="text-right w-36 whitespace-nowrap">{t('admin.training.actions')}</TableHead>
```

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/components/admin/TrainingManagement.tsx` | Responsywny układ: karty na mobile, tabela na desktop |
| `src/pages/TrainingModule.tsx` | Lepsze zabezpieczenie długich tytułów lekcji |
| `src/index.css` | Globalne style dla tabel administracyjnych na mobile |

---

## Oczekiwane rezultaty

1. **Panel administratora (Szkolenia):** Czytelne karty na mobile zamiast skompresowanej tabeli
2. **TrainingModule:** Długie tytuły nie rozciągają ekranu
3. **Wszystkie tabele:** Poziome przewijanie zamiast pionowej kompresji tekstu
4. **Konsystentne UX:** Wszystkie elementy czytelne na urządzeniach mobilnych

---

## Dodatkowe zalecenia

Po wdrożeniu zmian przetestuj na:
- iPhone SE (najmniejszy ekran)
- iPhone 14 Pro Max (największy iPhone)
- Tablet w orientacji pionowej
- Różne przeglądarki (Safari, Chrome)
