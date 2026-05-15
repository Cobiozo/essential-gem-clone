## Cel
Spójność nazw „Biblioteka” (zamiast „Zasoby wiedzy”) i „Baza wiedzy” (zamiast „Zdrowa Wiedza”) we wszystkich widocznych miejscach (pasek boczny admina, nagłówki sekcji, pasek boczny dashboardu, strony publiczne i widgety).

## Diagnoza
- W `AdminSidebar.tsx` pozycja menu `resources` (Biblioteka) korzysta z tłumaczenia `t('admin.sidebar.resources')`, które obecnie zwraca „Zasoby wiedzy”. Zmiana w `ProductCatalogManager` nie wpływa na pasek boczny.
- Pozycja `healthyKnowledge` w `AdminSidebar` ma już hardcoded `'Baza wiedzy'`, ale nagłówek sekcji w `HealthyKnowledgeManagement.tsx` nadal pokazuje „Zdrowa Wiedza” (widoczne na screenie 2).
- W kilku innych miejscach UI też widnieje „Zdrowa Wiedza” (widget, strony publiczne, player, tour) — wymagają ujednolicenia.

## Zmiany

### 1. `src/components/admin/AdminSidebar.tsx`
W mapie `hardcodedLabels` dodać:
```
resources: 'Biblioteka',
```
Dzięki temu pozycja paska bocznego pokaże „Biblioteka” niezależnie od tłumaczenia w bazie.

### 2. `src/components/admin/HealthyKnowledgeManagement.tsx` (linia 433)
Zmienić nagłówek `<h2>Zdrowa Wiedza</h2>` → `<h2>Baza wiedzy</h2>`.

### 3. `src/pages/HealthyKnowledge.tsx` (linie 238, 246)
`tf('hk.title', 'Zdrowa Wiedza')` → `tf('hk.title', 'Baza wiedzy')` (zarówno tytuł layoutu, jak i nagłówek H1).

### 4. `src/pages/HealthyKnowledgePlayer.tsx` (linie 165, 175, 188, 221)
Wszystkie wystąpienia `'Zdrowa Wiedza'` (zarówno `title`, jak i `backTo.label`) → `'Baza wiedzy'`.

### 5. `src/pages/HealthyKnowledgePublicPage.tsx` (linie 253, 344)
Tekst `Zdrowa Wiedza` → `Baza wiedzy` w nagłówku strony publicznej i karcie OTP.

### 6. `src/components/dashboard/widgets/HealthyKnowledgeWidget.tsx` (linie 90, 113)
Fallback `t('dashboard.healthyKnowledge') || 'Zdrowa Wiedza'` → `|| 'Baza wiedzy'`.

### 7. `src/components/dashboard/widgets/CombinedOtpCodesWidget.tsx` (linie 426, 517)
Etykiety `Zdrowa Wiedza` → `Baza wiedzy`.

### 8. `src/components/onboarding/tourSteps.ts` (linia 186)
Tytuł kroku `🧬 Zdrowa Wiedza` → `🧬 Baza wiedzy`.

### 9. `src/components/admin/StorageAuditSection.tsx` (linia 60)
`'healthy-knowledge': 'Zdrowa wiedza'` → `'Baza wiedzy'` (etykieta bucketu w panelu storage).

### 10. `src/components/admin/DynamicContentTranslation.tsx` (linia 396)
`label: 'Zdrowa Wiedza'` → `'Baza wiedzy'`.

## Poza zakresem
- Komentarz w `src/types/healthyKnowledge.ts` i ścieżka `/zdrowa-wiedza/` w `ProfileCompletionGuard.tsx` — tylko kod/URL, nie UI.
- Wartości w bazie (`system_texts`, kategorie `healthy_knowledge`) pozostają bez zmian — zmiany dotyczą wyłącznie warstwy prezentacji, więc nie ma ryzyka utraty danych.
