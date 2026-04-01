

# Fix: Widżet auto-webinar nie pojawia się mimo nadanego dostępu

## Problem

W `WebinarInviteWidget.tsx` linia 314:
```typescript
if (!user?.id || !isPartner) { setHasAutoWebinarAccess(false); return; }
```

Sprawdzenie dostępu ogranicza się **wyłącznie do partnerów** (`isPartner`). Jeśli użytkownik ma rolę **specjalista** — warunek `!isPartner` jest `true`, więc `hasAutoWebinarAccess` jest ustawiane na `false` i widżet się nie renderuje, mimo że admin włączył mu dostęp w `leader_permissions`.

## Rozwiązanie

Zmienić warunek na linii 314, aby uwzględnić obie role (partner i specjalista):

```typescript
if (!user?.id || (!isPartner && !isSpecjalista)) { setHasAutoWebinarAccess(false); return; }
```

Jedna linia w jednym pliku: `src/components/dashboard/widgets/WebinarInviteWidget.tsx`.

