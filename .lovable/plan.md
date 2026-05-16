
# Audyt: wycieki i obciążenie pamięci

Wynik skanu kodu (`src/`): 44 `setInterval`, 51 plików z `addEventListener`, 26 plików z realtime `channel`, 38 wywołań `createObjectURL` vs tylko 30 `revokeObjectURL`, 64 plików z `console.log`, ~21 plików > 1000 linii.

## A. Wycieki bezpośrednie (do naprawy — wysoki priorytet)

### A1. Blob URL bez `revokeObjectURL`
Pliki, które tworzą `URL.createObjectURL` ale nigdy nie zwalniają — przy długich sesjach (CMS, panel admina) blob trzyma cały plik w RAM aż do reloadu:

- `src/components/ai-compass/AiCompassWidget.tsx:647` (export PDF)
- `src/components/admin/CertificateEditor.tsx:852` (podgląd PDF)
- `src/components/admin/AiCompassManagement.tsx:287` (export)
- `src/components/admin/EventRegistrationsManagement.tsx:427,468` (CSV download — `link.href = createObjectURL(...)` nigdy nierewokowane)
- `src/components/partner-page/ImageUploadInput.tsx:213` (preview)
- `src/components/admin/KnowledgeResourcesManagement.tsx:780` (`src={URL.createObjectURL(file)}` w renderze — wycieka przy każdym re-renderze!)
- `src/components/admin/TranslationsManagement.tsx:971` (jeden z trzech bez revoke)
- `src/hooks/useImageCompressionWorker.ts:119` (`img.src = createObjectURL(file)` — brak revoke po `onload`)
- `src/components/MediaUpload.tsx:132` (jedna z 3 ścieżek)

**Fix:** dodać `URL.revokeObjectURL(url)` po użyciu (po `a.click()` + `setTimeout 4000` jak w `useCertificateGeneration.ts`), a w komponentach React — `useEffect` cleanup. W `KnowledgeResourcesManagement` przenieść tworzenie URL do `useMemo` z `revoke` w cleanupie.

### A2. `useImageCompressionWorker` — brak `worker.terminate()`
Nowy Worker tworzony per użycie (`new Worker(...)` w pętli przetwarzania) bez `terminate()` w cleanupie hooka. Każdy upload zostawia żywego workera w pamięci. **Fix:** `useEffect` z `return () => worker.terminate()`.

### A3. SecureMedia — listenery na video
`src/components/SecureMedia.tsx` (2323 linii, 25 `useEffect`, 6 `setInterval`) — dodaje 11 listenerów do `<video>` w jednym efekcie + listenery `online/offline/connection.change`. Przegląd potwierdza obecność cleanupów, ale efekt zależy od `video` ref, który zmienia się przy każdym remount — przy szybkim przełączaniu odcinków HK/Training może gromadzić listenery. **Fix:** przegląd zależności `useEffect` + jednorazowy `urlRefreshTimerRef.current` zmieniany w `else` zamiast tworzony co `useEffect`.

### A4. PeerJS w `VideoRoom` — heartbeat + freeze-check + ankieta TURN
`src/components/meeting/VideoRoom.tsx` (2673 linii, 8 intervali co 1–30 s). Potwierdzić, że wszystkie 8 `setInterval` (linie 162, 344, 356, 938 + 4 inne) mają `clearInterval` w returnie `useEffect`. Sprawdzić, czy `peer.destroy()` jest wywoływane przy unmount i czy `MediaStream` tracki są `stop()`-owane (wspomniane w memory `lobby-and-media-governance`, ale warto re-verify).

### A5. `VideoBackgroundProcessor` — selfie segmenter
`backgroundIntervalId = setInterval(...)` (linia 860) + Web Worker MediaPipe. Przy wielokrotnym wejściu/wyjściu z meeting room bez `destroy()` zostawia GPU buffers. **Fix:** wymusić `processor.destroy()` w cleanupie `useVideoBackground` i potwierdzić, że `segmenter.close()` jest wołany.

