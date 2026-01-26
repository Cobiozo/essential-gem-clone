
# Plan: Ukrywanie przycisków Pobierz/Udostępnij w dialogu grafik

## Problem

Po wyłączeniu opcji "Udostępnianie" dla wszystkich grafik poprzez przycisk "Wyłącz" w panelu admina, przycisk "Udostępnij" nadal jest widoczny w dialogu podglądu grafiki w Bibliotece.

**Przyczyna:** Komponent `SocialShareDialog` nie przyjmuje ani nie sprawdza flag `allow_share`, `allow_download` i `allow_copy_link` z zasobu - zawsze wyświetla wszystkie przyciski.

---

## Rozwiązanie

### Zmiana 1: Rozszerzenie props w `SocialShareDialog.tsx`

Dodanie nowych propsów kontrolujących widoczność przycisków:

```typescript
interface SocialShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
  resourceId: string;
  // NEW: Action visibility flags
  allowDownload?: boolean;
  allowShare?: boolean;
  allowCopyLink?: boolean;
}
```

### Zmiana 2: Warunkowe renderowanie przycisków w `SocialShareDialog.tsx`

```typescript
export const SocialShareDialog: React.FC<SocialShareDialogProps> = ({
  open,
  onOpenChange,
  imageUrl,
  title,
  resourceId,
  allowDownload = true,  // domyślnie true dla wstecznej kompatybilności
  allowShare = true,
  allowCopyLink = true,
}) => {
  // ...

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* ... image preview ... */}

        {/* Action Buttons - pokazuj tylko jeśli jest jakakolwiek akcja */}
        {(allowDownload || allowShare) && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4">
            {/* Download Button - warunkowo */}
            {allowDownload && (
              <Button onClick={handleDownload} className="flex-1 gap-2">
                <Download className="h-4 w-4" />
                {t('dashboard.download')}
              </Button>
            )}

            {/* Share Dropdown - warunkowo */}
            {allowShare && (
              <DropdownMenu>
                {/* ... dropdown content ... */}
                {/* W środku: Copy Link też warunkowy */}
                {allowCopyLink && (
                  <DropdownMenuItem onClick={handleCopyLink}>
                    <Copy className="h-4 w-4" />
                    {t('share.copyLink')}
                  </DropdownMenuItem>
                )}
              </DropdownMenu>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
```

### Zmiana 3: Przekazanie flag w `KnowledgeCenter.tsx`

```typescript
<SocialShareDialog
  open={!!selectedGraphic}
  onOpenChange={() => setSelectedGraphic(null)}
  imageUrl={selectedGraphic?.source_url || ''}
  title={selectedGraphic?.title || ''}
  resourceId={selectedGraphic?.id || ''}
  // NEW: Przekazanie flag z zasobu
  allowDownload={selectedGraphic?.allow_download ?? true}
  allowShare={selectedGraphic?.allow_share ?? true}
  allowCopyLink={selectedGraphic?.allow_copy_link ?? true}
/>
```

---

## Efekt końcowy

| Stan flagi w bazie | Widoczność w dialogu |
|-------------------|---------------------|
| `allow_share = false` | Brak przycisku "Udostępnij" |
| `allow_download = false` | Brak przycisku "Pobierz" |
| `allow_copy_link = false` | Brak opcji "Kopiuj link" w dropdown |
| Wszystkie wyłączone | Dialog pokazuje tylko obrazek bez przycisków akcji |

## Pliki do modyfikacji

| Plik | Zmiana |
|------|--------|
| `src/components/share/SocialShareDialog.tsx` | Dodanie propsów `allowDownload`, `allowShare`, `allowCopyLink` + warunkowe renderowanie |
| `src/pages/KnowledgeCenter.tsx` | Przekazanie flag z `selectedGraphic` do dialogu |
