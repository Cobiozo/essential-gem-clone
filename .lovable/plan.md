

# Audyt NPROC - Analiza Wycieków Procesów

## Podsumowanie Wykonawcze

Przeprowadziłem dogłębny audyt całej aplikacji pod kątem niezamykanych procesów, które mogą powodować akumulację NPROC na hostingu Cyber-Folks. Zidentyfikowałem **3 kategorie problemów**:

---

## 1. KRYTYCZNE: Wycieki połączeń SMTP w Edge Functions

### Problem
Większość funkcji wysyłających emaile tworzy połączenia TCP/TLS przez `Deno.connect()` lub `Deno.connectTls()`, ale **nie zamyka ich w przypadku błędu**. Gdy wystąpi błąd podczas handshake SMTP (np. błąd autentykacji, timeout), połączenie pozostaje otwarte aż do naturalnego wygaśnięcia.

### Dotknięte funkcje (12 plików)

| Funkcja | Status | Problem |
|---------|--------|---------|
| `send-welcome-email` | ❌ BRAK finally | Błąd = wyciek |
| `send-approval-email` | ❌ BRAK finally | Błąd = wyciek |
| `send-training-notification` | ❌ BRAK finally | Błąd = wyciek |
| `send-training-reminder` | ❌ BRAK finally | Błąd = wyciek |
| `send-password-reset` | ❌ BRAK finally | Błąd = wyciek |
| `send-activation-email` | ❌ BRAK finally | Błąd = wyciek |
| `send-single-email` | ❌ BRAK finally | Błąd = wyciek |
| `send-webinar-email` | ❌ BRAK finally | Błąd = wyciek |
| `send-webinar-confirmation` | ❌ BRAK finally | Błąd = wyciek |
| `send-maintenance-bypass-email` | ❌ BRAK finally | Błąd = wyciek |
| `admin-reset-password` | ❌ BRAK finally | Błąd = wyciek |
| `send-meeting-reminders` | ⚠️ catch cleanup | Częściowo OK |

### Poprawnie zaimplementowane (wzorzec do naśladowania)

| Funkcja | Status | Wzorzec |
|---------|--------|---------|
| `send-certificate-email` | ✅ finally | `finally { conn?.close() }` |
| `send-group-email` | ✅ finally | `finally { conn?.close() }` |
| `send-support-email` | ✅ finally | `finally { conn?.close() }` |
| `send-notification-email` | ✅ catch | `catch { conn?.close() }` |

### Rozwiązanie

Dla każdej funkcji z kategorii "BRAK finally" należy dodać blok `finally`:

```typescript
// PRZED (problematyczny kod):
async function sendSmtpEmail(...) {
  let conn: Deno.Conn | null = null;
  try {
    conn = await Deno.connectTls({ ... });
    // ... operacje SMTP
    conn.close();
    return { success: true };
  } catch (error) {
    console.error('[SMTP] Error:', error);
    throw error; // ❌ conn NIE jest zamknięte!
  }
}

// PO (poprawiony kod):
async function sendSmtpEmail(...) {
  let conn: Deno.Conn | null = null;
  try {
    conn = await Deno.connectTls({ ... });
    // ... operacje SMTP
    return { success: true };
  } catch (error) {
    console.error('[SMTP] Error:', error);
    return { success: false, error: error.message };
  } finally {
    // ✅ ZAWSZE zamykaj połączenie
    if (conn) {
      try { conn.close(); } catch {}
    }
  }
}
```

---

## 2. ŚREDNIE: Potencjalne problemy z EdgeRuntime.waitUntil

### Problem
Funkcja `background-translate` używa `EdgeRuntime.waitUntil()` do uruchamiania długotrwałych zadań tłumaczeniowych. Jeśli zadanie trwa dłużej niż oczekiwano lub zawiesza się, może utrzymywać procesy.

### Lokalizacja
- `supabase/functions/background-translate/index.ts:65`

### Rozwiązanie
Funkcja już ma timeout 25s (`MAX_EXECUTION_TIME`), ale warto dodać globalny timeout na poziomie `waitUntil`:

```typescript
// Dodać timeout wrapper
const withGlobalTimeout = (fn: () => Promise<void>, ms: number) => {
  return Promise.race([
    fn(),
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Global timeout')), ms)
    )
  ]).catch(console.error);
};

EdgeRuntime.waitUntil(withGlobalTimeout(
  () => processTranslationJob(jobId), 
  55000 // 55 seconds max
));
```

---

## 3. NISKIE: Frontend polling i Realtime

### Status: POPRAWNIE ZAIMPLEMENTOWANE ✅

Frontend aplikacji ma już wdrożone wszystkie niezbędne mechanizmy cleanup:

