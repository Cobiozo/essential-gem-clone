
# Plan: Naprawa funkcji okładek w module "Zdrowa Wiedza"

## Zidentyfikowany problem

**Bucket `healthy-knowledge` jest prywatny** - obrazy okładek są uploadowane, ale nie mogą być wyświetlane publicznie, ponieważ bucket ma ustawienie `public: false`.

Na screenshocie `image-114.png` widać broken image (`🖼Okładka`) - próba wyświetlenia obrazu z prywatnego bucketu nie powiedzie się.

## Rozwiązanie

### 1. Migracja SQL - ustawienie bucketu jako publiczny

Zmiana ustawienia bucketu `healthy-knowledge` na publiczny, aby okładki mogły być wyświetlane:

```sql
UPDATE storage.buckets 
SET public = true 
WHERE id = 'healthy-knowledge';
```

### 2. Dodanie polityki RLS dla publicznego odczytu

Po ustawieniu bucketu jako publiczny, potrzebna jest polityka RLS pozwalająca na odczyt:

```sql
-- Polityka pozwalająca na publiczny odczyt z bucketu healthy-knowledge
CREATE POLICY "Public read access for healthy-knowledge"
ON storage.objects FOR SELECT
USING (bucket_id = 'healthy-knowledge');

-- Polityka pozwalająca adminom na upload
CREATE POLICY "Admin can upload to healthy-knowledge"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin() OR is_super_admin())
);

-- Polityka pozwalająca adminom na usuwanie
CREATE POLICY "Admin can delete from healthy-knowledge"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'healthy-knowledge' 
  AND (SELECT is_admin() OR is_super_admin())
);
```

## Podsumowanie zmian

| Zmiana | Opis |
|--------|------|
| Migracja SQL | Ustawienie bucketu jako publiczny + polityki RLS |

## Efekt końcowy

1. **Okładki będą widoczne** - obrazy z bucketu `healthy-knowledge` będą dostępne publicznie
2. **Bezpieczeństwo zachowane** - tylko admini mogą uploadować/usuwać pliki
3. **Istniejące okładki zaczną działać** - URL do okładki ADHD automatycznie zacznie działać

## Sekcja techniczna

### Plik migracji: `supabase/migrations/[timestamp]_fix_healthy_knowledge_bucket.sql`

```sql
-- Make healthy-knowledge bucket public for thumbnails
UPDATE storage.buckets 
SET public = true 
WHERE id = 'healthy-knowledge';

-- Allow public read access
CREATE POLICY "Public read access for healthy-knowledge"
ON storage.objects FOR SELECT
USING (bucket_id = 'healthy-knowledge');

-- Allow authenticated admin upload
CREATE POLICY "Admin can upload to healthy-knowledge"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'healthy-knowledge' 
  AND auth.role() = 'authenticated'
  AND (SELECT is_admin() OR is_super_admin())
);

-- Allow authenticated admin delete
CREATE POLICY "Admin can delete from healthy-knowledge"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'healthy-knowledge' 
  AND auth.role() = 'authenticated'
  AND (SELECT is_admin() OR is_super_admin())
);
```
