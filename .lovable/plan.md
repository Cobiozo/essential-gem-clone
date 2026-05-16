## Problem

Na iOS/Safari pojawia się błąd:
> `Certificate save error: TypeError: Load failed`

PDF zostaje wygenerowany i nawet pobrany (widać pasek pobierania `certyfikat-PRODUKTOWE.pdf 473 KB`), ale rekord w tabeli `certificates` nie zostaje zapisany — przez co aplikacja pokazuje czerwony toast „Błąd" i przy kolejnej próbie znowu oferuje „Wygeneruj".

## Przyczyna

W `src/hooks/useCertificateGeneration.ts` kolejność kroków jest:

```
Step 5   → upload PDF do storage
Step 5b  → auto-download (kliknięcie <a download>)   ← powoduje przerwanie fetcha na iOS
Step 6   → INSERT do tabeli certificates             ← „TypeError: Load failed"
```

Na mobile Safari programowe kliknięcie linku `download` z `blob:` URL inicjuje natychmiastową obsługę pobierania przez system, co przerywa trwające/nadchodzące żądania `fetch` z tej samej strony. Następny request (insert do `certificates`) nie zdąży się wysłać i kończy się `TypeError: Load failed` — to standardowy Safari'owy odpowiednik network error.

Dodatkowy efekt: ponieważ INSERT się nie udał, ale plik został już wgrany do storage, mamy „osierocony" plik w buckecie, a użytkownik widzi błąd mimo że PDF już ma w telefonie.

## Rozwiązanie

Zmienić kolejność operacji w `useCertificateGeneration.ts` (tylko sekcje 5–8.5, bez zmian w bazie ani RLS):

```
Step 5   → upload PDF do storage
Step 6   → INSERT do certificates                    ← najpierw zapis w bazie
Step 6b  → update training_assignments
Step 7   → wysyłka maila (z fire-and-forget)
Step 8   → auto-download PDF                         ← przeniesione na sam koniec
Step 9   → cleanup storage (usunięcie pliku + file_url = 'downloaded-and-deleted')
```

Dodatkowo:
- Owinąć `supabase.from('certificates').insert(...)` w prostą funkcję retry (2 próby z 800 ms odstępem) — żeby pokryć inne sporadyczne `Load failed` z mobile sieci.
- Jeżeli INSERT ostatecznie się nie powiedzie, posprzątać świeżo wgrany plik z storage (`storage.remove([filePath])`), żeby nie zostawiać sierot.
- Komunikat błędu zostawić ten sam, ale dodać czytelniejszą wersję dla użytkownika: „Nie udało się zapisać certyfikatu. Sprawdź połączenie i spróbuj ponownie." (oryginalny błąd nadal w `console.error`).

### Zakres zmian

- **Plik:** `src/hooks/useCertificateGeneration.ts` (jedyny edytowany)
- Bez migracji DB, bez zmian RLS, bez zmian w komponentach UI, bez zmian w edge functions.

### Dlaczego to zadziała

- INSERT poleci do Supabase zanim Safari przejmie kontrolę nad blob-em do pobrania → request nie zostaje anulowany.
- Auto-download jest ostatnim krokiem, więc nawet jeśli przeglądarka przerwie późniejsze fetch'e (mail, cleanup), to są one „fire-and-forget" i ich nieudanie nie blokuje sukcesu certyfikatu (są już w `try/catch` z `console.warn`).
- Retry na INSERT zabezpiecza przed pojedynczymi network glitchami na komórce.

## Czego NIE robię

- Nie zmieniam logiki wyboru szablonu, czcionek, renderowania PDF.
- Nie zmieniam polityki „jednorazowego" generowania ani `forceRegenerate`.
- Nie zmieniam UI „Wygeneruj/Regeneruj certyfikat".
