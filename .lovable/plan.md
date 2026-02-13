

# Plan: Automatyczne usuwanie certyfikatu po pobraniu

## Obecny flow
1. Generowanie PDF (jsPDF) -> upload do Storage -> zapis rekordu w DB
2. Pobranie: edge function `get-certificate-url` -> signed URL -> download w przegladarce
3. Plik zostaje w Storage na zawsze

## Nowy flow
1. Generowanie PDF -> upload do Storage -> zapis rekordu w DB (bez zmian)
2. Pobranie: signed URL -> download w przegladarce -> **automatyczne usuniecie pliku ze Storage**

## Zmiany

### 1. `src/pages/Training.tsx` - funkcja `downloadCertificate` (linie 272-291)
Po udanym pobraniu (po `link.click()`), dodac:
- Wywolanie `supabase.storage.from('certificates').remove([filePath])` aby usunac plik ze Storage
- Filtr sciezki pliku z `cert.url` (pole przechowywane w stanie)
- Opcjonalnie: zaktualizowac `file_url` w bazie na `'downloaded-and-deleted'`

```typescript
// Po udanym pobraniu:
if (cert.url && !cert.url.startsWith('pending') && !cert.url.startsWith('downloaded')) {
  await supabase.storage.from('certificates').remove([cert.url]);
  await supabase.from('certificates').update({ file_url: 'downloaded-and-deleted' }).eq('id', cert.id);
}
```

### 2. `supabase/functions/get-certificate-url/index.ts` (linie 95-100)
Dodac obsluge markera `'downloaded-and-deleted'` -- jesli plik zostal juz usuniety, zwrocic odpowiedni komunikat (np. "Certyfikat zostal juz pobrany. Wygeneruj ponownie.").

### 3. `src/pages/Training.tsx` - obsluga statusu `downloaded-and-deleted`
W UI, jesli certyfikat ma status `downloaded-and-deleted`:
- Zamiast przycisku "Pobierz" pokazac "Wygeneruj ponownie"
- Lub automatycznie regenerowac PDF przy probie pobrania

## Pliki do zmiany
| Plik | Zmiana |
|------|--------|
| `src/pages/Training.tsx` | Dodac usuwanie pliku ze Storage po pobraniu + obsluga statusu |
| `supabase/functions/get-certificate-url/index.ts` | Obsluga markera `downloaded-and-deleted` |

## Efekt
- Certyfikaty sa generowane i pobierane dokladnie tak jak do tej pory
- Po pobraniu plik PDF jest automatycznie usuwany ze Storage
- Rekord w bazie pozostaje (z markerem ze plik zostal pobrany i usuniety)
- Storage nie rosnie -- kazdy certyfikat istnieje tylko przez czas potrzebny na pobranie

