
# Plan: Naprawa odtwarzania wideo w Zdrowa Wiedza

## Zdiagnozowany problem

### Przyczyna
W pliku `HealthyKnowledgePublicPage.tsx` (linia 234) wideo jest wyświetlane z ustawieniem `disableInteraction={true}`:

```typescript
<SecureMedia
  mediaUrl={content.media_url}
  mediaType={content.content_type}
  disableInteraction={true}  // ← To powoduje problem
/>
```

To ustawienie włącza **tryb restrykcyjny**, który:
- Zastępuje natywne kontrolki przeglądarki własnym komponentem `VideoControls`
- Blokuje przewijanie do przodu (tylko cofanie dozwolone)
- Używa skomplikowanej logiki buforowania, która "zawiesza się" na "Przygotowuję wideo do odtwarzania..."
- Wyświetla komunikat "Podczas pierwszego oglądania możesz tylko cofać wideo"

### Oczekiwane zachowanie
Użytkownik zewnętrzny po wpisaniu kodu OTP powinien mieć **pełną kontrolę** nad wideo:
- Odtwarzanie/pauza
- Przewijanie w dowolnym kierunku
- Regulacja głośności
- Tryb pełnoekranowy

---

## Rozwiązanie

### Zmiana w `HealthyKnowledgePublicPage.tsx`

Usunięcie lub zmiana `disableInteraction={true}` na `disableInteraction={false}`:

```typescript
// Przed (linia 231-236):
<SecureMedia
  mediaUrl={content.media_url}
  mediaType={content.content_type}
  disableInteraction={true}
/>

// Po:
<SecureMedia
  mediaUrl={content.media_url}
  mediaType={content.content_type}
  disableInteraction={false}
/>
```

To spowoduje użycie **trybu nierestrykcyjnego** (linie 1109-1126 w SecureMedia.tsx), który renderuje standardowy element `<video controls>` z natywnymi kontrolkami przeglądarki.

---

## Bezpieczeństwo zmian

| Aspekt | Status |
|--------|--------|
| Wpływ na inne moduły | ❌ Brak - zmiana tylko w publicznej stronie ZW |
| Wpływ na szkolenia | ❌ Brak - szkolenia używają własnej logiki z restricted mode |
| Wpływ na InfoLinki | ❌ Brak - InfoLinki nie używają SecureMedia |
| Zachowane zabezpieczenia | ✅ Blokada prawego przycisku myszy, blokada pobierania |

### Dlaczego to jest bezpieczne?
1. Zmiana dotyczy TYLKO strony publicznej Zdrowa Wiedza (`HealthyKnowledgePublicPage.tsx`)
2. Moduły szkoleniowe (`TrainingLesson`, `TrainingView`) mają własną logikę i pozostają bez zmian
3. Podstawowe zabezpieczenia `SecureMedia` (blokada context menu, controlsList="nodownload") pozostają aktywne

---

## Podsumowanie zmian

| Plik | Zmiana |
|------|--------|
| `src/pages/HealthyKnowledgePublicPage.tsx` | Zmiana `disableInteraction={true}` na `disableInteraction={false}` (linia 234) |

### Efekt po zmianach
- Wideo będzie ładować się prawidłowo
- Użytkownik będzie miał pełne kontrolki (play/pause, seek, fullscreen)
- Komunikat o ograniczeniach przewijania zniknie
- Timer dostępu będzie nadal działał poprawnie
