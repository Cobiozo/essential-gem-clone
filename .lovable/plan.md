
# Usunięcie przycisku "Podgląd strony rejestracji"

## Co usuwamy

Z pliku `src/components/user-reflinks/UserReflinksPanel.tsx`:

1. **Import** `ReflinkPreviewDialog` (linia 16)
2. **Import** ikony `Eye` z lucide-react (linia 12 — o ile nie jest używana gdzie indziej)
3. **Stan** `const [previewReflink, setPreviewReflink] = useState<UserReflink | null>(null);`
4. **Przycisk** z ikoną Eye w JSX:
   ```tsx
   <Button
     size="sm"
     variant="ghost"
     onClick={() => setPreviewReflink(reflink)}
     title="Podgląd strony rejestracji"
   >
     <Eye className="w-4 h-4" />
   </Button>
   ```
5. **Komponent dialogu** na końcu JSX:
   ```tsx
   {/* Preview Dialog */}
   <ReflinkPreviewDialog
     open={!!previewReflink}
     onOpenChange={(open) => !open && setPreviewReflink(null)}
     reflinkCode={previewReflink?.reflink_code || ''}
   />
   ```

## Plik `ReflinkPreviewDialog.tsx`

Plik `src/components/user-reflinks/ReflinkPreviewDialog.tsx` oraz jego eksport z `index.ts` zostawiamy bez zmian — komponent może być potrzebny w przyszłości gdy funkcja podglądu zostanie naprawiona.

## Zmiana: tylko 1 plik

| Plik | Operacja |
|---|---|
| `src/components/user-reflinks/UserReflinksPanel.tsx` | Usunięcie stanu, przycisku Eye i komponentu ReflinkPreviewDialog |

Po zmianie lista linków będzie wyglądać tak: QR kod → kopiuj → toggle (dla aktywnych) lub QR kod → oko (wygasłe — tylko inne miejsca) → Przedłuż (dla wygasłych). Przycisk oka zniknie całkowicie z interfejsu.