### A6. Realtime kanały Supabase
26 plików tworzy `.channel(...)`, ale tylko 42 `removeChannel/unsubscribe` na wszystkie. Pliki do weryfikacji pod kątem cleanup:
- `src/hooks/useUnifiedChat.ts`, `usePrivateChat.ts`, `useRoleChat.ts`, `useAdminConversations.ts`, `useAutoWebinarFakeChat.ts`, `useAdminPresence.ts`, `useNotifications.ts`, `useMeetingRoomStatus.ts`, `useLeaderBlocks.ts`, `useOrganizationTree.ts`, `usePublicEvents.ts`, `useEvents.ts`
- Komponenty admina: `SystemHealthAlertsPanel`, `TrainingManagement`, `EventRegistrationsManagement` (długo otwarte zakładki — krytyczne)

**Fix:** każdy `supabase.channel(...).subscribe()` musi mieć `return () => supabase.removeChannel(channel)`.

## B. Obciążenie pamięci (średni priorytet)

### B1. React Query cache nieograniczony
`src/App.tsx:153` — brak `gcTime` (domyślnie 5 min OK, ale przy `staleTime: 5min` i częstych invalidacjach Admina cache rośnie). Dodać `gcTime: 10 * 60 * 1000` i selektywne `queryClient.removeQueries` przy nawigacji z Admin.

### B2. Pliki "boże" (god components)
- `pages/Admin.tsx` — **5415 linii**, jeden komponent ładuje cały panel admina (jeśli nie jest lazy-routed w środku, RAM bije rekordy).
- `TrainingManagement.tsx` (3018), `VideoRoom.tsx` (2673), `SecureMedia.tsx` (2323), `LivePreviewEditor.tsx` (2326), `AutoWebinarManagement.tsx` (1871), `RichTextEditor.tsx` (1820).

**Fix:** podzielić Admin.tsx na sub-route'y z `lazyWithRetry` (jest już użyte na poziomie routera, ale pod-zakładki Admina nie są lazy). Każda zakładka jako oddzielny `lazy()` zmniejszy initial heap o ~10–20 MB.

### B3. 64 plików z `console.log` w produkcji
Wycieka string referencje + utrzymuje closures w DevTools. **Fix:** strip w `vite.config.ts` (`esbuild: { drop: ['console', 'debugger'] }` poza DEV).

### B4. `pages/HtmlPage.tsx:121` — `setInterval` na init Lucide (co 50 ms?)
Sprawdzić warunek wyjścia — jeśli skrypt Lucide nigdy się nie załaduje, interval kręci się w nieskończoność.

### B5. Tracking listenerów w `useActivityTracking` / `useInactivityTimeout`
3 niezależne intervale (76, 128, 208) + listenery mousemove/keydown/touch — potwierdzić deduplikację, żeby przy każdym remount nie dokładać kolejnych.

## C. Quick wins (kosmetyka)

- Dodać w `vite.config.ts`: `build.rollupOptions.output.manualChunks` dla `recharts`, `jspdf`, `html2canvas`, `peerjs`, `@mediapipe/*` — dziś prawdopodobnie ładowane synchronicznie z głównym bundlem.
- `jspdf` + `html2canvas` użyć przez `import()` dynamiczny tylko w miejscu eksportu PDF (zaoszczędzi ~600 KB gz na initial).
- `WelcomeWidget` — interval co 1 s aktualizujący zegar; ustawić alignment do następnej minuty zamiast tickowania co sekundę (jeśli pokazuje HH:MM).

## D. Plan działania (proponowane fazy, do akceptacji)

```text
Faza 1 (krytyczne wycieki, ~niska zmiana ryzyka)
  1. Dodać revokeObjectURL we wszystkich miejscach z A1 (9 plików)
  2. terminate() w useImageCompressionWorker (A2)
  3. Audyt cleanup w 12 hookach realtime (A6)
  4. destroy() w VideoBackgroundProcessor + useVideoBackground (A5)

Faza 2 (heap / bundle)
  5. Drop console w prod (vite.config.ts)
  6. manualChunks + dynamiczny import jspdf/html2canvas (C)
  7. gcTime w QueryClient (B1)

Faza 3 (głębsza refaktoryzacja, większy zakres)
  8. Rozbić Admin.tsx na lazy sub-route'y (B2)
  9. Weryfikacja wszystkich 44 intervali pod kątem clear (A3, A4, B4)
  10. Refaktor SecureMedia – wyodrębnić sub-hooki na grupy listenerów
```

## Co dalej

Po akceptacji wykonam Fazę 1 jako jeden zestaw zmian (~10 plików, bez zmian DB/edge), potwierdzę console clean i przejdę do Fazy 2. Faza 3 wymaga osobnego planu.
