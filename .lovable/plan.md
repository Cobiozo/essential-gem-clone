
# Plan: Naprawa przesyłania okładek w Zdrowa Wiedza

## Diagnoza

Przeanalizowałem wszystkie polityki RLS dla bucketu `healthy-knowledge`. Odkryłem, że:

1. **Istnieją zduplikowane polityki INSERT i UPDATE** - stare (`hk_storage_admin_*`) z rolą `authenticated` i nowe (`Admins can ...`) bez ograniczenia roli
2. **Używanie `upsert: true`** wymaga zarówno polityki INSERT jak i UPDATE, co komplikuje działanie
3. **Nazwa pliku używa timestampa** (`thumbnails/${Date.now()}-...`), więc duplikaty nigdy nie występują

## Rozwiązanie

### Zmiana 1: Usunięcie `upsert: true` z uploadu okładki

**Plik**: `src/components/admin/HealthyKnowledgeManagement.tsx`

Zmienić opcję `upsert: true` na `upsert: false` (lub usunąć całkowicie, bo `false` jest domyślne):

```typescript
// PRZED (linia 777):
.upload(fileName, file, { upsert: true });

// PO:
.upload(fileName, file, { cacheControl: '3600' });
```

**Uzasadnienie**: 
- Nazwa pliku zawsze jest unikalna dzięki timestamp (`Date.now()`)
- Usunięcie `upsert: true` eliminuje potrzebę polityki UPDATE
- Polityka INSERT istnieje i powinna działać

### Zmiana 2: Migracja SQL - uproszczenie polityk

Usunąć nadmiarowe polityki i zostawić tylko jeden zestaw spójnych polityk z rolą `authenticated`:

```sql
-- Usunięcie zduplikowanych polityk
DROP POLICY IF EXISTS "Admins can upload to healthy-knowledge" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update healthy-knowledge files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete from healthy-knowledge" ON storage.objects;

-- Upewnienie się, że stare polityki z rolą authenticated działają
-- (hk_storage_admin_upload, hk_storage_admin_update, hk_storage_admin_delete już istnieją)
```

### Zmiana 3 (alternatywna): Użycie komponentu MediaUpload

Jeśli powyższe nie zadziała, zamienić ręczny upload na komponent `MediaUpload` z hookiem `useLocalStorage`, który jest używany w innych miejscach aplikacji i działa poprawnie:

```typescript
<MediaUpload
  onMediaUploaded={(url) => {
    setEditingMaterial({
      ...editingMaterial,
      thumbnail_url: url,
    });
  }}
  allowedTypes={['image']}
  maxSizeMB={10}
  compact
/>
```

---

## Szczegóły implementacji

| Plik | Zmiana |
|------|--------|
| `HealthyKnowledgeManagement.tsx` | Zmiana `upsert: true` na `cacheControl: '3600'` |
| Migracja SQL | Usunięcie zduplikowanych polityk TO PUBLIC |

## Oczekiwany rezultat

1. Upload okładki będzie używał tylko INSERT (bez UPDATE)
2. Polityki RLS będą działać poprawnie z rolą `authenticated`
3. Nie będzie konfliktów między różnymi zestawami polityk
