
# Plan: Ulepszenie systemu powiadomień o nowych lekcjach szkoleniowych

## Zidentyfikowane problemy

### Problem 1: Brak powiadomień dla użytkowników bez certyfikatów
Obecny system powiadamia TYLKO użytkowników z certyfikatami. Użytkownicy którzy:
- Mieli postęp w module (np. 82%, 73%, etc.)
- Mieli nawet 100% postępu ale nie wygenerowali certyfikatu

NIE otrzymują żadnych powiadomień o nowych lekcjach.

**Dotknięci użytkownicy (bez certyfikatu, bez powiadomienia):**
| Imię | Nazwisko | Postęp | Ukończone lekcje |
|------|----------|--------|------------------|
| Marianna | Pietrzak | 82% | 9/11 |
| Katarzyna | Snopek | 82% | 9/11 |
| Sebastian | Snopek | 82% | 9/11 |
| Mariola | Piotr | 82% | 9/11 |
| Sebastian | Snopek | 82% | 9/11 |
| Marika | Lubińska | 73% | 8/11 |
| Jarosław | Wiglusz | 73% | 8/11 |
| Danka | Pawłowska | 73% | 8/11 |
| Karolina | Dawidowska | 64% | 7/11 |

### Problem 2: Brak konfiguracji email
- Typ zdarzenia `training_new_lessons` NIE istnieje w tabeli `notification_event_types`
- Nie ma szablonu email dla tego typu powiadomienia
- Powiadomienia są tylko wewnętrzne (dzwoneczek) - email NIE jest wysyłany

### Problem 3: Różne komunikaty dla różnych grup
Użytkownicy z certyfikatami i bez certyfikatów powinni otrzymywać różne treści:
- Z certyfikatem: "Twój certyfikat pozostaje ważny"
- Bez certyfikatu: "Nowe wymagane materiały - ukończ je aby uzyskać certyfikat"

---

## Rozwiązanie

### Część A: Jednorazowe powiadomienia dla użytkowników bez certyfikatów (SQL)

Wysłanie powiadomień do użytkowników którzy mają postęp w module SPRZEDAŻOWE ale nie mają certyfikatu i nie dostali jeszcze powiadomienia:

```sql
INSERT INTO user_notifications (
  user_id, 
  notification_type, 
  source_module, 
  title, 
  message, 
  link, 
  metadata
)
SELECT DISTINCT ON (p.user_id)
  p.user_id,
  'training_new_lessons',
  'training',
  'Nowe materiały szkoleniowe',
  'Do modułu SPRZEDAŻOWE zostały dodane nowe lekcje. Ukończ wszystkie materiały aby uzyskać certyfikat.',
  '/training/c6ab5d58-d77e-43e8-b246-a5e15c0f836f',
  jsonb_build_object(
    'module_id', 'c6ab5d58-d77e-43e8-b246-a5e15c0f836f',
    'module_title', 'SPRZEDAŻOWE',
    'new_lessons_count', 3,
    'has_certificate', false
  )
FROM profiles p
JOIN training_progress tp ON tp.user_id = p.user_id AND tp.is_completed = true
JOIN training_lessons tl ON tl.id = tp.lesson_id 
  AND tl.module_id = 'c6ab5d58-d77e-43e8-b246-a5e15c0f836f'
WHERE NOT EXISTS (
  SELECT 1 FROM certificates c 
  WHERE c.user_id = p.user_id 
  AND c.module_id = 'c6ab5d58-d77e-43e8-b246-a5e15c0f836f'
)
AND NOT EXISTS (
  SELECT 1 FROM user_notifications un 
  WHERE un.user_id = p.user_id 
  AND un.notification_type = 'training_new_lessons'
  AND un.metadata->>'module_id' = 'c6ab5d58-d77e-43e8-b246-a5e15c0f836f'
);
```

---

### Część B: Ulepszenie kodu TrainingManagement.tsx

Zmienić logikę wysyłania powiadomień aby obejmowała WSZYSTKICH użytkowników z postępem w module (nie tylko z certyfikatami):

