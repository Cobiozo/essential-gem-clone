
## Usuwanie duplikatów i nieaktywnych modułów szkoleniowych

### Co zostanie usunięte

Znaleziono **3 nieaktywne moduły** z łącznie **12 lekcjami** i **12 plikami wideo** na VPS:

| Moduł | Lekcje | Postępy użytkowników | Pliki na VPS |
|-------|--------|---------------------|--------------|
| SPRZEDAŻOWE (S) | 10 | 12 rekordów | 10 plików |
| ROZWOJOWE | 2 | 0 | 2 plików |
| SOCIAL MEDIA (PURE BRAND) | 0 | 0 | 0 plików |

### Kolejność operacji

1. **Usunięcie postępów** -- 12 rekordów z `training_progress` powiązanych z lekcjami nieaktywnego modułu SPRZEDAŻOWE (S)
2. **Usunięcie lekcji** -- 12 rekordów z `training_lessons` dla nieaktywnych modułów
3. **Usunięcie modułów** -- 3 rekordy z `training_modules` (SPRZEDAŻOWE (S), ROZWOJOWE, SOCIAL MEDIA)
4. **Usunięcie plików z VPS** -- 12 plików wideo przez endpoint `DELETE /upload/:filename?folder=training-media` na serwerze VPS

### Pliki do usunięcia z VPS

```text
training-media/1769356938599-3zvozc-1__wstep.mp4
training-media/1769357052253-j8r8yl-3__na_pewno_.mp4
training-media/1769357135859-aht9u0-zasady.mp4
training-media/1769357260629-m17p4x-formy.mp4
training-media/1769357592161-v1ldmk-3ff.mp4
training-media/1769357685971-meimvt-bledy.mp4
training-media/1769357774124-ua0ktn-obsluga_klienta.mp4
training-media/1769357841708-bls1wf-GWARANCJA_SATYSFAKCJI.mp4
training-media/1769358114202-l0ovou-copy_77815C26-C5D6-4972-915B-08B8A890C4C1.mp4
training-media/1769358225616-s88go6-copy_3A010649-7110-4EE7-8390-EF92054493EA.mp4
training-media/1769904887607-41pmtb-kim_jestes.mp4
training-media/1769905016591-gslbey-marka_premium.mp4
```

### Implementacja techniczna

Utworzę Edge Function `cleanup-inactive-training` która:
1. Pobierze nieaktywne moduły i ich lekcje
2. Usunie `training_progress` -> `training_lessons` -> `training_modules` (w prawidłowej kolejności kaskadowej)
3. Wywoła endpoint DELETE na VPS dla każdego pliku
4. Zwróci raport z wynikami

Funkcja będzie jednorazowa -- wywoływana ręcznie z poziomu admina lub bezpośrednio przez curl.
