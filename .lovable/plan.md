

# Plan: Zakładki Webinary — Business Opportunity + Health Conversation

## Co się zmieni

Strona `WebinarsPage` będzie miała 3 zakładki:
1. **Webinary** — lista standardowych webinarów (jak dotychczas)
2. **Business Opportunity** — auto-webinar kategorii `business_opportunity`
3. **Health Conversation** — auto-webinar kategorii `health_conversation`

Każda zakładka auto-webinaru wyświetla się tylko jeśli dana kategoria jest włączona i widoczna dla roli użytkownika.

## Zmiany techniczne

### Plik: `src/pages/WebinarsPage.tsx`

- Pobrać konfigurację **obu** kategorii: `useAutoWebinarConfig('business_opportunity')` i `useAutoWebinarConfig('health_conversation')`
- Osobno obliczyć `hasBoAccess` i `hasHcAccess` na podstawie roli i flag widoczności
- Jeśli żadna nie jest dostępna — renderować listę webinarów bez tabów (jak dotychczas)
- Jeśli co najmniej jedna dostępna — renderować Tabs z:
  - Tab "Webinary" → lista standardowych webinarów
  - Tab "Business Opportunity" (jeśli `hasBoAccess`) → `<AutoWebinarEventView category="business_opportunity" />`
  - Tab "Health Conversation" (jeśli `hasHcAccess`) → `<AutoWebinarEventView category="health_conversation" />`
- Usunąć stary tekst `config?.room_title || 'Webinary Biznesowe 24h/live'` z nazwy taba — zastąpić stałymi nazwami "Business Opportunity" i "Health Conversation"

