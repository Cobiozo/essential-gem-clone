

# Plan: Konfiguracja powiadomień email o nowych lekcjach szkoleniowych

## Podsumowanie

Implementacja systemu wysyłki email przy dodawaniu nowych lekcji szkoleniowych wymaga trzech kroków:
1. Utworzenie szablonu email
2. Dodanie typu zdarzenia `training_new_lessons` do tabeli `notification_event_types`
3. Modyfikacja kodu `TrainingManagement.tsx` aby wywoływał funkcję `send-notification-email`

---

## Część 1: Utworzenie szablonu email (migracja SQL)

Nowy szablon email dla powiadomień o nowych lekcjach:

```sql
INSERT INTO email_templates (
  id,
  name,
  subject,
  body_html,
  footer_html,
  is_active
)
VALUES (
  gen_random_uuid(),
  'Nowe materiały szkoleniowe',
  'Nowa lekcja w module: {{module_title}} 📚',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #16a34a;">Cześć {{imię}}!</h1>
    <p style="font-size: 16px; line-height: 1.6;">
      Do modułu szkoleniowego <strong>{{module_title}}</strong> została dodana nowa lekcja:
    </p>
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
      <strong style="font-size: 18px;">{{lesson_title}}</strong>
    </div>
    <p style="font-size: 16px; line-height: 1.6;">
      {{message}}
    </p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{link}}" 
         style="display: inline-block; background-color: #16a34a; color: white; padding: 12px 30px; 
                text-decoration: none; border-radius: 6px; font-weight: bold;">
        Przejdź do szkolenia
      </a>
    </div>
  </div>',
  '<div style="text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p>Ta wiadomość została wysłana automatycznie z platformy Pure Life.</p>
  </div>',
  true
);
```

---

## Część 2: Utworzenie typu zdarzenia (migracja SQL)

Dodanie `training_new_lessons` do tabeli typów zdarzeń z przypisanym szablonem email:

```sql
-- Najpierw pobierz ID szablonu, potem wstaw typ zdarzenia
DO $$
DECLARE
  template_uuid UUID;
BEGIN
  SELECT id INTO template_uuid FROM email_templates WHERE name = 'Nowe materiały szkoleniowe' LIMIT 1;
  
  INSERT INTO notification_event_types (
    event_key, 
    name, 
    description, 
    icon_name, 
    color, 
    source_module, 
    send_email, 
    email_template_id,
    is_active,
    position
  )
  VALUES (
    'training_new_lessons',
    'Nowe materiały szkoleniowe',
    'Powiadomienie o dodaniu nowych lekcji do modułu szkoleniowego',
    'BookOpen',
    '#3b82f6',
    'training',
    true,
    template_uuid,
    true,
    10
  );
END $$;
```

---

## Część 3: Modyfikacja kodu TrainingManagement.tsx

Po wstawieniu powiadomień do bazy danych, wywołaj Edge Function `send-notification-email` dla każdego użytkownika:

```typescript
// W saveLesson(), po linii 414 (po wstawieniu powiadomień)

// Fetch event type ID for email sending
const { data: eventType } = await supabase
  .from('notification_event_types')
  .select('id, send_email, email_template_id')
  .eq('event_key', 'training_new_lessons')
  .eq('is_active', true)
  .single();

// Send email notifications if configured
if (eventType?.send_email && eventType?.email_template_id) {
  console.log(`📧 Sending email notifications to ${allUserIds.length} users...`);
  
  // Send emails in parallel (max 5 at a time to avoid overwhelming the server)
  const batchSize = 5;
  for (let i = 0; i < allUserIds.length; i += batchSize) {
    const batch = allUserIds.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(userId => {
        const hasCertificate = certifiedUserIds.has(userId);
        
        return supabase.functions.invoke('send-notification-email', {
          body: {
            event_type_id: eventType.id,
            recipient_user_id: userId,
            payload: {
              module_title: moduleTitle,
              lesson_title: lessonData.title,
              message: hasCertificate
                ? 'Twój certyfikat pozostaje ważny, ale zachęcamy do zapoznania się z nowymi materiałami.'
                : 'Ukończ wszystkie lekcje aby uzyskać certyfikat.',
              link: `${window.location.origin}/training/${selectedModule}`,
            },
          },
        });
      })
    );
    
    console.log(`📧 Sent email batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(allUserIds.length / batchSize)}`);
  }
  
  console.log(`✅ Email notifications completed for ${allUserIds.length} users`);
}
```

