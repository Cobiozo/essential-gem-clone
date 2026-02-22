

## Rozszerzenie panelu "Czyszczenie danych" o audyt plików storage

### Cel
Rozbudowa komponentu `DataCleanupManagement` o sekcje audytu plików w Supabase Storage, pokazujace przy kazdej kategorii:
- Ile plików do usuniecia
- Ile GB zaoszczedzone (lokalnie / cloud / lacznie)

### Aktualne dane (ze skanowania bazy)

| Bucket | Plików | Rozmiar | Osierocone |
|--------|--------|---------|------------|
| certificates | 196 | ~1.30 GB | ~69 plików (~0.75 GB) - nie powiazane z zadnym rekordem certyfikatu |
| cms-videos | 25 | ~380 MB | ~24 pliki (~367 MB) - stare uploady training-media, duplikaty |
| cms-images | 347 | ~142 MB | Do weryfikacji |
| training-media | 1 | ~7 MB | 0 |
| healthy-knowledge | 50 | ~74 MB | Do weryfikacji |
| cms-files | 6 | ~28 MB | Do weryfikacji |

### Plan implementacji

#### 1. Nowa Edge Function: `audit-storage-files`
Utworzenie nowej Edge Function, ktora:
- Przyjmuje `action: 'audit' | 'cleanup'` i opcjonalnie `bucket_name`
- Dla kazdego bucketu:
  - Liczy wszystkie pliki i ich laczny rozmiar
  - Sprawdza powiazania z tabelami bazodanowymi (np. `certificates.file_url`, `training_lessons.media_url`, `cms_items.media_url`, `healthy_knowledge_items.file_url`)
  - Zwraca: `total_files`, `total_bytes`, `orphaned_files`, `orphaned_bytes`
- Dla `action: 'cleanup'` -- usuwa osierocone pliki
- Wymaga autoryzacji admina (tak jak `cleanup-database-data`)

#### 2. Rozbudowa komponentu `DataCleanupManagement.tsx`

Dodanie nowej sekcji **"Audyt plików Storage"** pod istniejacymi kategoriami czyszczenia danych:

- Nowa karta podsumowania w headerze: **"Oszczednosc storage"** z laczna wartoscia GB do odzyskania
- Dla kazdego bucketu wyswietlenie karty z:
  - Nazwa bucketu i ikona
  - Liczba plików: lacznie / osierocone
  - Rozmiar: lacznie / osierocone (w MB/GB)
  - Przycisk "Wyczysc osierocone"
- Podsumowanie na dole: **laczna wartosc po usunieciu wszystkich osieroconych plikow**
- Rozroznienie: pliki lokalne (VPS - `purelife.info.pl`) vs cloud (Supabase Storage)

#### 3. Podsumowanie oszczednosci

Widok zbiorczy:
- **Cloud Storage (Supabase)**: X plików / Y GB
- **Lacznie do odzyskania**: podliczenie calkowite

### Szczegoly techniczne

**Edge Function `audit-storage-files`:**
- Mapowanie bucketow do tabel referencyjnych:

```text
certificates    -> certificates.file_url
cms-videos      -> training_lessons.media_url, cms_items.media_url
cms-images      -> cms_items.media_url, cms_sections (background)
training-media  -> training_lessons.media_url
healthy-knowledge -> (tabela healthy_knowledge)
knowledge-resources -> knowledge_resources.file_url
cms-files       -> cms_items.media_url
```

- Plik osierocony = istnieje w `storage.objects` ale nie jest odwolywany w zadnej z powiazanych tabel
- Usuwanie w partiach po 100 plikow

**Komponent:**
- Nowy interfejs `StorageBucketAudit` z polami: `bucket_id`, `total_files`, `total_bytes`, `orphaned_files`, `orphaned_bytes`
- Stan ladowania per-bucket
- Dialog potwierdzenia przed usunieciem
- Formatowanie rozmiarow za pomoca istniejacego helpera `formatFileSize` z `storageConfig.ts`

