

# Plan: Dashboard monitoringu dostarczalności emaili + informacja o rygorystycznych dostawcach

## Analiza obecnego stanu

**Dane z bazy:** Wszystkie 3262 emaile mają status `sent` — brak statusów `failed`, `bounced`, `spam`. Oznacza to, że SMTP przyjął wiadomość, ale system nie ma informacji o tym, co dzieje się po stronie odbiorcy (bounce, spam, delivered).

**Domeny .de w bazie:** `gmx.de` (40 wysłanych), `gmx.at` (6) — wszystkie `status: sent`. Brak `web.de` ani `t-online.de` w danych.

**Ograniczenie:** Przy bezpośrednim SMTP (bez zewnętrznego serwisu jak Brevo/SES) nie ma mechanizmu feedback loop — nie wiemy czy email trafił do spamu, został odrzucony (bounce), czy dotarł. System wie tylko czy SMTP zaakceptował wiadomość.

## Co zostanie zbudowane

### 1. Nowy komponent `EmailDeliveryDashboard.tsx`

Dashboard z następującymi sekcjami:

**A. Karty statystyk (top)**
- Łącznie wysłanych (unikalne)
- Wysłane dzisiaj / 7 dni / 30 dni
- Domeny z potencjalnymi problemami (lista znanych rygorystycznych domen)
- Błędy (status `failed`)

**B. Filtr czasu** — preset: 24h, 7 dni, 30 dni, własny zakres dat

**C. Filtr domeny** — dropdown z listą domen odbiorców

**D. Filtr statusu** — sent, failed, all

**E. Analityka domen** — tabela ze statystykami per domena:
- Domena, ilość wysłanych, ostatnia wysyłka, status domeny (ikona: znana rygorystyczna / normalna)
- Podświetlenie domen z listy rygorystycznych (gmx.de, web.de, t-online.de, yahoo.de, outlook.de, freenet.de, posteo.de, mailbox.org, protonmail.com)

**F. Tabela logów emaili** — sortowalna, paginowana:
- Odbiorca, Temat, Domena, Status (badge), Data, Błąd
- Paginacja: 25, 50, 100

**G. Sekcja informacyjna: "Znane rygorystyczne serwery pocztowe"**
- Lista domen z opisem poziomu ryzyka i rekomendacjami
- Informacja że przy shared SMTP brak gwarancji dostarczenia do: T-Online.de, Freenet.de, Posteo.de, Mailbox.org
- Sugestia tekstu do wyświetlenia użytkownikom

### 2. Rejestracja w AdminSidebar

- Nowy item w kategorii `communication`: `{ value: 'email-delivery', labelKey: 'emailDelivery', icon: BarChart3 }`
- Nowy `TabsContent` w Admin.tsx

### 3. Informacja o rygorystycznych dostawcach

Na podstawie analizy konfiguracji (shared hosting SMTP `s108.cyber-folks.pl`, domena `purelife.info.pl`):

**Domeny z WYSOKIM ryzykiem niedostarczenia:**
| Domena | Ryzyko | Powód |
|--------|--------|-------|
| t-online.de | Bardzo wysokie | Odrzuca maile z shared IP bez pełnego DKIM/DMARC pass |
| freenet.de | Bardzo wysokie | Blokuje shared hosting SMTP |
| posteo.de | Bardzo wysokie | Wymaga DKIM + DMARC strict alignment |
| mailbox.org | Wysokie | Wymaga SPF + DKIM + DMARC |
| gmx.de / web.de | Średnie-wysokie | Przyjmuje ale filtruje do spamu bez DKIM |
| outlook.de / hotmail.de | Średnie | Microsoft wymaga SPF pass, sprawdza reputację IP |
| yahoo.de | Średnie | Wymaga DKIM, sprawdza reputację |

**Domeny BEZPIECZNE (dostarczalność potwierdzona w danych):**
- gmail.com, wp.pl, o2.pl, interia.pl, onet.pl/eu, protonmail.com, icloud.com

**Rekomendacja tekstu dla użytkowników** — zostanie dodana jako alert/banner w dashboardzie monitoringu, do skopiowania na stronę lub do emaila powitalnego.

## Pliki do zmiany

| Plik | Zmiana |
|------|--------|
| `src/components/admin/EmailDeliveryDashboard.tsx` | **NOWY** — pełny dashboard monitoringu |
| `src/components/admin/AdminSidebar.tsx` | Dodanie pozycji `email-delivery` |
| `src/pages/Admin.tsx` | Import + `TabsContent` dla `email-delivery` |

## Bez zmian
- Edge Functions — bez zmian
- Tabela `email_logs` — bez zmian (wykorzystanie istniejących danych)
- Szablony, harmonogramy — bez zmian