```typescript
// Po pomyślnym wstawieniu nowej lekcji
if (!editingLesson) {
  // Get module title
  const { data: moduleData } = await supabase
    .from('training_modules')
    .select('title')
    .eq('id', selectedModule)
    .single();
  
  const moduleTitle = moduleData?.title || 'szkolenia';
  
  // 1. Get users WITH certificates
  const { data: certifiedUsers } = await supabase
    .from('certificates')
    .select('user_id')
    .eq('module_id', selectedModule);
  
  const certifiedUserIds = new Set(certifiedUsers?.map(c => c.user_id) || []);
  
  // 2. Get ALL users with progress in this module
  const { data: usersWithProgress } = await supabase
    .from('training_progress')
    .select('user_id, training_lessons!inner(module_id)')
    .eq('training_lessons.module_id', selectedModule)
    .eq('is_completed', true);
  
  const allUserIds = [...new Set(usersWithProgress?.map(p => p.user_id) || [])];
  
  if (allUserIds.length > 0) {
    const notifications = allUserIds.map(userId => {
      const hasCertificate = certifiedUserIds.has(userId);
      
      return {
        user_id: userId,
        notification_type: 'training_new_lessons',
        source_module: 'training',
        title: 'Nowe materiały szkoleniowe',
        message: hasCertificate
          ? `Do modułu ${moduleTitle} została dodana nowa lekcja: "${lessonData.title}". Twój certyfikat pozostaje ważny, ale zachęcamy do zapoznania się z nowymi materiałami.`
          : `Do modułu ${moduleTitle} została dodana nowa lekcja: "${lessonData.title}". Ukończ wszystkie lekcje aby uzyskać certyfikat.`,
        link: `/training/${selectedModule}`,
        metadata: {
          module_id: selectedModule,
          module_title: moduleTitle,
          lesson_title: lessonData.title,
          certificate_valid: hasCertificate,
          has_certificate: hasCertificate
        }
      };
    });
    
    await supabase.from('user_notifications').insert(notifications);
    console.log(`📧 Sent ${allUserIds.length} notifications (${certifiedUserIds.size} certified, ${allUserIds.length - certifiedUserIds.size} in progress)`);
  }
}
```

---

### Część C: Konfiguracja systemu email (opcjonalnie)

Dodanie typu zdarzenia i szablonu email dla automatycznej wysyłki maili:

**1. Utworzenie typu zdarzenia w bazie:**

```sql
INSERT INTO notification_event_types (
  event_key, 
  name, 
  description, 
  icon, 
  color, 
  source_module, 
  send_email, 
  email_template_id,
  is_active
)
VALUES (
  'training_new_lessons',
  'Nowe materiały szkoleniowe',
  'Powiadomienie o dodaniu nowych lekcji do modułu szkoleniowego',
  'BookOpen',
  '#3b82f6',
  'training',
  true,
  NULL, -- do uzupełnienia po utworzeniu szablonu
  true
);
```

**2. Utworzenie szablonu email:**

Szablon email z treścią:
- Tytuł: "Nowe materiały szkoleniowe - {{moduł}}"
- Treść: Informacja o nowej lekcji z linkiem do modułu
- Wariant dla certyfikowanych: "Certyfikat pozostaje ważny"
- Wariant dla pozostałych: "Ukończ szkolenie aby uzyskać certyfikat"

---

## Podsumowanie zmian

| Komponent | Zmiana |
|-----------|--------|
| Migracja SQL | Jednorazowe powiadomienia dla użytkowników BEZ certyfikatów |
| `TrainingManagement.tsx` | Rozszerzona logika: powiadomienia dla WSZYSTKICH użytkowników z postępem |
| `notification_event_types` (opcjonalnie) | Nowy typ zdarzenia z konfiguracją email |
| Szablon email (opcjonalnie) | Nowy szablon dla powiadomień o lekcjach |

---

## Oczekiwany rezultat

1. **Jednorazowo**: Użytkownicy BEZ certyfikatów ale z postępem w module SPRZEDAŻOWE otrzymają powiadomienie o nowych lekcjach (9 osób)

2. **Na przyszłość**: Przy każdym dodaniu nowej lekcji:
   - Użytkownicy Z certyfikatem → "Twój certyfikat pozostaje ważny, ale zachęcamy..."
   - Użytkownicy BEZ certyfikatu → "Ukończ wszystkie lekcje aby uzyskać certyfikat"

3. **Opcjonalnie**: Wysyłka email dodatkowo do powiadomień w platformie

---

## Pytanie do decyzji

Czy chcesz aby przy dodawaniu nowych lekcji były wysyłane **także emaile** oprócz powiadomień wewnętrznych (dzwoneczek)?

Jeśli tak, będzie potrzebne:
- Utworzenie szablonu email w panelu administracyjnym
- Skonfigurowanie typu zdarzenia `training_new_lessons` z przypisaniem szablonu
- Modyfikacja kodu aby wywoływał funkcję `send-notification-email`
