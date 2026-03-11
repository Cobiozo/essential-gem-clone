

# Fix: Udostępnianie na mobile — użycie `copyAfterAsync`

## Problem

Na mobile (iOS Safari) kopiowanie nie działa, bo `handleGenerateAndCopy` w `HealthyKnowledge.tsx` najpierw wywołuje async edge function (`generate-hk-otp`), a dopiero potem próbuje `copyToClipboard`. Do tego momentu kontekst gestu użytkownika jest utracony i Safari blokuje zapis do schowka.

Widget `InfoLinksWidget` działa poprawnie, bo używa `copyAfterAsync` — który rejestruje `ClipboardItem` synchronicznie w kontekście gestu, a treść rozwiązuje asynchronicznie.

## Rozwiązanie

**Plik:** `src/pages/HealthyKnowledge.tsx`, funkcja `handleGenerateAndCopy` (~linie 116-153)

Zamienić obecne podejście (async call → copyToClipboard) na `copyAfterAsync`, identycznie jak w `InfoLinksWidget`:

```typescript
const handleGenerateAndCopy = async () => {
  if (!selectedMaterial) return;
  setGenerating(true);
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast.error(tf('common.mustBeLoggedIn', 'Musisz być zalogowany'));
      return;
    }

    const { copyAfterAsync } = await import('@/lib/clipboardUtils');
    let otpCode = '';
    
    const { success } = await copyAfterAsync(async () => {
      const response = await supabase.functions.invoke('generate-hk-otp', {
        body: { knowledge_id: selectedMaterial.id },
      });
      if (response.error) throw new Error(response.error.message);
      otpCode = response.data.otp_code;
      return response.data.clipboard_message as string;
    });

    if (success) {
      toast.success(`Kod ${otpCode} wygenerowany i skopiowany do schowka!`);
    } else {
      toast.error('Nie udało się skopiować. Spróbuj ponownie.');
    }
    setShareDialogOpen(false);
    window.dispatchEvent(new CustomEvent('hkOtpCodeGenerated'));
  } catch (error: any) {
    toast.error(error.message || 'Nie udało się wygenerować kodu');
  } finally {
    setGenerating(false);
  }
};
```

Kluczowa zmiana: `copyAfterAsync` rejestruje zapis do schowka synchronicznie w momencie kliknięcia, a treść (OTP + wiadomość) pobierana jest asynchronicznie. Działa identycznie na desktop i mobile.

