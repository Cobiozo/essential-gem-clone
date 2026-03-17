

# Plan: Dodanie logo Pure Life Center do wszystkich emaili

## Problem
Tylko 6 z ~20 funkcji wysyłających emaile ma złoty nagłówek z logo Pure Life Center. Pozostałe albo mają inline HTML bez logo, albo używają szablonów z bazy danych (`email_templates`) które nie mają logo w nagłówku.

## Podejście

Dwa typy funkcji wymagają zmian:

### Typ 1: Funkcje z inline HTML (brak logo w kodzie)
Dodanie złotego nagłówka z logo bezpośrednio w kodzie HTML:

| Funkcja | Typ emaila | Odbiorca |
|---------|-----------|----------|
| `send-mfa-code` | Kod MFA | Użytkownicy |
| `send-certificate-email` | Certyfikat szkolenia | Użytkownicy |
| `send-maintenance-bypass-email` | Link serwisowy | Admini |
| `send-support-ticket` | Zgłoszenie MFA | Admini |

### Typ 2: Funkcje używające szablonów z bazy (`email_templates`)
Te funkcje pobierają `body_html` z tabeli `email_templates`. Logo trzeba dodać jako wrapper wokół treści szablonu w kodzie funkcji (nie w samych szablonach, bo ich jest dużo i zmiana w bazie byłaby niestabilna):

| Funkcja | Obsługuje szablony |
|---------|-------------------|
| `send-webinar-email` | Przypomnienia webinarowe |
| `send-bulk-webinar-reminders` | Bulk przypomnienia 12h/2h |
| `send-post-webinar-email` | Follow-up po webinarze |
| `send-approval-email` | Zatwierdzenie konta |
| `send-password-reset` | Reset hasła |
| `send-notification-email` | Powiadomienia systemowe |
| `send-activation-email` | Aktywacja emaila |
| `send-welcome-email` | Email powitalny |
| `send-training-notification` | Powiadomienie o szkoleniu |
| `send-training-reminder` | Przypomnienie o szkoleniu |
| `send-group-email` | Emaile grupowe |
| `send-single-email` | Pojedynczy email (lider) |

### Wzorzec nagłówka (identyczny jak w send-post-event-thank-you)
```html
<div style="background: linear-gradient(135deg, #D4A843 0%, #B8912A 100%); padding: 30px; text-align: center;">
  <img src="{LOGO_URL}" alt="Pure Life Center" style="max-width: 180px; height: auto;" />
</div>
```

## Implementacja

1. **Funkcje inline HTML (4 pliki)** — dodanie złotego nagłówka z logo przed istniejącą treścią HTML
2. **Funkcje szablonowe (12 plików)** — owinięcie `body_html` z szablonu w wrapper z logo nagłówkiem i stopką "Zespół Pure Life"
3. **Deploy** wszystkich zmienionych Edge Functions

## Pliki do zmiany (~16 plików)

Wszystkie w `supabase/functions/`:
- `send-mfa-code/index.ts`
- `send-certificate-email/index.ts`
- `send-maintenance-bypass-email/index.ts`
- `send-support-ticket/index.ts`
- `send-webinar-email/index.ts`
- `send-bulk-webinar-reminders/index.ts`
- `send-post-webinar-email/index.ts`
- `send-approval-email/index.ts`
- `send-password-reset/index.ts`
- `send-notification-email/index.ts`
- `send-activation-email/index.ts`
- `send-welcome-email/index.ts`
- `send-training-notification/index.ts`
- `send-training-reminder/index.ts`
- `send-group-email/index.ts`
- `send-single-email/index.ts`

Po zmianach — wysłanie testowych emaili do `sebastiansnopek87@gmail.com` w celu weryfikacji.

