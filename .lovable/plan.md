
# Plan: Naprawa wyświetlania postępów szkoleń i nowe funkcje zarządzania lekcjami

## Zidentyfikowane problemy

### Problem 1: Postęp użytkowników pokazuje 0% zamiast rzeczywistych wartości

**Przyczyna:** Zapytanie do tabeli `training_progress` w funkcji `fetchUserProgress` nie ma ustawionego limitu i domyślnie Supabase zwraca max 1000 wierszy. W bazie jest obecnie **1290 rekordów** - część danych jest obcinana.

**Dane w bazie dla Szymona Latocha:**
- Moduł BIZNESOWE: 14 ukończonych lekcji z 21 aktywnych = 67%
- Panel admina pokazuje: 0%

### Problem 2: Brak opcji zmiany kolejności lekcji

Formularz `LessonForm` nie zawiera pola `position`. Admin nie może zmienić kolejności lekcji w module.

### Problem 3: Brak powiadomień o zmianie materiału wideo

Przy edycji lekcji (w `saveLesson`) powiadomienia są wysyłane tylko dla NOWYCH lekcji, nie przy aktualizacji materiału wideo.

---

## Rozwiązanie

### Faza 1: Naprawa pobierania postępów (limit danych)

**Plik:** `src/components/admin/TrainingManagement.tsx`

Zmiana w funkcji `fetchUserProgress` - dodanie zakresu do zapytania `training_progress`:

**Przed (linia 617-619):**
```typescript
const { data: progressData, error: progressError } = await supabase
  .from('training_progress')
  .select('user_id, lesson_id, is_completed, time_spent_seconds, video_position_seconds');
```

**Po:**
```typescript
const { data: progressData, error: progressError } = await supabase
  .from('training_progress')
  .select('user_id, lesson_id, is_completed, time_spent_seconds, video_position_seconds')
  .limit(10000); // Zwiększenie limitu z domyślnych 1000
```

**Alternatywa (lepsza):** Pobieranie postępów tylko dla użytkowników z przypisaniami:
```typescript
// Najpierw zbierz wszystkich userId z assignments
const userIds = [...new Set(assignments?.map(a => a.user_id) || [])];

// Potem pobierz progress tylko dla tych użytkowników
const { data: progressData, error: progressError } = await supabase
  .from('training_progress')
  .select('user_id, lesson_id, is_completed, time_spent_seconds, video_position_seconds')
  .in('user_id', userIds);
```

Ta optymalizacja:
- Pobiera tylko potrzebne dane (nie wszystkie rekordy)
- Unika problemu limitu 1000 wierszy
- Jest szybsza dla dużych zbiorów danych

---

### Faza 2: Dodanie pola pozycji do formularza lekcji

**Plik:** `src/components/admin/TrainingManagement.tsx`

#### 2.1 Rozszerzenie formData w LessonForm (linia ~1892):

```typescript
const [formData, setFormData] = useState({
  title: lesson?.title || "",
  content: lesson?.content || "",
  media_url: lesson?.media_url || "",
  media_type: lesson?.media_type || "",
  media_alt_text: lesson?.media_alt_text || "",
  min_time_seconds: lesson?.min_time_seconds || 60,
  video_duration_seconds: lesson?.video_duration_seconds || 0,
  is_required: lesson?.is_required ?? true,
  is_active: lesson?.is_active ?? true,
  action_buttons: lesson?.action_buttons || [],
  position: lesson?.position ?? 0, // NOWE POLE
});
```

#### 2.2 Dodanie pola input w formularzu (po polu tytułu, około linii 1940):

```tsx
<div>
  <Label htmlFor="lesson-position">Pozycja (kolejność)</Label>
  <Input
    id="lesson-position"
    type="number"
    min="0"
    value={formData.position}
    onChange={(e) => {
      const value = e.target.value === '' ? 0 : parseInt(e.target.value);
      setFormData(prev => ({ 
        ...prev, 
        position: isNaN(value) ? 0 : value
      }));
    }}
    placeholder="np. 1, 2, 3..."
  />
  <p className="text-xs text-muted-foreground mt-1">
    Mniejsza liczba = wyżej na liście. Lekcje są sortowane rosnąco.
  </p>
</div>
```

#### 2.3 Dodanie obsługi zmiany pozycji w `saveLesson`:

Przy edycji lekcji, jeśli pozycja się zmieniła - przesuń inne lekcje automatycznie:

