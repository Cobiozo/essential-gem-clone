

## Plan: Upgrade ExpressTURN do Premium z failoverem serwerów

### Problem
Obecna konfiguracja używa jednego serwera relay1 z HMAC credentials. Trzeba przejść na Premium z pełną listą 20+ serwerów i dodać automatyczne wykrywanie niedostępnych serwerów.

### Bezpieczeństwo — sekrety
Dane logowania (USERNAME, PASSWORD, SECRET KEY) **nie mogą być hardkodowane** w kodzie. Zostaną zapisane jako sekrety Supabase:
- `EXPRESSTURN_USERNAME` = `000000002087995940`
- `EXPRESSTURN_PASSWORD` = `Xcp6fcr0VYtodHIrOVrr/yOWs8E=`
- `EXPRESSTURN_SECRET` (już istnieje) — zaktualizować na `91e9981d556aa32d5cdb5c2b1f282853`

### Zmiany

**1. Edge Function `get-turn-credentials/index.ts` — pełna przebudowa**

Zamiast generowania HMAC credentials, zwracać statyczne dane logowania z sekretów + pełną listę serwerów TURN w wielu grupach:

```text
Serwery TURN (port 3478, UDP+TCP):
  relay1-19.expressturn.com:3478
  global.expressturn.com:3478

Serwery TURN (port 80, TCP — firewall-friendly):
  relay1.expressturn.com:80

Serwery TURNS (port 443, TLS — most firewall-friendly):
  relay1.expressturn.com:443
```

Każda grupa serwerów będzie zwrócona jako osobny wpis `iceServers` z tymi samymi credentials, co pozwala przeglądarce testować je niezależnie.

Zachowanie HMAC jako fallback — jeśli `EXPRESSTURN_USERNAME` nie jest ustawiony, użyj starego mechanizmu HMAC z SECRET KEY.

**2. Klient `VideoRoom.tsx` — health check i failover**

Dodać funkcję `testTurnServers()` wywoływaną po otrzymaniu `iceServers` z edge function. Mechanizm:
- Dla każdego serwera TURN tworzy mini `RTCPeerConnection` z pojedynczym serwerem
- Nasłuchuje na event `icegatheringstatechange` — jeśli wygeneruje kandydata `relay` w ciągu 3s, serwer jest dostępny
- Filtruje niedostępne serwery i przekazuje do PeerJS tylko działające
- Jeśli żaden TURN nie działa — fallback na STUN only z ostrzeżeniem w konsoli

**3. Struktura odpowiedzi edge function**

```json
{
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" },
    { "urls": "stun:stun1.l.google.com:19302" },
    {
      "urls": [
        "turn:relay1.expressturn.com:3478",
        "turn:relay2.expressturn.com:3478",
        "turn:relay3.expressturn.com:3478",
        "turn:relay4.expressturn.com:3478",
        "turn:relay5.expressturn.com:3478",
        "turn:global.expressturn.com:3478"
      ],
      "username": "000000002087995940",
      "credential": "<from-secret>"
    },
    {
      "urls": [
        "turn:relay1.expressturn.com:80",
        "turn:relay1.expressturn.com:80?transport=tcp"
      ],
      "username": "...",
      "credential": "..."
    },
    {
      "urls": [
        "turns:relay1.expressturn.com:443?transport=tcp"
      ],
      "username": "...",
      "credential": "..."
    }
  ]
}
```

### Zakres plików
- `supabase/functions/get-turn-credentials/index.ts` — przebudowa na premium credentials + pełna lista serwerów
- `src/components/meeting/VideoRoom.tsx` — dodanie health check / failover logic
- Sekrety Supabase: dodanie `EXPRESSTURN_USERNAME`, `EXPRESSTURN_PASSWORD`, aktualizacja `EXPRESSTURN_SECRET`

