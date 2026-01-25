

# Plan: Ujednolicenie uploadu Zdrowa Wiedza z Akademią

## Znalezione różnice

Po porównaniu kodu Akademii (`TrainingManagement.tsx`) i Zdrowej Wiedzy (`HealthyKnowledgeManagement.tsx`):

| Aspekt | Akademia | Zdrowa Wiedza |
|--------|----------|---------------|
| Komponent | `<MediaUpload />` ✅ | `<MediaUpload />` ✅ |
| Prop `maxSizeMB` | **`null`** (brak limitu) | `2048` (limit 2GB) |
| Folder | `training-media` ✅ | `training-media` ✅ |
| Callback | `handleMediaUploaded` ✅ | `handleMediaUploaded` ✅ |

**Jedyna różnica**: W Akademii `maxSizeMB={null}` oznacza "użyj domyślnego z konfiguracji i nie sprawdzaj limitu przed uploadem".

---

## Rozwiązanie

Zmienić w `HealthyKnowledgeManagement.tsx` prop `maxSizeMB` z `2048` na `null`, tak jak w Akademii.

### Zmiana (linia 724)

```tsx
// BYŁO:
<MediaUpload
  onMediaUploaded={handleMediaUploaded}
  currentMediaUrl={editingMaterial.media_url || undefined}
  currentMediaType={editingMaterial.content_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
  allowedTypes={...}
  maxSizeMB={2048}  // ← ZMIENIĆ
/>

// BĘDZIE:
<MediaUpload
  onMediaUploaded={handleMediaUploaded}
  currentMediaUrl={editingMaterial.media_url || undefined}
  currentMediaType={editingMaterial.content_type as 'image' | 'video' | 'document' | 'audio' | 'other'}
  allowedTypes={...}
  maxSizeMB={null}  // ← Identycznie jak Akademia
/>
```

---

## Dodatkowe usprawnienie: Lepsze komunikaty błędów

Jeśli VPS jest niedostępny, użytkownik widzi ogólny błąd. Dodam szczegółowsze informacje w `useLocalStorage.ts`:

```typescript
// W catch blocku
} catch (err) {
  let errorMsg = err instanceof Error ? err.message : 'Błąd uploadu pliku';
  
  // Dodaj wskazówkę dla użytkownika
  if (errorMsg.includes('VPS niedostępny') || errorMsg.includes('serwery niedostępne')) {
    errorMsg += '\n\nSpróbuj ponownie za chwilę lub skontaktuj się z administratorem systemu.';
  }
  
  setError(errorMsg);
  setIsUploading(false);
  throw new Error(errorMsg);
}
```

---

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/admin/HealthyKnowledgeManagement.tsx` | Zmiana `maxSizeMB={2048}` → `maxSizeMB={null}` |
| `src/hooks/useLocalStorage.ts` | Lepsze komunikaty błędów VPS |

---

## Dodatkowe zadania z poprzedniej wiadomości

### 1. Usunięcie flagi z nagłówka w Bibliotece

**Plik: `src/components/Header.tsx`**
- Dodać prop `hideLanguageSelector?: boolean`
- Warunkowo renderować `LanguageSelector`

**Plik: `src/pages/KnowledgeCenter.tsx`**
- Przekazać `hideLanguageSelector` do Header

### 2. Panel zgłoszeń wsparcia

**Nowy plik: `src/components/admin/SupportTicketsManagement.tsx`**
- Komponent do przeglądania zgłoszeń z formularza wsparcia
- Odczyt z `email_logs WHERE metadata->>'type' = 'support_form'`
- Tabela ze szczegółami + dialog podglądu

---

## Podsumowanie wszystkich zmian

| Plik | Zmiana |
|------|--------|
| `src/components/admin/HealthyKnowledgeManagement.tsx` | `maxSizeMB={null}` |
| `src/hooks/useLocalStorage.ts` | Lepsze komunikaty błędów |
| `src/components/Header.tsx` | Prop `hideLanguageSelector` |
| `src/pages/KnowledgeCenter.tsx` | Przekazać `hideLanguageSelector` |
| `src/components/admin/SupportTicketsManagement.tsx` | **NOWY** - panel zgłoszeń |
| Panel CMS | Dodanie zakładki "Zgłoszenia wsparcia" |