**Globalne czyszczenie kanałów:**
- `src/App.tsx:226-231` - usuwa wszystkie kanały przy zamknięciu okna
- `src/contexts/AuthContext.tsx:298-305` - usuwa kanały przed wylogowaniem

**Timeouty i intervaly:**
- `useNotifications.ts` - poprawny cleanup intervalu pollingu
- `useUserPresence.ts` - poprawny cleanup retry timeout
- `useTranslationJobs.ts` - MAX_POLLING_DURATION (30 min)
- `useInactivityTimeout.ts` - cleanup 6 event listeners + 3 timery

**Kanały Realtime:**
- Wszystkie komponenty poprawnie wywołują `supabase.removeChannel()` w cleanup `useEffect`

---

## 4. DODATKOWE: Cron Jobs i Overlapping Executions

### Obecne zabezpieczenia ✅
- `process-pending-notifications` ma mechanizm `running job detection`
- `cron_job_logs` śledzi status zadań
- `cron_settings` kontroluje interwały

### Potencjalny problem
Gdy cron uruchamia się co 15 minut (`send-meeting-reminders`) i wywołuje wiele emaili sekwencyjnie, każdy błąd SMTP = niezamknięty proces.

---

## Plan Naprawy

### Faza 1: Krytyczne naprawy SMTP (Natychmiastowe)

Zaktualizować 11 funkcji Edge Functions, dodając blok `finally` do funkcji `sendSmtpEmail`:

1. `supabase/functions/send-welcome-email/index.ts`
2. `supabase/functions/send-approval-email/index.ts`
3. `supabase/functions/send-training-notification/index.ts`
4. `supabase/functions/send-training-reminder/index.ts`
5. `supabase/functions/send-password-reset/index.ts`
6. `supabase/functions/send-activation-email/index.ts`
7. `supabase/functions/send-single-email/index.ts`
8. `supabase/functions/send-webinar-email/index.ts`
9. `supabase/functions/send-webinar-confirmation/index.ts`
10. `supabase/functions/send-maintenance-bypass-email/index.ts`
11. `supabase/functions/admin-reset-password/index.ts`

### Faza 2: Optymalizacja background-translate

Dodać globalny timeout wrapper dla `EdgeRuntime.waitUntil()`.

### Faza 3: Monitoring (Opcjonalne)

Dodać endpoint `/health` lub tabelę `edge_function_metrics` do śledzenia:
- Liczba aktywnych połączeń SMTP
- Czas wykonania funkcji
- Liczba błędów

---

## Szacowany wpływ

| Zmiana | Redukcja NPROC |
|--------|----------------|
| Naprawa SMTP finally | ~60-80% |
| Timeout background-translate | ~5-10% |
| Frontend już OK | 0% (już działa) |

---

## Szczegóły techniczne

### Wzorzec do zastosowania we wszystkich funkcjach SMTP

```typescript
async function sendSmtpEmail(
  settings: SmtpSettings,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ success: boolean; error?: string }> {
  let conn: Deno.Conn | null = null;
  
  try {
    // Połączenie
    if (settings.encryption === 'ssl') {
      conn = await withTimeout(
        Deno.connectTls({ hostname: settings.host, port: settings.port }),
        30000
      );
    } else {
      conn = await withTimeout(
        Deno.connect({ hostname: settings.host, port: settings.port }),
        30000
      );
    }

    // ... operacje SMTP (EHLO, AUTH, MAIL FROM, RCPT TO, DATA)
    
    await sendCommand('QUIT');
    return { success: true };
    
  } catch (error) {
    console.error('[SMTP] Error:', error);
    return { success: false, error: error.message };
  } finally {
    // KLUCZOWE: Zawsze zamknij połączenie
    if (conn) {
      try { 
        conn.close(); 
      } catch (closeError) {
        console.warn('[SMTP] Error closing connection:', closeError);
      }
    }
  }
}
```

### Pliki do modyfikacji

Każdy plik wymaga zmiany struktury try/catch na try/catch/finally w funkcji `sendSmtpEmail`:

```text
supabase/functions/
├── send-welcome-email/index.ts         (linie ~59-189)
├── send-approval-email/index.ts        (linie ~61-145)
├── send-training-notification/index.ts (linie ~60-140)
├── send-training-reminder/index.ts     (linie ~60-140)
├── send-password-reset/index.ts        (linie ~57-160)
├── send-activation-email/index.ts      (linie ~65-165)
├── send-single-email/index.ts          (linie ~62-160)
├── send-webinar-email/index.ts         (linie ~86-180)
├── send-webinar-confirmation/index.ts  (linie ~64-158)
├── send-maintenance-bypass-email/index.ts (linie ~77-151)
└── admin-reset-password/index.ts       (linie ~60-140)
```