---

## Pliki do modyfikacji

| Komponent | Zmiana |
|-----------|--------|
| Migracja SQL | Utworzenie szablonu email "Nowe materiały szkoleniowe" |
| Migracja SQL | Utworzenie typu zdarzenia `training_new_lessons` z przypisanym szablonem |
| `src/components/admin/TrainingManagement.tsx` | Wywołanie Edge Function `send-notification-email` po wstawieniu powiadomień |

---

## Przepływ systemu

```text
ADMIN DODAJE NOWĄ LEKCJĘ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Admin wypełnia formularz nowej lekcji
                    │
                    ▼
2. saveLesson() wstawia rekord do training_lessons
                    │
                    ▼
3. Pobiera użytkowników z postępem/certyfikatami
                    │
                    ▼
4. Wstawia powiadomienia do user_notifications (dzwoneczek)
                    │
                    ▼
5. NOWE: Pobiera typ zdarzenia training_new_lessons
                    │
                    ▼
6. NOWE: Wywołuje send-notification-email dla każdego użytkownika
   (w partiach po 5, aby nie przeciążyć serwera)
                    │
                    ▼
7. Edge Function:
   - Pobiera szablon email
   - Podstawia zmienne (imię, module_title, lesson_title, message, link)
   - Wysyła email przez SMTP
   - Loguje do email_logs
                    │
                    ▼
8. Użytkownicy otrzymują:
   - Powiadomienie w platformie (dzwoneczek)
   - Email na swoją skrzynkę

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Zmienne dostępne w szablonie email

| Zmienna | Źródło | Przykład |
|---------|--------|----------|
| `{{imię}}` | profil użytkownika | Anna |
| `{{nazwisko}}` | profil użytkownika | Kowalska |
| `{{email}}` | profil użytkownika | anna@example.com |
| `{{module_title}}` | payload | SPRZEDAŻOWE |
| `{{lesson_title}}` | payload | Nowe techniki sprzedaży |
| `{{message}}` | payload (zależne od certyfikatu) | Twój certyfikat pozostaje ważny... |
| `{{link}}` | payload | https://purelife.lovable.app/training/... |
| `{{data}}` | system | 25.01.2026 |
| `{{godzina}}` | system | 14:35 |

---

## Oczekiwany rezultat

Po implementacji, przy każdym dodaniu nowej lekcji:

1. **Powiadomienie wewnętrzne** - użytkownik widzi alert w dzwoneczku
2. **Email** - użytkownik otrzymuje wiadomość na swoją skrzynkę z:
   - Nazwą modułu
   - Nazwą nowej lekcji  
   - Personalizowaną wiadomością (różną dla certyfikowanych i nie)
   - Przyciskiem CTA "Przejdź do szkolenia"

3. **Logowanie** - każdy wysłany email jest zapisany w `email_logs` dla celów audytu

---

## Uwagi techniczne

- Emaile są wysyłane w partiach po 5 użytkowników (rate limiting)
- Użyto `Promise.allSettled` zamiast `Promise.all` - jeden błąd nie blokuje pozostałych emaili
- Błędy wysyłki email nie blokują procesu dodawania lekcji
- Link w emailu zawiera pełny URL (z `window.location.origin`)
- Szablon email jest responsywny i wspiera polskie znaki (UTF-8)

