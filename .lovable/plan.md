
# Naprawa wysyłki emaila po zatwierdzeniu przez Lidera/Admina

## Diagnoza przyczyny braku emaila do sebastiansnopek210587

### Potwierdzone fakty z logów i bazy:

1. **Szablon `leader_approval` NIE ISTNIEJE** w tabeli `email_templates`
   - Istnieją: `admin_approval`, `guardian_approval`, `welcome_registration`
   - Brak: `leader_approval` — edge function `send-approval-email` rzuca błąd 500

2. **Sebastian (sebastiansnopek210587) został zatwierdzony przez Lidera** o 14:53:12
   - `leader_approved = true`, `admin_approved = true`, `leader_approved_at = 2026-02-20 14:53:12`
   - W email_logs: wysłano TYLKO email `guardian_approval` (14:35) i `welcome` (14:33)
   - Brak emaila o pełnej aktywacji konta

3. **W `useLeaderApprovals.ts` błąd jest łykany po cichu:**
   ```typescript
   } catch (emailErr) {
     console.warn('[LeaderApprovals] Email send failed (non-critical):', emailErr);
   }
   ```
   Hook uznaje brak emaila za "non-critical" — użytkownik nigdy nie dostaje powiadomienia

4. **Rozwiązanie:** Zamiast tworzyć nowy szablon `leader_approval`, użyć istniejącego szablonu `admin_approval` który już zawiera treść o pełnej aktywacji. Lider ma takie samo uprawnienie co admin — efekt identyczny. Template `admin_approval` ma gotowy subject: "Witamy w Pure Life! Twoje konto jest w pełni aktywne 🌿"

---

## Plan naprawy

### Zmiana 1: `supabase/functions/send-approval-email/index.ts`
Zmiana mapowania szablonu: gdy `approvalType === 'leader'`, użyj szablonu `admin_approval` zamiast nieistniejącego `leader_approval`.

**Linia 212:**
```typescript
// PRZED:
const templateName = approvalType === 'guardian' ? 'guardian_approval' : approvalType === 'leader' ? 'leader_approval' : 'admin_approval';

// PO:
// leader używa tego samego szablonu co admin (pełna aktywacja konta)
const templateName = approvalType === 'guardian' ? 'guardian_approval' : 'admin_approval';
```

Dzięki temu zarówno `approvalType: 'leader'` jak i `approvalType: 'admin'` użyją szablonu `admin_approval`, który jest w pełni aktywny i zawiera poprawną treść.

### Zmiana 2: `src/hooks/useLeaderApprovals.ts` — naprawienie silent catch
Zmienić `catch` żeby **nie łykał** błędu emaila bez logowania, a dodatkowo pokazał `toast.warning` gdy email się nie powiedzie:

```typescript
// Send approval email
try {
  const { error: emailErr } = await supabase.functions.invoke('send-approval-email', {
    body: { userId: targetUserId, approvalType: 'leader', approverId: user?.id },
  });
  if (emailErr) {
    console.error('[LeaderApprovals] Email send failed:', emailErr);
    // Email failure is logged but doesn't block approval
  }
} catch (emailErr) {
  console.error('[LeaderApprovals] Email send exception:', emailErr);
}
```

### Zmiana 3: Ręczne wysłanie emaila do Sebastiana (przez admin panel)
Sebastian już jest zatwierdzony ale nie dostał emaila. Użyjemy narzędzia `send-approval-email` bezpośrednio z prawidłowym `userId`.

Skorzystamy z funkcji Edge bezpośrednio żeby dostarczyć mu zaległy email po naprawie edge function.

---

## Pliki do zmiany

| Plik | Zmiana |
|---|---|
| `supabase/functions/send-approval-email/index.ts` | Zmiana mapowania szablonu: `leader` → `admin_approval` |
| `src/hooks/useLeaderApprovals.ts` | Naprawienie cichego catch emaila |

Po wdrożeniu: automatycznie wyślemy zaległy email do Sebastiana przez wywołanie edge function.
