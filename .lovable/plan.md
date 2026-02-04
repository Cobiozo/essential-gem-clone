
# Plan: Naprawa okładek Zdrowa Wiedza i widoku użytkowników na mobile

## Zidentyfikowane problemy

### Problem 1: Błąd przesyłania okładki w Zdrowa Wiedza

**Przyczyna**: Bezpośredni upload w `HealthyKnowledgeManagement.tsx` nie sanityzuje nazwy pliku, co powoduje problemy z plikami zawierającymi spacje i znaki specjalne (np. `WhatsApp Image 2026-02-04 at 03.20.10.jpeg`).

Porównanie kodu:
- **MediaUpload (działa)**: używa `useLocalStorage` → `file.name.replace(/[^a-zA-Z0-9.-]/g, '_')` - usuwa wszystkie problematyczne znaki
- **Thumbnail upload (błąd)**: `thumbnails/${Date.now()}-${file.name}` - przekazuje surową nazwę pliku

### Problem 2: Chaotyczne wyświetlanie użytkowników na mobile

**Przyczyna**: Układ `CompactUserCard` nie adaptuje się do wąskich ekranów:
1. Przyciski akcji mają `flex-shrink-0`, co zmusza główną sekcję do skrajnego zmniejszenia
2. Długie dane (EQ ID, email, data, telefon, ostatnie logowanie) w jednym wierszu flex z separatorami `•` powoduje łamanie tekstu znak po znaku
3. Brak dedykowanego układu mobilnego - wszystko próbuje zmieścić się poziomo

---

## Rozwiązanie

### Zmiana 1: Sanityzacja nazwy pliku okładki

**Plik**: `src/components/admin/HealthyKnowledgeManagement.tsx`

Dodać sanityzację nazwy pliku przed uploadem (identyczną jak w `useLocalStorage`):

```typescript
// Linia ~772 - przed uploadem
const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
const fileName = `thumbnails/${Date.now()}-${sanitizedFileName}`;
```

Dodatkowo dodać lepszą obsługę błędów z wyświetleniem szczegółów:

```typescript
} catch (error: any) {
  console.error('Thumbnail upload error:', error);
  toast.error(`Błąd przesyłania okładki: ${error.message || 'Nieznany błąd'}`);
}
```

### Zmiana 2: Responsywny układ CompactUserCard

**Plik**: `src/components/admin/CompactUserCard.tsx`

Przeprojektować główny układ karty dla urządzeń mobilnych:

**A) Zmiana struktury głównego kontenera (linia ~202)**:
```typescript
// PRZED:
<div className="flex items-center gap-3 p-3">

// PO - zmienić na stos pionowy dla małych ekranów:
<div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3">
```

**B) Sekcja głównych informacji (linie ~216-275)**:

Podzielić informacje na dwa wiersze na mobile:
- Wiersz 1: Imię + rola + status email
- Wiersz 2: EQ ID, email (obcięty), data

```typescript
// Zmienić sekcję szczegółów (linia ~241):
<div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-muted-foreground mt-0.5">
  {/* Pierwszy wiersz mobilny: EQ + email */}
  <div className="flex items-center gap-1.5 flex-wrap">
    {userProfile.eq_id && (
      <span className="font-medium whitespace-nowrap">EQ: {userProfile.eq_id}</span>
    )}
    {hasName && (
      <span className="truncate max-w-[150px] sm:max-w-none">{userProfile.email}</span>
    )}
  </div>
  
  {/* Drugi wiersz mobilny: data + telefon + ostatnie logowanie */}
  <div className="flex items-center gap-1.5 flex-wrap text-muted-foreground/70">
    <span className="whitespace-nowrap">{new Date(userProfile.created_at).toLocaleDateString('pl-PL')}</span>
    {userProfile.phone_number && (
      <span className="whitespace-nowrap">{userProfile.phone_number}</span>
    )}
  </div>
</div>
```

**C) Sekcja przycisków akcji (linie ~297-447)**:

Przenieść przyciski akcji pod główną zawartość na mobile:

```typescript
// Zmienić kontener przycisków:
<div className="flex items-center gap-1.5 flex-shrink-0 mt-2 sm:mt-0 w-full sm:w-auto justify-end">
```

**D) Ukrycie niektórych danych na mobile**:

Ostatnie logowanie jest zbyt długie dla mobile - przenieść do sekcji rozwijalnej:

```typescript
// Usunąć z głównego widoku dla mobile:
{/* Last sign in - tylko na desktop */}
<span className="hidden sm:inline">
  Ostatnio: {new Date(userProfile.last_sign_in_at).toLocaleString('pl-PL', {...})}
</span>
```

---

## Szczegółowa tabela zmian

| Plik | Lokalizacja | Zmiana |
|------|-------------|--------|
| `HealthyKnowledgeManagement.tsx` | Linia 772 | Sanityzacja nazwy pliku przed uploadem |
| `HealthyKnowledgeManagement.tsx` | Linia 791 | Wyświetlanie szczegółowego błędu |
| `CompactUserCard.tsx` | Linia 202 | `flex-col sm:flex-row` dla głównego kontenera |
| `CompactUserCard.tsx` | Linie 241-274 | Podział szczegółów na 2 wiersze mobilne |
| `CompactUserCard.tsx` | Linia 297 | Responsywny kontener przycisków |
| `CompactUserCard.tsx` | Linie 262-273 | Ukrycie "ostatnie logowanie" na mobile |

---

## Oczekiwane rezultaty

Po wdrożeniu:

1. **Okładki Zdrowa Wiedza**:
   - Pliki z nazwami zawierającymi spacje/znaki specjalne (np. WhatsApp) będą poprawnie przesyłane
   - Błędy będą wyświetlane ze szczegółami, ułatwiając diagnostykę

2. **Widok użytkowników na mobile**:
   - Czytelny układ w orientacji pionowej i poziomej
   - Dane nie będą się łamać znak po znaku
   - Przyciski akcji będą dostępne i widoczne
   - Kluczowe informacje (imię, rola, EQ, email) widoczne od razu
   - Szczegóły (ostatnie logowanie) dostępne po rozwinięciu lub na większych ekranach
