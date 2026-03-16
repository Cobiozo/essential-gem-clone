

# Plan: Ulepszenie nagłówków SMTP dla lepszej dostarczalności

## Zasada bezpieczeństwa
Zmiany dotyczą **wyłącznie sekcji nagłówków emaila** w funkcji `sendSmtpEmail`. Logika biznesowa, harmonogramy, szablony, warunki wysyłki — wszystko pozostaje niezmienione.

## Co dokładnie się zmieni

W każdej funkcji SMTP zmieniana jest **tylko tablica `emailContent`** (nagłówki + MIME structure). Reszta kodu funkcji nie jest modyfikowana.

### Dodawane nagłówki (brakujące w ~20 funkcjach):
- `Message-ID` — unikalny identyfikator z domeny nadawcy
- `Date` — data w formacie RFC 2822
- `Return-Path` i `Reply-To` — jawne wskazanie nadawcy
- `X-Mailer: PureLife-Platform/1.0`

### Zmiana EHLO
- Z `EHLO ${settings.host}` (= EHLO serwera SMTP, np. `s108.cyber-folks.pl`)
- Na `EHLO ${senderDomain}` (= domena nadawcy, np. `purelife.info.pl`)
- To jedyna zmiana poza sekcją nagłówków — serwery .de wymagają EHLO z domeną nadawcy

### Zmiana MIME na multipart/alternative
- Zamiast samego `text/html` → `multipart/alternative` z `text/plain` + `text/html`
- `text/plain` generowany automatycznie: strip tagów HTML
- Kluczowe dla GMX, Web.de, T-Online

### Walidacja odpowiedzi SMTP
- Dodanie sprawdzenia kodów odpowiedzi po `MAIL FROM` (250), `RCPT TO` (250), `DATA` (354)
- Już obecne w `send-mfa-code` — wzór do skopiowania

## Funkcje do aktualizacji (SMTP z brakującymi nagłówkami)

| # | Funkcja | Brak Message-ID | Brak multipart | Brak EHLO domain |
|---|---------|:---:|:---:|:---:|
| 1 | `send-training-notification` | ✗ | ✗ | ✗ |
| 2 | `send-notification-email` | ✗ | ✗ | ✗ |
| 3 | `send-meeting-reminders` | ✗ | ✗ | ✗ |
| 4 | `send-approval-email` | ✗ | ✗ | ✗ |
| 5 | `send-training-reminder` | ✗ | ✗ | ✗ |
| 6 | `send-security-report` | ✗ | ✗ | ✗ |
| 7 | `send-prospect-meeting-email` | ✗ | ✗ | ✗ |
| 8 | `send-password-reset` | ✗ | ✗ | ✗ |
| 9 | `send-support-email` | ✗ | ✗ | ✗ |
| 10 | `retry-failed-email` | ✗ | ✗ | ✗ |
| 11 | `send-guest-thank-you-email` | ✗ | ✓ (ma) | ✗ |
| 12 | `generate-meeting-guest-token` | ✗ | ? | ✗ |
| 13 | `admin-reset-password` | ✗ | ✗ | ✗ |

Funkcje już częściowo poprawne (uzupełnienie brakujących elementów):
| # | Funkcja | Co brakuje |
|---|---------|-----------|
| 14 | `send-single-email` | EHLO domain, Reply-To |
| 15 | `send-activation-email` | EHLO domain |
| 16 | `send-welcome-email` | EHLO domain |
| 17 | `send-mfa-code` | EHLO domain, multipart |
| 18 | `send-support-ticket` | EHLO domain, multipart |

Funkcje z `multipart/alternative` ale bez Message-ID/Date:
| # | Funkcja | Co brakuje |
|---|---------|-----------|
| 19 | `send-webinar-email` | Message-ID, Date, EHLO domain |
| 20 | `send-webinar-confirmation` | Message-ID, Date, EHLO domain |
| 21 | `send-bulk-webinar-reminders` | Message-ID, Date, EHLO domain |
| 22 | `send-group-email` | Message-ID, Date, EHLO domain |
| 23 | `send-certificate-email` | Message-ID, Date, EHLO domain |
| 24 | `send-maintenance-bypass-email` | Message-ID, Date, EHLO domain |
| 25 | `send-post-webinar-email` | Message-ID, Date, EHLO domain |

**Wyłączone z zmian:** `send-chat-notification-email` — używa Resend API, nie SMTP.

## Wzorzec zmiany (identyczny w każdej funkcji)

**1. EHLO** — jedna linia:
```
EHLO ${settings.from_email.split('@')[1] || settings.host}
```

**2. Walidacja SMTP** (po MAIL FROM, RCPT TO, DATA):
```
const resp = await sendCommand(`MAIL FROM:<${settings.from_email}>`);
if (!resp.startsWith('250')) throw new Error(`MAIL FROM rejected: ${resp}`);
```

**3. Nagłówki + multipart/alternative:**
```
const senderDomain = settings.from_email.split('@')[1] || 'localhost';
const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2,9)}@${senderDomain}>`;
const plainText = htmlBody.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

const emailContent = [
  `Message-ID: ${messageId}`,
  `Date: ${new Date().toUTCString()}`,
  `From: "${settings.from_name}" <${settings.from_email}>`,
  `To: ${to}`,
  `Subject: =?UTF-8?B?${base64Encode(subject)}?=`,
  `Reply-To: <${settings.from_email}>`,
  `Return-Path: <${settings.from_email}>`,
  `X-Mailer: PureLife-Platform/1.0`,
  `MIME-Version: 1.0`,
  `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ``,
  `--${boundary}`,
  `Content-Type: text/plain; charset=UTF-8`,
  `Content-Transfer-Encoding: base64`,
  ``,
  base64Encode(plainText),
  ``,
  `--${boundary}`,
  `Content-Type: text/html; charset=UTF-8`,
  `Content-Transfer-Encoding: base64`,
  ``,
  base64Encode(htmlBody),
  ``,
  `--${boundary}--`,
  `.`,
].join('\r\n');
```

## Co NIE zmieni się
- Logika biznesowa w żadnej funkcji
- Harmonogramy CRON
- Szablony emaili
- Warunki wysyłki i deduplikacja
- Konfiguracja SMTP w bazie danych
- Funkcje nie-SMTP (push, Resend API)
- Logowanie do `email_logs`

## Kolejność implementacji
Funkcje będą aktualizowane partiami (5-6 na raz), z zachowaniem pełnej kompatybilności wstecznej. Każda zmiana jest atomowa — modyfikuje tylko `sendSmtpEmail` w danym pliku.

