
Cel: naprawić realny błąd „Udostępnij” na mobile, tak aby po kliknięciu kopiowała się pełna wiadomość z OTP (nie tylko kod i nie fallbackowy komunikat).

1) Co dokładnie jest zepsute (rephrase)
- Użytkownik klika „Udostępnij / Generuj kod i kopiuj”, kod się tworzy, ale clipboard na telefonie nie dostaje pełnej wiadomości.
- Widać toast o ręcznym kopiowaniu, czyli automatyczne kopiowanie wypada z kontekstu gestu użytkownika.

2) Diagnoza (root cause)
- `src/lib/clipboardUtils.ts` (`copyAfterAsync`) ma błąd kolejności: najpierw `await textPromise`, a dopiero potem `navigator.clipboard.write(...)`. To niweluje mechanizm Safari „transient activation”.
- `src/pages/HealthyKnowledge.tsx` (`handleGenerateAndCopy`) robi `await supabase.auth.getSession()` przed `copyAfterAsync`, co również zrywa kontekst kliknięcia.
- `handleManualCopy` preferuje `navigator.share()` mimo etykiety „Kopiuj wiadomość”, co może wyglądać jak „nie kopiuje”.
- Do I know what the issue is? Tak.

3) Plan zmian (implementacja)
- `src/lib/clipboardUtils.ts`
  - Przepisać `copyAfterAsync`, aby:
    - uruchamiać `asyncFn()` tylko raz,
    - tworzyć `ClipboardItem` z Promise,
    - wywołać `navigator.clipboard.write([item])` natychmiast (bez wcześniejszego await na treści),
    - dopiero potem awaitować wynik i zwracać `{ success, text }`,
    - usunąć podwójne wywołanie `asyncFn` w fallbacku (żeby nie generować 2 kodów OTP przy jednym kliknięciu).
- `src/pages/HealthyKnowledge.tsx`
  - Usunąć pre-check `await supabase.auth.getSession()` z `handleGenerateAndCopy` (auth i tak waliduje edge function).
  - Zachować dialog otwarty przy niepowodzeniu i pokazywać `generatedMessage` + przycisk ręczny.
  - W `handleManualCopy` zmienić kolejność: najpierw `copyToClipboard(generatedMessage)`, a `navigator.share` tylko jako dodatkowy fallback/opcja (nie jako domyślna akcja „Kopiuj”).
  - Ujednolicić komunikat toasta na „skopiuj ręcznie przyciskiem poniżej” (bez „z pola poniżej”, jeśli to mylące).

4) Weryfikacja po wdrożeniu (E2E)
- iPhone Safari + Android Chrome:
  - klik „Generuj kod i kopiuj” → wklejenie do Notatek/WhatsApp zawiera pełną wiadomość (link + `ZW-XXXXXX`),
  - brak fałszywego fallback toast przy poprawnym kopiowaniu.
- Fallback:
  - gdy auto-copy zablokowane, dialog zostaje otwarty i „Kopiuj wiadomość” faktycznie kopiuje do schowka.
- Regresja:
  - sprawdzić, że jedno kliknięcie generuje jeden kod OTP (brak podwójnych insertów po stronie klienta flow).
