
# Poprawki UI dashboardu - 4 zmiany

## Zakres prac

1. **Zmiana emaila kontaktowego** na `support@purelife.info.pl`
2. **Poprawka logo** w stopce dashboardu (używa `dropletIcon` zamiast właściwego logo)
3. **Przesunięcie ikony cookie** aby nie zasłaniała przycisku "Wyloguj się"
4. **Przesunięcie ikon asystentów** aby nie zasłaniały linku "Regulamin" na dole strony

---

## Szczegóły techniczne

### 1. Zmiana emaila kontaktowego

**Problem:** Email kontaktowy pokazuje się jako `kontakt@purelife.info.pl` lub `support@purelife.info.pl` w różnych miejscach (screenshot pokazuje `support@purelife.info.pl` w sekcji kontaktu).

**Rozwiązanie:** Aktualizacja emaila kontaktowego w bazie danych + zmiana fallbacków w kodzie.

**Pliki do modyfikacji:**

| Plik | Zmiana |
|------|--------|
| `src/components/dashboard/widgets/DashboardFooterSection.tsx` | Zmiana fallback email z `kontakt@` na `support@purelife.info.pl` (linie 128, 131) |
| `src/components/support/SupportFormDialog.tsx` | Fallback już jest `support@purelife.info.pl` - OK |
| `supabase/functions/send-support-email/index.ts` | Fallback już jest `support@purelife.info.pl` - OK |

**SQL do aktualizacji bazy:**
```sql
UPDATE dashboard_footer_settings 
SET contact_email_address = 'support@purelife.info.pl';
```

---

### 2. Poprawka logo w stopce dashboardu

**Problem:** W stopce dashboardu (linia 139) używane jest `dropletIcon` (`pure-life-droplet.png`), podczas gdy na stronie głównej używane jest właściwe logo (`pure-life-logo-new.png` lub `logo-niezbednika-pure-life.png`).

**Rozwiązanie:** Zamiana importu i użycia logo w stopce.

**Plik: `src/components/dashboard/widgets/DashboardFooterSection.tsx`**

```typescript
// PRZED (linia 4):
import dropletIcon from '@/assets/pure-life-droplet.png';

// PO:
import pureLifeLogo from '@/assets/pure-life-logo-new.png';

// PRZED (linia 139):
<img src={dropletIcon} alt="" className="w-5 h-5" />

// PO:
<img src={pureLifeLogo} alt="Pure Life" className="w-6 h-6 object-contain" />
```

---

### 3. Przesunięcie ikony cookie

**Problem:** Ikona cookie (`CookieRevisitButton`) jest pozycjonowana jako `fixed bottom-2 left-2` (8px od dołu i lewej), co może nakładać się na przycisk "Wyloguj się" w sidebarze.

**Rozwiązanie:** Zwiększenie offsetu `bottom` dla pozycji `bottom-left`, aby ikona była wyżej niż przycisk wylogowania.

**Plik: `src/components/cookies/CookieRevisitButton.tsx`**

```typescript
// PRZED (linia 28):
'bottom-left': 'fixed bottom-2 left-2 sm:bottom-4 sm:left-4',

// PO - przesunięcie wyżej:
'bottom-left': 'fixed bottom-16 left-2 sm:bottom-20 sm:left-4',
```

Przesunięcie z `bottom-2/4` na `bottom-16/20` (64px/80px) da wystarczający margines nad przyciskiem wylogowania.

---

### 4. Przesunięcie ikon asystentów

**Problem:** Ikony `ChatWidget` i `MedicalChatWidget` są pozycjonowane jako `fixed` z wartościami `bottom: 1rem` i `bottom: calc(1rem + 4.5rem)`, co powoduje nakładanie na stopkę (Regulamin, Polityka prywatności) gdy użytkownik przewinie na sam dół.

**Rozwiązanie:** Zwiększenie bazowego offsetu `bottom` dla obu widgetów.

**Plik: `src/components/ChatWidget.tsx`**

```typescript
// PRZED (linia 61):
bottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',

// PO - przesunięcie wyżej o ~3rem:
bottom: 'max(4rem, calc(env(safe-area-inset-bottom, 0px) + 3rem))',

// PRZED (linia 80) - panel czatu:
bottom: 'calc(max(1rem, env(safe-area-inset-bottom, 0px)) + 4.5rem)',

// PO:
bottom: 'calc(max(4rem, env(safe-area-inset-bottom, 0px) + 3rem) + 4.5rem)',
```

**Plik: `src/components/MedicalChatWidget.tsx`**

```typescript
// PRZED (linia 991):
bottom: 'calc(max(1rem, env(safe-area-inset-bottom, 0px)) + 4.5rem)',

// PO:
bottom: 'calc(max(4rem, env(safe-area-inset-bottom, 0px) + 3rem) + 4.5rem)',

// PRZED (linia 1008) - panel czatu:
bottom: 'calc(max(1rem, env(safe-area-inset-bottom, 0px)) + 9rem)',

// PO:
bottom: 'calc(max(4rem, env(safe-area-inset-bottom, 0px) + 3rem) + 9rem)',
```

---

## Podsumowanie plików do modyfikacji

| Plik | Zmiany |
|------|--------|
| `src/components/dashboard/widgets/DashboardFooterSection.tsx` | Import logo, zmiana obrazka w stopce, fallback email |
| `src/components/cookies/CookieRevisitButton.tsx` | Przesunięcie pozycji `bottom-left` wyżej |
| `src/components/ChatWidget.tsx` | Zwiększenie offsetu `bottom` dla przycisku i panelu |
| `src/components/MedicalChatWidget.tsx` | Zwiększenie offsetu `bottom` dla przycisku i panelu |
| **SQL migration** | Update `dashboard_footer_settings.contact_email_address` |

---

## Oczekiwany rezultat

1. Email kontaktowy wszędzie pokazuje `support@purelife.info.pl`
2. Logo w stopce dashboardu jest identyczne jak na stronie głównej
3. Ikona cookie nie nakłada się na przycisk "Wyloguj się"
4. Ikony asystentów nie nakładają się na linki "Regulamin" i "Polityka prywatności" w stopce
