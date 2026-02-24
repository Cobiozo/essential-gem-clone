

## 1. Ustandaryzowanie wygladu wszystkich szablonow email

### Obecny stan
- **Logo/naglowek**: Wszystkie 23 szablony juz maja logo (zlote tlo #ffc105) -- to zostalo naprawione wczesniej
- **Footer**: Tylko 8 z 23 szablonow ma `footer_html`, pozostale 15 nie ma zadnego footera. Dodatkowo istniejace footery sa niespojne -- rozne style, rozne tresci
- **Uklad**: Czesc szablonow uzywa `font-family: -apple-system...`, inne `font-family: 'Segoe UI'...` -- brak spojnosci

### Plan zmian

#### A. Ujednolicony footer dla WSZYSTKICH szablonow (migracja SQL)

Ustawienie identycznego `footer_html` dla wszystkich 23 szablonow:

```text
<div style="background-color: #f9fafb; padding: 25px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px 0;">
    Pozdrawiamy, Zespol Pure Life Center
  </p>
  <p style="color: #9ca3af; font-size: 11px; margin: 0 0 5px 0;">
    (c) 2025 Pure Life Center. Wszelkie prawa zastrzezone.
  </p>
  <p style="color: #9ca3af; font-size: 11px; margin: 0;">
    Kontakt: support@purelife.info.pl
  </p>
</div>
```

Jedna instrukcja SQL `UPDATE email_templates SET footer_html = '...'` dla wszystkich rekordow.

#### B. Szablony bez footera (15 sztuk do aktualizacji)
- `activation_email`, `admin_approval`, `guardian_approval`, `individual_meeting_booked`, `individual_meeting_cancelled`, `individual_meeting_confirmed`, `meeting_reminder_1h`, `meeting_reminder_24h`, `password_reset_admin`, `specialist_message`, `training_assigned`, `training_reminder`, `webinar_confirmation`, `webinar_reminder_1h`, `webinar_reminder_24h`

#### C. Szablony z niestandardowym footerem (8 sztuk do nadpisania)
- `admin_notification`, `first_login_welcome`, `meeting_reminder_15min`, `password_changed`, `password_reset`, `system_reminder`, `training_new_lessons`, `welcome_registration`

### Plik do zmian
- **Migracja SQL**: jeden UPDATE na wszystkie 23 szablony

---

## 2. Drag & Drop lekcji w panelu admina

### Obecny stan
- Strzalki ChevronUp/ChevronDown juz dzialaja (swap pozycji w bazie)
- Projekt juz posiada `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` w dependencjach
- Istnieje generyczny `DragDropProvider` w `src/components/dnd/DragDropProvider.tsx`

### Plan zmian

#### A. Dodanie drag & drop do listy lekcji

Plik: `src/components/admin/TrainingManagement.tsx`

Zmiany w sekcji renderowania lekcji (linie ~1520-1688):

1. **Import** `DndContext`, `SortableContext`, `useSortable`, `arrayMove`, `verticalListSortingStrategy`, `CSS`, `closestCenter`, `PointerSensor`, `TouchSensor`, `useSensor`, `useSensors` z `@dnd-kit/core` i `@dnd-kit/sortable`
2. **Dodanie stanu** `activeLesson` dla DragOverlay
3. **Nowa funkcja `handleLessonDragEnd`**: po zakonczeniu przeciagania oblicza nowa kolejnosc, aktualizuje pozycje wszystkich przeniesionych lekcji w bazie i odswierza widok
4. **Owinac liste lekcji** w `DndContext` + `SortableContext`
5. **Kazda karta lekcji** dostaje `useSortable` hook -- uchwyt do przeciagania (ikona GripVertical) + transformacje CSS
6. **DragOverlay** z podgladem przeciaganej lekcji
7. **Strzalki pozostaja** jako alternatywna metoda zmiany kolejnosci

#### B. Wyodrebnienie komponentu `SortableLessonCard`

Aby nie komplikowac i tak duzego pliku TrainingManagement.tsx (2737 linii), wyodrebnie renderowanie pojedynczej karty lekcji do nowego komponentu:

Nowy plik: `src/components/admin/SortableLessonCard.tsx`

- Przyjmuje `lesson`, `index`, `lessonsCount`, callbacki (`onEdit`, `onDelete`, `onMoveUp`, `onMoveDown`)
- Uzywa `useSortable` hooka
- Renderuje karty z uchwytem GripVertical + istniejaca zawartosc (miniatura, badze, przyciski)
- Strzalki gora/dol pozostaja obok uchwytu

#### C. Logika aktualizacji pozycji po drag & drop

```text
handleLessonDragEnd(event):
  1. Pobierz active.id i over.id
  2. Jesli rozne -- uzyj arrayMove na lokalnej tablicy
  3. Zaktualizuj pozycje wszystkich lekcji w bazie (batch update)
  4. Odswierz widok fetchLessons()
```

### Pliki do zmian
- **Nowy**: `src/components/admin/SortableLessonCard.tsx`
- **Edycja**: `src/components/admin/TrainingManagement.tsx` (dodanie DndContext, zamiana renderowania lekcji na SortableLessonCard)
- **Migracja SQL**: ujednolicenie footer_html we wszystkich szablonach email

