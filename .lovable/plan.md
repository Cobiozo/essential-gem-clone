

# Dodanie uprawnienia "Moja strona" do CMS + instrukcja Fazy 6

## Co zostanie zrobione w kodzie

Jedyna zmiana: dodanie `can_customize_landing_page` do panelu zarządzania uprawnieniami liderów (`LeaderPanelManagement.tsx`), aby administratorzy mogli włączać/wyłączać to uprawnienie z poziomu CMS.

### Zmiany w `src/components/admin/LeaderPanelManagement.tsx`:

1. **Import ikony** `Globe` z lucide-react (reprezentuje "stronę www")
2. **Dodanie do interfejsu `PartnerLeaderData`**: pole `can_customize_landing_page: boolean`
3. **Dodanie do `LEADER_PERM_FIELDS`**: `'can_customize_landing_page'`
4. **Dodanie do `columns`**: `{ key: 'can_customize_landing_page', label: 'Moja strona', icon: Globe, type: 'leader', group: 'Treść' }`
5. **Mapowanie w `loadData`**: odczyt pola z `leader_permissions`

Nie są potrzebne żadne zmiany w bazie danych — kolumna `can_customize_landing_page` już istnieje w tabeli `leader_permissions`, a hook `useLeaderPermissions` już ją obsługuje.

---

## Instrukcja manualna — Faza 6 (infrastruktura)

Te kroki muszą być wykonane ręcznie na serwerze Cyberfolks:

### 1. Wildcard DNS
W panelu Cyberfolks, w ustawieniach DNS dla domeny `purelife.info.pl`, dodaj rekord:

```text
Typ: A
Nazwa: *
Wartość: [IP serwera Cyberfolks]
TTL: 3600
```

To sprawi, że każda subdomena (np. `ABC123.purelife.info.pl`) będzie kierowana na ten sam serwer.

### 2. Wildcard SSL (Let's Encrypt)
Na serwerze zainstaluj certbot z pluginem DNS (np. `certbot-dns-cloudflare` lub ręczny DNS-01 challenge):

```text
certbot certonly --manual --preferred-challenges dns -d "*.purelife.info.pl" -d "purelife.info.pl"
```

Certbot poprosi o dodanie rekordu TXT `_acme-challenge.purelife.info.pl`. Po weryfikacji certyfikat wildcard zostanie wystawiony. Skonfiguruj go w Express/nginx.

### 3. Nadanie uprawnień liderom
Po wdrożeniu zmian z tego planu, administratorzy będą mogli włączać uprawnienie "Moja strona" bezpośrednio z CMS (zakładka "Panel Lidera"), tak samo jak pozostałe uprawnienia — przełącznikiem Switch przy danym partnerze.

