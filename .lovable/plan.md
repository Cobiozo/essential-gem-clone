

# Plan: Powiadomienia o nowych lekcjach szkoleniowych

## Podsumowanie sytuacji

### Stan aktualny
Po dodaniu 3 nowych lekcji do modułu SPRZEDAŻOWE (25 stycznia 2026):
- **Użytkownicy z certyfikatem** - widzą nadal 100% dzięki logice "Progress Legacy"
- **Użytkownicy bez certyfikatu** (którzy mieli 100%) - spadli do ~82% (9/11 ukończonych)
- **Brak powiadomień** - nikt nie został poinformowany o nowych materiałach

### Identyfikowani użytkownicy do powiadomienia
Z bazy danych wynika, że kilkadziesiąt osób ma certyfikaty z datą przed dodaniem nowych lekcji (np. Julia Moczulska, Bogumiła Stopińska, Izabella Bąk, Anna Grajny-Zaczyk i inni). Wszyscy mają 3 nowe lekcje do przejrzenia.

---

## Rozwiązanie

Implementacja automatycznego powiadomienia wysyłanego przy dodawaniu nowej lekcji do modułu, które informuje użytkowników o:
1. Nowych materiałach szkoleniowych
2. Tym, że ich certyfikaty pozostają ważne
3. Zachęcie do powrotu i zapoznania się z nowymi lekcjami

### Podejście

Rozwiązanie składa się z dwóch części:
1. **Jednorazowa migracja SQL** - wysyła powiadomienia do wszystkich użytkowników z certyfikatami dla modułów z nowymi lekcjami
2. **Automatyczne powiadomienia** - przy każdym dodaniu nowej lekcji, system automatycznie powiadamia odpowiednich użytkowników

---

## Szczegóły implementacji

### Część 1: Jednorazowe powiadomienie (migracja SQL)

Wysłanie powiadomień do wszystkich użytkowników z certyfikatami dla modułu SPRZEDAŻOWE, którzy mają nowe lekcje do przejrzenia:

```sql
-- Wyślij powiadomienie do użytkowników z certyfikatami którzy mają nowe lekcje
INSERT INTO user_notifications (
  user_id, 
  notification_type, 
  source_module, 
  title, 
  message, 
  link, 
  metadata
)
SELECT DISTINCT
  c.user_id,
  'training_new_lessons',
  'training',
  'Nowe materiały szkoleniowe',
  'Do modułu SPRZEDAŻOWE zostały dodane nowe lekcje. Twój certyfikat pozostaje ważny, ale zachęcamy do zapoznania się z nowymi materiałami.',
  '/training/c6ab5d58-d77e-43e8-b246-a5e15c0f836f',
  jsonb_build_object(
    'module_id', c.module_id,
    'module_title', 'SPRZEDAŻOWE',
    'new_lessons_count', 3,
    'certificate_valid', true
  )
FROM certificates c
WHERE c.module_id = 'c6ab5d58-d77e-43e8-b246-a5e15c0f836f'
AND EXISTS (
  SELECT 1 FROM training_lessons tl 
  WHERE tl.module_id = c.module_id 
  AND tl.is_active = true 
  AND tl.created_at > c.issued_at
);
```

### Część 2: Automatyczne powiadomienia przy dodawaniu lekcji

Modyfikacja funkcji `saveLesson` w `TrainingManagement.tsx` aby wysyłać powiadomienia:

Po pomyślnym dodaniu nowej lekcji, system:
1. Pobiera listę użytkowników z certyfikatami dla tego modułu
2. Pobiera tytuł modułu
3. Wstawia powiadomienia do bazy danych

```typescript
// Po pomyślnym wstawieniu nowej lekcji (w bloku else, po linii 360)
if (!editingLesson) {
  // Pobierz tytuł modułu
  const { data: moduleData } = await supabase
    .from('training_modules')
    .select('title')
    .eq('id', selectedModule)
    .single();
  
  const moduleTitle = moduleData?.title || 'szkolenia';
  
  // Pobierz użytkowników z certyfikatami dla tego modułu
  const { data: certifiedUsers } = await supabase
    .from('certificates')
    .select('user_id')
    .eq('module_id', selectedModule);
  
  if (certifiedUsers && certifiedUsers.length > 0) {
    // Usuń duplikaty user_id
    const uniqueUserIds = [...new Set(certifiedUsers.map(c => c.user_id))];
    
    // Wyślij powiadomienia
    const notifications = uniqueUserIds.map(userId => ({
      user_id: userId,
      notification_type: 'training_new_lessons',
      source_module: 'training',
      title: 'Nowe materiały szkoleniowe',
      message: `Do modułu ${moduleTitle} została dodana nowa lekcja: "${lessonData.title}". Twój certyfikat pozostaje ważny, ale zachęcamy do zapoznania się z nowymi materiałami.`,
      link: `/training/${selectedModule}`,
      metadata: {
        module_id: selectedModule,
        module_title: moduleTitle,
        lesson_title: lessonData.title,
        certificate_valid: true
      }
    }));
    
    await supabase.from('user_notifications').insert(notifications);
  }
}
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| Migracja SQL | Jednorazowe powiadomienie dla istniejących użytkowników z certyfikatami |
| `src/components/admin/TrainingManagement.tsx` | Dodanie logiki wysyłania powiadomień po utworzeniu nowej lekcji |

---

## Treść powiadomienia

**Tytuł:** Nowe materiały szkoleniowe

**Wiadomość:** Do modułu [NAZWA MODUŁU] została dodana nowa lekcja: "[TYTUŁ LEKCJI]". Twój certyfikat pozostaje ważny, ale zachęcamy do zapoznania się z nowymi materiałami.

**Link:** /training/[module_id]

---

## Diagram przepływu

```text
ADMIN DODAJE NOWĄ LEKCJĘ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Admin wypełnia formularz nowej lekcji
                    │
                    ▼
2. saveLesson() wstawia rekord do training_lessons
                    │
                    ▼
3. NOWE: Pobierz użytkowników z certyfikatami dla modułu
                    │
                    ▼
4. NOWE: Wstaw powiadomienia do user_notifications
                    │
                    ▼
5. Użytkownicy widzą powiadomienie w dzwonku
                    │
                    ▼
6. Kliknięcie przenosi do modułu szkoleniowego

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Oczekiwany rezultat

1. **Jednorazowo**: Wszyscy użytkownicy z certyfikatami modułu SPRZEDAŻOWE otrzymają powiadomienie o nowych lekcjach
2. **Na przyszłość**: Przy każdym dodaniu nowej lekcji do dowolnego modułu, użytkownicy z certyfikatami tego modułu automatycznie otrzymają powiadomienie
3. Powiadomienie jasno komunikuje że:
   - Certyfikat pozostaje ważny
   - Są nowe materiały do przejrzenia
   - Zachęca do powrotu do szkolenia
4. Kliknięcie powiadomienia przenosi bezpośrednio do modułu szkoleniowego

---

## Uwagi techniczne

- Powiadomienia są wstawiane bezpośrednio do `user_notifications` (nie przez system eventowy) ponieważ są wysyłane do konkretnej listy użytkowników (posiadaczy certyfikatów)
- Duplikaty `user_id` są usuwane przed wstawieniem (użytkownik może mieć wiele certyfikatów dla tego samego modułu)
- Operacja jest asynchroniczna i nie blokuje UI admina