```typescript
// W saveLesson, po zapisaniu lekcji:
if (editingLesson && editingLesson.position !== lessonData.position) {
  // Reorganizuj pozycje innych lekcji
  const { data: moduleLessons } = await supabase
    .from('training_lessons')
    .select('id, position')
    .eq('module_id', selectedModule)
    .neq('id', editingLesson.id)
    .order('position');

  // Przeindeksuj pozycje aby uniknąć duplikatów
  const updates = moduleLessons?.map((l, idx) => ({
    id: l.id,
    position: l.position >= lessonData.position ? idx + 1 : idx
  }));

  if (updates) {
    for (const update of updates) {
      await supabase
        .from('training_lessons')
        .update({ position: update.position })
        .eq('id', update.id);
    }
  }
}
```

---

### Faza 3: Powiadomienia o zmianie materiału wideo

**Plik:** `src/components/admin/TrainingManagement.tsx`

W funkcji `saveLesson`, po zapisaniu edycji lekcji, dodać wysyłanie powiadomień gdy zmieniono media_url:

```typescript
if (editingLesson) {
  // Sprawdź czy materiał wideo został zmieniony
  const oldMediaUrl = editingLesson.media_url;
  const newMediaUrl = lessonData.media_url;
  
  if (oldMediaUrl && newMediaUrl && oldMediaUrl !== newMediaUrl) {
    // ... istniejący kod usuwania starego pliku ...
    
    // NOWE: Wyślij powiadomienia do użytkowników z postępem w tym module
    try {
      const { data: moduleData } = await supabase
        .from('training_modules')
        .select('title')
        .eq('id', selectedModule)
        .single();
      
      const moduleTitle = moduleData?.title || 'szkolenia';
      
      // Pobierz użytkowników z postępem w tym module
      const { data: usersWithProgress } = await supabase
        .from('training_progress')
        .select('user_id, training_lessons!inner(module_id)')
        .eq('training_lessons.module_id', selectedModule);
      
      const uniqueUserIds = [...new Set(usersWithProgress?.map(p => p.user_id) || [])];
      
      if (uniqueUserIds.length > 0) {
        const notifications = uniqueUserIds.map(userId => ({
          user_id: userId,
          notification_type: 'training_content_updated',
          source_module: 'training',
          title: 'Zaktualizowano materiały szkoleniowe',
          message: `Materiał wideo w lekcji "${lessonData.title}" modułu ${moduleTitle} został zaktualizowany. Sprawdź nowe treści!`,
          link: `/training/${selectedModule}`,
          metadata: {
            module_id: selectedModule,
            module_title: moduleTitle,
            lesson_id: editingLesson.id,
            lesson_title: lessonData.title,
            update_type: 'video_replaced'
          }
        }));
        
        await supabase.from('user_notifications').insert(notifications);
        console.log(`📧 Sent ${uniqueUserIds.length} notifications about video update`);
        
        toast({
          title: "Powiadomienia wysłane",
          description: `${uniqueUserIds.length} użytkowników zostało powiadomionych o zmianie materiału`,
        });
      }
    } catch (notifError) {
      console.error('Error sending update notifications:', notifError);
    }
  }
  
  // ... reszta istniejącej logiki zapisu ...
}
```

---

### Faza 4: Wyświetlanie pozycji w liście lekcji

Aktualizacja widoku listy lekcji aby pokazywać numer pozycji (nie tylko index):

**Linia ~1343:**
```tsx
{/* Przed: */}
<h4 className="font-semibold text-sm truncate">
  {index + 1}. {lesson.title}
</h4>

{/* Po: */}
<h4 className="font-semibold text-sm truncate">
  <span className="text-muted-foreground mr-1">#{lesson.position}</span>
  {lesson.title}
</h4>
```

---

## Podsumowanie zmian

| Plik | Zmiana | Efekt |
|------|--------|-------|
| `TrainingManagement.tsx` | Optymalizacja `fetchUserProgress` - filtrowanie po userId | Naprawa pobierania postępów (przekroczenie limitu 1000) |
| `TrainingManagement.tsx` | Dodanie pola `position` do `LessonForm` | Admin może zmieniać kolejność lekcji |
| `TrainingManagement.tsx` | Dodanie logiki powiadomień przy zmianie media_url | Użytkownicy otrzymują powiadomienia o zmianie wideo |
| `TrainingManagement.tsx` | Wyświetlanie numeru pozycji w liście lekcji | Lepsza widoczność kolejności |

---

## Oczekiwane rezultaty

1. **Postępy użytkowników** - Szymon Latocha będzie widoczny z 67% w module BIZNESOWE (14/21 lekcji)
2. **Zmiana kolejności** - Admin może wpisać numer pozycji dla każdej lekcji
3. **Powiadomienia o aktualizacji wideo** - Użytkownicy z postępem w module otrzymują powiadomienie gdy admin zmieni materiał wideo
4. **Real-time update** - Zgodnie z memory projektu, UI odświeża się natychmiast po operacjach
