

# Dodanie uploadu plikow z komputera do edytora strony partnerskiej

## Cel
Aktualnie pola typu `editable_image` (np. "Zdjecie partnera") w edytorze partnera (`PartnerPageEditor.tsx`) pozwalaja jedynie na wklejenie URL. Trzeba dodac mozliwosc przeslania pliku z komputera — upload do Supabase Storage (bucket `cms-images`), po czym URL zostaje automatycznie wstawiony.

## Zmiany

### Plik: `src/components/partner-page/PartnerPageEditor.tsx`

W sekcji renderujacej pola `editable_image` (linie 189-205):

1. **Dodanie przycisku "Przeslij z komputera"** obok pola URL — przycisk z ikona `Upload` otwiera ukryty `<input type="file" accept="image/*">`
2. **Funkcja `handleImageUpload`**:
   - Walidacja typu pliku (tylko obrazy) i rozmiaru (max 2MB — limit Supabase Storage)
   - Upload do bucketu `cms-images` w sciezce `partner-photos/{userId}/{timestamp}_{filename}`
   - Pobranie publicznego URL (`getPublicUrl`)
   - Ustawienie URL w `customData[element.id]`
   - Stan ladowania (`uploading`) z animacja spinnera na przycisku
3. **Layout**: Pole URL + przycisk "Przeslij" w jednym wierszu (`flex gap-2`)

### Szczegoly techniczne

- Import `Upload`, `Loader2` z `lucide-react`
- Import `supabase` z `@/integrations/supabase/client`  
- Uzycie `useRef` dla ukrytego inputa plikow
- Bucket `cms-images` juz istnieje i jest uzywany w calym projekcie do uploadow obrazow
- Stan `uploadingField: string | null` — wskazuje ktore pole aktualnie uploaduje (obsluga wielu pol `editable_image`)
- Walidacja: max 2MB, typy `image/*`
- Sciezka uploadu: `partner-photos/{user_id}/{Date.now()}_nazwa.ext` — zapobiega kolizjom nazw

### Wplyw na UX
- Partner widzi: `[Input URL] [Przeslij z komputera]`
- Klika przycisk → wybiera plik → spinner na przycisku → URL automatycznie wstawiony + podglad obrazka ponizej
- Nadal moze wkleic URL recznie jako alternatywe

