

## Naprawa audytu plików Storage

### Zidentyfikowane problemy

1. **Storage API `list()` nie dziala rekursywnie** -- zwraca tylko obiekty na 1. poziomie folderow. W buckecie `certificates` (struktura `userId/certId/file.pdf`) pokazuje 33 folderow zamiast 196 plikow.
2. **Rozmiary plikow = 0 B** -- foldery z `list()` nie maja metadanych `size`.
3. **Bledne nazwy tabel/kolumn w mapowaniu** -- `healthy_knowledge_items` (nie istnieje), `knowledge_resources.file_url` (nie istnieje).
4. **Certyfikaty -- 100% oznaczane jako osierocone** -- bo mechanizm porownywania nie radzi sobie ze sciezkami zagniezdzonymi.

### Rozwiazanie

#### 1. Edge Function `audit-storage-files` -- przepisanie listowania plikow

Zamiast `storage.list()` (ktore nie dziala rekursywnie), uzyc **bezposredniego zapytania do `storage.objects`** przez Supabase Admin Client:

```text
supabaseAdmin
  .from('objects')           -- NIE storage_objects_view
  .select('name, metadata')
  .eq('bucket_id', bucketId)
```

Uwaga: tabela `storage.objects` nie jest dostepna przez `.from()` (to schemat `storage`, nie `public`). Dlatego nalezy uzyc **RPC** lub rekursywnego listowania przez Storage API.

Podejscie: rekursywne `storage.from(bucket).list(folder)` -- czyli:
- Wylistuj top-level
- Dla kazdego elementu bez rozszerzenia (folder) -- wylistuj jego zawartosc rekursywnie
- Zbierz wszystkie pliki z pelna sciezka

#### 2. Poprawka mapowania tabel

Aktualne (bledne) vs prawidlowe:

```text
healthy-knowledge:
  BLAD:    healthy_knowledge_items.file_url
  POPRAWKA: healthy_knowledge.media_url

knowledge-resources:
  BLAD:    knowledge_resources.file_url
  POPRAWKA: knowledge_resources.source_url

Dodac brakujace:
  cms_sections.background_image (dla cms-images)
```

#### 3. Poprawka dopasowania plikow certyfikatow

Pliki certyfikatow maja sciezki: `userId/certId/certificate-timestamp.pdf`
Rekordy `certificates.file_url` zawieraja te same sciezki.

Dopasowanie musi porownywac pelna sciezke pliku z wartoscia `file_url`, a nie tylko nazwe pliku.

#### 4. Rozszerzenie o pliki na VPS (informacyjnie)

Wiele plikow jest hostowanych na `purelife.info.pl/uploads/...`, nie w Supabase Storage. Audyt Storage tego nie obejmie, ale mozna dodac sekcje informacyjna: "X plikow w bazie odwoluje sie do serwera VPS" -- bez mozliwosci czyszczenia z poziomu aplikacji.

### Plan zmian plikow

**Plik 1: `supabase/functions/audit-storage-files/index.ts`**
- Zamienic `storage_objects_view` i fallback `list()` na rekursywne listowanie z `storage.from(bucket).list(folder)` w glab
- Poprawic `BUCKET_REFERENCES`:
  - `healthy-knowledge` -> `healthy_knowledge.media_url`
  - `knowledge-resources` -> `knowledge_resources.source_url`
- Poprawic logike dopasowania: porownywac pelna sciezke pliku z wartoscia URL z bazy (nie tylko nazwe pliku)
- Dodac obsluge sciezek zagniezdonych (certyfikaty: `userId/certId/file.pdf`)

**Plik 2: `src/components/admin/StorageAuditSection.tsx`**
- Bez zmian strukturalnych -- komponent bedzie dzialal poprawnie po naprawie Edge Function
- Opcjonalnie: dodac informacje o plikach na VPS

### Oczekiwane wyniki po naprawie

| Bucket | Plikow | Rozmiar | Status |
|--------|--------|---------|--------|
| certificates | 196 | 1.30 GB | Prawidlowy audyt -- porownanie z certificates.file_url |
| cms-videos | 25 | 380 MB | Prawidlowy audyt |
| cms-images | 347 | 142 MB | Prawidlowy audyt |
| healthy-knowledge | 50 | 74 MB | Naprawiony -- prawidlowa tabela/kolumna |
| knowledge-resources | 5 | 14 MB | Naprawiony -- source_url zamiast file_url |
| cms-files | 6 | 28 MB | Bez zmian |
| training-media | 1 | 7 MB | Bez zmian |
| sidebar-icons | 5 | 60 KB | Bez zmian |

**Laczna pojemnosc Storage: ~1.95 GB** (zamiast 83.95 MB wyswietlanych obecnie)

