

# Diagnoza problemów z emailami

## Znalezione problemy

### 1. Przycisk "Zaloguj się" w emailu powitalnym — link `href="#"`
Szablon `welcome_registration` w bazie ma przycisk "Zaloguj się" z linkiem `href="#"` — to NIE przekierowuje nigdzie. Powinien prowadzić do `https://purelife.info.pl/auth`.

### 2. Email aktywacyjny — błędny origin
W `send-activation-email` funkcja pobiera origin z `req.headers.get("origin")`, a fallback to `https://xzlhssqqbajqhnsmbucf.lovableproject.com`. Po kliknięciu linku aktywacyjnego użytkownik trafia na lovableproject.com zamiast na purelife.info.pl. Ten sam problem w `activate-email/index.ts` — hardcoded lovableproject.com.

### 3. Dostarczalność emaili na nie-Gmail (wp.pl, onet.pl, hotmail, proton)
Logi w bazie pokazują status `sent` dla WSZYSTKICH domen (wp.pl, o2.pl, onet.pl, protonmail.com). SMTP serwer **przyjmuje** te emaile. Problem nie leży w kodzie — SMTP raportuje sukces.

Prawdopodobne przyczyny niedostarczania:
- Brak rekordów **SPF/DKIM/DMARC** dla domeny `purelife.info.pl` — serwery pocztowe (szczególnie wp.pl i onet.pl) odrzucają lub wrzucają do spamu emaile bez tych rekordów
- Polscy dostawcy (wp.pl, onet.pl, o2.pl) mają agresywniejsze filtry antyspamowe niż Gmail

**To jest problem konfiguracji DNS domeny, nie kodu.** Mogę jednak ulepszyć nagłówki emaili, żeby poprawić dostarczalność.

## Plan naprawy (kod)

### 1. Naprawić link w szablonie powitalnym (SQL)
```sql
UPDATE email_templates 
SET body_html = REPLACE(body_html, 'href="#"', 'href="https://purelife.info.pl/auth"')
WHERE internal_name = 'welcome_registration';
```

### 2. Naprawić origin w `send-activation-email/index.ts`
Zamienić dynamiczne `req.headers.get("origin")` i fallback na stały `https://purelife.info.pl`.

### 3. Naprawić origin w `activate-email/index.ts`
Zamienić hardcoded `lovableproject.com` na `https://purelife.info.pl`.

### 4. Ulepszyć nagłówki SMTP w obu funkcjach emailowych
Dodać nagłówki poprawiające dostarczalność:
- `Return-Path`, `Reply-To` 
- `X-Mailer` header
- Poprawny `Message-ID`
- Format `multipart/alternative` z wersją text/plain (tak jak w `send-welcome-email`)

### Pliki do zmiany
- Migracja SQL — link w szablonie `welcome_registration`
- `supabase/functions/send-activation-email/index.ts` — origin + nagłówki SMTP
- `supabase/functions/activate-email/index.ts` — origin

### Wymagane działanie administratora (poza kodem)
Konfiguracja DNS domeny `purelife.info.pl` u hostingodawcy (cyber-folks.pl):
- Rekord **SPF**: `v=spf1 include:_spf.cyber-folks.pl ~all`
- Rekord **DKIM**: wygenerować w panelu hostingowym
- Rekord **DMARC**: `v=DMARC1; p=none; rua=mailto:support@purelife.info.pl`

Bez tych rekordów, polscy dostawcy pocztowi będą nadal odrzucać lub filtrować emaile do spamu.
