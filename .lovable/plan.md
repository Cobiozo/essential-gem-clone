
# Plan: Panel administracyjny Push Notifications z generowaniem kluczy VAPID

## Przegląd rozwiązania

Twój plan jest znacznie lepszy od poprzedniego - daje pełną kontrolę administratorowi bez konieczności dostępu do panelu Supabase. System będzie:
- Generować klucze VAPID bezpiecznie w Edge Function
- Przechowywać konfigurację w bazie danych (nie jako sekrety zewnętrzne)
- Zarządzać ikonami, tekstami i statystykami z poziomu UI
- Obsługiwać wiele przeglądarek (Brave, Opera, Edge, Chrome, Safari, Firefox)

---

## Architektura systemu

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                     PANEL ADMINISTRACYJNY PUSH NOTIFICATIONS                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                        ZAKŁADKA: PUSH (Bell icon)                       ││
│  ├─────────────────────────────────────────────────────────────────────────┤│
│  │  [Konfiguracja VAPID] [Statystyki] [Szablony] [Ikony] [Przeglądarka]    ││
│  │                                                                         ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  ││
│  │  │ VAPID Public    │  │ Aktywne sub.    │  │ Domyślny tytuł         │  ││
│  │  │ Key: BE3Z...    │  │ 127 urządzeń    │  │ [Pure Life Center    ] │  ││
│  │  │ [Kopiuj] [Regen]│  │ ───────────────-│  │                        │  ││
│  │  │                 │  │ Chrome: 45%     │  │ Domyślna treść         │  ││
│  │  │ VAPID Private   │  │ Safari: 30%     │  │ [Masz nową wiadom... ] │  ││
│  │  │ Key: ****       │  │ Firefox: 15%    │  │                        │  ││
│  │  │ [Pokaż] [Kopiuj]│  │ Edge: 10%       │  │ [Zapisz szablony]      │  ││
│  │  │                 │  │                 │  │                        │  ││
│  │  │ Subject (email) │  │ PWA installs:   │  └─────────────────────────┘  ││
│  │  │ [mailto:cont...]│  │ iOS: 23         │                               ││
│  │  │                 │  │ Android: 45     │  ┌─────────────────────────┐  ││
│  │  │ Status: ✓ Aktyw.│  │                 │  │ Ikony powiadomień      │  ││
│  │  └─────────────────┘  └─────────────────┘  │ [192x192] [512x512]    │  ││
│  │                                            │ [Prześlij] [Podgląd]   │  ││
│  │                                            └─────────────────────────┘  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Faza 1: Baza danych

### 1.1 Nowa tabela konfiguracji VAPID

```sql
CREATE TABLE public.push_notification_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Klucze VAPID (przechowywane w bazie, nie jako zewnętrzne sekrety)
  vapid_public_key text,
  vapid_private_key text,
  vapid_subject text DEFAULT 'mailto:support@purelife.info.pl',
  
  -- Status
  is_enabled boolean DEFAULT false,
  keys_generated_at timestamptz,
  
  -- Ikony (URL do storage)
  icon_192_url text,
  icon_512_url text,
  badge_icon_url text,
  
  -- Domyślne teksty powiadomień
  default_title text DEFAULT 'Pure Life Center',
  default_body text DEFAULT 'Masz nową wiadomość',
  
  -- Tłumaczenia (JSONB)
  translations jsonb DEFAULT '{"pl": {"title": "Pure Life Center", "body": "Masz nową wiadomość"}, "en": {"title": "Pure Life Center", "body": "You have a new message"}}',
  
  -- Timestampy
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Singleton - tylko jeden rekord
  CONSTRAINT single_config CHECK (id = '00000000-0000-0000-0000-000000000001')
);

-- Wstaw domyślny rekord
INSERT INTO public.push_notification_config (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- RLS: tylko admin może zarządzać
ALTER TABLE public.push_notification_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage push config"
  ON public.push_notification_config
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );
```

### 1.2 Tabela subskrypcji push (rozszerzona)

```sql
CREATE TABLE public.user_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Dane subskrypcji Web Push
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  
  -- Metadane urządzenia (rozszerzone)
  device_type text DEFAULT 'unknown',
  browser text,
  browser_version text,
  os text,
  os_version text,
  device_name text,
  is_pwa boolean DEFAULT false,
  
  -- Timestampy
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz DEFAULT now(),
  last_success_at timestamptz,
  failure_count integer DEFAULT 0,
  
  -- Unikalność
  UNIQUE(user_id, endpoint)
);

-- RLS
ALTER TABLE public.user_push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.user_push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
  ON public.user_push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON public.user_push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
  ON public.user_push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Indeksy
CREATE INDEX idx_push_subs_user ON public.user_push_subscriptions(user_id);
CREATE INDEX idx_push_subs_browser ON public.user_push_subscriptions(browser);
CREATE INDEX idx_push_subs_created ON public.user_push_subscriptions(created_at DESC);
```

### 1.3 Tabela logów wysyłki push

```sql
CREATE TABLE public.push_notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid REFERENCES public.user_push_subscriptions(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Treść
  title text NOT NULL,
  body text,
  url text,
  tag text,
  
  -- Status
  status text NOT NULL, -- 'sent', 'failed', 'expired'
  error_message text,
  http_status integer,
  
  -- Metadane
  browser text,
  device_type text,
  
  -- Timestampy
  created_at timestamptz DEFAULT now()
);

-- RLS: tylko admin może przeglądać logi
ALTER TABLE public.push_notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view push logs"
  ON public.push_notification_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );

-- Indeks dla statystyk
CREATE INDEX idx_push_logs_created ON public.push_notification_logs(created_at DESC);
CREATE INDEX idx_push_logs_status ON public.push_notification_logs(status);
```

---

## Faza 2: Edge Functions

### 2.1 Generowanie kluczy VAPID (`generate-vapid-keys`)

Nowa Edge Function do bezpiecznego generowania kluczy VAPID:

```typescript
// supabase/functions/generate-vapid-keys/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Autoryzacja - tylko admin
    const authHeader = req.headers.get("Authorization");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader! } } }
    );
    
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { 
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Sprawdź czy admin
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
      
    if (!roles) {
      return new Response(JSON.stringify({ error: "Admin access required" }), { 
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Generuj klucze VAPID
    const vapidKeys = webpush.generateVAPIDKeys();
    
    const { subject } = await req.json().catch(() => ({}));

    // Zapisz do bazy
    const { error: updateError } = await supabase
      .from("push_notification_config")
      .update({
        vapid_public_key: vapidKeys.publicKey,
        vapid_private_key: vapidKeys.privateKey,
        vapid_subject: subject || "mailto:support@purelife.info.pl",
        keys_generated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", "00000000-0000-0000-0000-000000000001");

    if (updateError) throw updateError;

    console.log("[generate-vapid-keys] New VAPID keys generated");

    return new Response(
      JSON.stringify({ 
        success: true, 
        publicKey: vapidKeys.publicKey,
        // Nie zwracaj klucza prywatnego w odpowiedzi!
        generatedAt: new Date().toISOString()
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("[generate-vapid-keys] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

### 2.2 Wysyłka push (ulepszona `send-push-notification`)

```typescript
// supabase/functions/send-push-notification/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// ... (pełna implementacja z obsługą kluczy z bazy danych)
// Pobiera klucze VAPID z tabeli push_notification_config
// Wysyła do wszystkich urządzeń użytkownika
// Loguje wyniki do push_notification_logs
// Obsługuje expired subscriptions (410 Gone)
```

### 2.3 Pobieranie klucza publicznego (`get-vapid-public-key`)

Endpoint publiczny (bez auth) do pobierania klucza publicznego przez klienta:

```typescript
// supabase/functions/get-vapid-public-key/index.ts
serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data, error } = await supabase
    .from("push_notification_config")
    .select("vapid_public_key, is_enabled, icon_192_url, default_title")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .single();

  if (error || !data?.is_enabled) {
    return new Response(JSON.stringify({ enabled: false }), { ... });
  }

  return new Response(JSON.stringify({
    enabled: true,
    publicKey: data.vapid_public_key,
    icon: data.icon_192_url,
    defaultTitle: data.default_title
  }), { ... });
});
```

---

## Faza 3: Komponenty UI

### 3.1 Nowa zakładka w AdminSidebar

Dodanie do kategorii "Komunikacja":

```typescript
// W AdminSidebar.tsx - kategoria communication
{
  id: 'communication',
  labelKey: 'communication',
  icon: Mail,
  items: [
    // ... istniejące
    { value: 'push-notifications', labelKey: 'pushNotifications', icon: Bell },
  ],
},

// W hardcodedLabels:
pushNotifications: 'Powiadomienia Push',
```

### 3.2 Główny komponent `PushNotificationsManagement.tsx`

Nowy komponent z zakładkami:

```typescript
// src/components/admin/PushNotificationsManagement.tsx

export const PushNotificationsManagement = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="w-6 h-6" />
            Powiadomienia Push
          </h2>
          <p className="text-muted-foreground">
            Konfiguracja Web Push dla przeglądarek i PWA
          </p>
        </div>
        <StatusBadge isEnabled={config?.is_enabled} />
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">
            <Key className="w-4 h-4 mr-2" />
            Konfiguracja VAPID
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="w-4 h-4 mr-2" />
            Statystyki
          </TabsTrigger>
          <TabsTrigger value="templates">
            <FileText className="w-4 h-4 mr-2" />
            Szablony
          </TabsTrigger>
          <TabsTrigger value="icons">
            <Image className="w-4 h-4 mr-2" />
            Ikony
          </TabsTrigger>
          <TabsTrigger value="browsers">
            <Globe className="w-4 h-4 mr-2" />
            Przeglądarki
          </TabsTrigger>
        </TabsList>

        <TabsContent value="config">
          <VapidConfigPanel />
        </TabsContent>
        
        <TabsContent value="stats">
          <SubscriptionStatsPanel />
        </TabsContent>
        
        <TabsContent value="templates">
          <NotificationTemplatesPanel />
        </TabsContent>
        
        <TabsContent value="icons">
          <IconsManagementPanel />
        </TabsContent>
        
        <TabsContent value="browsers">
          <BrowserSupportPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
```

### 3.3 Panel konfiguracji VAPID

```typescript
const VapidConfigPanel = () => {
  const [config, setConfig] = useState(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [generating, setGenerating] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Klucze VAPID
        </CardTitle>
        <CardDescription>
          Klucze autoryzacyjne dla Web Push API
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Switch 
              checked={config?.is_enabled} 
              onCheckedChange={toggleEnabled}
            />
            <Label>Powiadomienia Push aktywne</Label>
          </div>
          {config?.keys_generated_at && (
            <span className="text-sm text-muted-foreground">
              Klucze wygenerowane: {format(new Date(config.keys_generated_at), 'PPpp', { locale: pl })}
            </span>
          )}
        </div>

        <Separator />

        {/* Public Key */}
        <div className="space-y-2">
          <Label>Klucz publiczny (VAPID Public Key)</Label>
          <div className="flex gap-2">
            <Input 
              value={config?.vapid_public_key || 'Brak klucza'} 
              readOnly 
              className="font-mono text-xs"
            />
            <Button variant="outline" size="icon" onClick={copyPublicKey}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Private Key (ukryty) */}
        <div className="space-y-2">
          <Label>Klucz prywatny (VAPID Private Key)</Label>
          <div className="flex gap-2">
            <Input 
              type={showPrivateKey ? "text" : "password"}
              value={config?.vapid_private_key || ''} 
              readOnly 
              className="font-mono text-xs"
            />
            <Button variant="outline" size="icon" onClick={() => setShowPrivateKey(!showPrivateKey)}>
              {showPrivateKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-xs text-destructive">
            Nigdy nie udostępniaj klucza prywatnego!
          </p>
        </div>

        {/* Subject (email) */}
        <div className="space-y-2">
          <Label>Adres kontaktowy (Subject)</Label>
          <Input 
            value={config?.vapid_subject || ''} 
            onChange={(e) => updateSubject(e.target.value)}
            placeholder="mailto:support@example.com"
          />
        </div>

        <Separator />

        {/* Generowanie kluczy */}
        <div className="flex gap-2">
          <Button 
            onClick={generateNewKeys} 
            disabled={generating}
            variant={config?.vapid_public_key ? "outline" : "default"}
          >
            {generating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            {config?.vapid_public_key ? 'Wygeneruj nowe klucze' : 'Wygeneruj klucze VAPID'}
          </Button>
          
          {config?.vapid_public_key && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Usuń klucze
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usunąć klucze VAPID?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Wszystkie aktywne subskrypcje przestaną działać. Użytkownicy będą musieli ponownie włączyć powiadomienia.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteKeys}>
                    Usuń klucze
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

### 3.4 Panel statystyk subskrypcji

```typescript
const SubscriptionStatsPanel = () => {
  const { data: stats } = useQuery({
    queryKey: ['push-subscription-stats'],
    queryFn: fetchSubscriptionStats
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Łączna liczba subskrypcji */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Aktywne subskrypcje</CardTitle>
          <Users className="w-4 h-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total || 0}</div>
          <p className="text-xs text-muted-foreground">
            na {stats?.uniqueUsers || 0} użytkowników
          </p>
        </CardContent>
      </Card>

      {/* Podział wg przeglądarek */}
      <Card className="col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Przeglądarki</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stats?.browsers?.map(b => (
              <div key={b.name} className="flex items-center gap-2">
                <BrowserIcon name={b.name} />
                <span className="flex-1">{b.name}</span>
                <Badge variant="secondary">{b.count}</Badge>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {b.percentage}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* PWA vs Browser */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Typ instalacji</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>PWA (zainstalowane)</span>
              <Badge>{stats?.pwa || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Przeglądarka</span>
              <Badge variant="outline">{stats?.browser || 0}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wykres ostatnich 7 dni */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Nowe subskrypcje (ostatnie 7 dni)</CardTitle>
        </CardHeader>
        <CardContent className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={stats?.dailyStats}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="count" fill="hsl(var(--primary))" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
```

### 3.5 Panel zarządzania ikonami

```typescript
const IconsManagementPanel = () => {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Domyślne ikony z public/icons */}
      <Card>
        <CardHeader>
          <CardTitle>Ikony systemowe</CardTitle>
          <CardDescription>
            Domyślne ikony w folderze public/icons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            {defaultIcons.map(icon => (
              <div 
                key={icon.name}
                className={cn(
                  "border rounded-lg p-4 cursor-pointer hover:bg-muted/50",
                  selectedIcon === icon.name && "border-primary"
                )}
                onClick={() => selectIcon(icon.name)}
              >
                <img src={icon.url} alt={icon.name} className="w-12 h-12 mx-auto" />
                <p className="text-xs text-center mt-2">{icon.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Własne ikony */}
      <Card>
        <CardHeader>
          <CardTitle>Własne ikony</CardTitle>
          <CardDescription>
            Prześlij własne ikony dla powiadomień
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 192x192 */}
          <div className="space-y-2">
            <Label>Ikona 192x192 (wymagana)</Label>
            <div className="flex gap-2 items-center">
              {config?.icon_192_url ? (
                <img src={config.icon_192_url} alt="Icon 192" className="w-12 h-12 rounded" />
              ) : (
                <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                </div>
              )}
              <MediaUpload
                onUpload={(url) => updateIcon('icon_192_url', url)}
                accept="image/png"
                bucket="cms-images"
              />
            </div>
          </div>

          {/* 512x512 */}
          <div className="space-y-2">
            <Label>Ikona 512x512 (opcjonalna)</Label>
            <div className="flex gap-2 items-center">
              {config?.icon_512_url ? (
                <img src={config.icon_512_url} alt="Icon 512" className="w-16 h-16 rounded" />
              ) : (
                <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
              <MediaUpload
                onUpload={(url) => updateIcon('icon_512_url', url)}
                accept="image/png"
                bucket="cms-images"
              />
            </div>
          </div>

          {/* Badge icon */}
          <div className="space-y-2">
            <Label>Ikona badge (mała, monochromatyczna)</Label>
            <p className="text-xs text-muted-foreground">
              Używana na Androidzie jako mała ikona w pasku powiadomień
            </p>
            <MediaUpload
              onUpload={(url) => updateIcon('badge_icon_url', url)}
              accept="image/png"
              bucket="cms-images"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

### 3.6 Panel wsparcia przeglądarek

```typescript
const BrowserSupportPanel = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Wsparcie przeglądarek</CardTitle>
        <CardDescription>
          Status Web Push API w różnych przeglądarkach
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Przeglądarka</TableHead>
              <TableHead>Desktop</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Uwagi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="flex items-center gap-2">
                <Chrome className="w-5 h-5" /> Chrome
              </TableCell>
              <TableCell><Badge variant="default">✓ Pełne</Badge></TableCell>
              <TableCell><Badge variant="default">✓ Pełne</Badge></TableCell>
              <TableCell>Android 4.4+, Windows, macOS, Linux</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="flex items-center gap-2">
                <Edge className="w-5 h-5" /> Edge
              </TableCell>
              <TableCell><Badge variant="default">✓ Pełne</Badge></TableCell>
              <TableCell><Badge variant="default">✓ Pełne</Badge></TableCell>
              <TableCell>Bazuje na Chromium</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="flex items-center gap-2">
                <Firefox className="w-5 h-5" /> Firefox
              </TableCell>
              <TableCell><Badge variant="default">✓ Pełne</Badge></TableCell>
              <TableCell><Badge variant="default">✓ Pełne</Badge></TableCell>
              <TableCell>Windows, macOS, Linux, Android</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="flex items-center gap-2">
                <Safari className="w-5 h-5" /> Safari
              </TableCell>
              <TableCell><Badge variant="default">✓ Pełne</Badge></TableCell>
              <TableCell><Badge variant="secondary">⚠️ PWA</Badge></TableCell>
              <TableCell>iOS 16.4+ wymaga dodania do ekranu głównego</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="flex items-center gap-2">
                <Brave className="w-5 h-5" /> Brave
              </TableCell>
              <TableCell><Badge variant="default">✓ Pełne</Badge></TableCell>
              <TableCell><Badge variant="default">✓ Pełne</Badge></TableCell>
              <TableCell>Bazuje na Chromium, może blokować trackery</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="flex items-center gap-2">
                <Opera className="w-5 h-5" /> Opera
              </TableCell>
              <TableCell><Badge variant="default">✓ Pełne</Badge></TableCell>
              <TableCell><Badge variant="default">✓ Pełne</Badge></TableCell>
              <TableCell>Bazuje na Chromium</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
```

---

## Faza 4: Hook kliencki (rozszerzony)

### 4.1 Hook `usePushNotifications.ts`

```typescript
// Rozszerzony hook z detekcją przeglądarki i obsługą różnych platform

export const usePushNotifications = () => {
  // Stan subskrypcji
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'default',
    isLoading: true,
    error: null,
    browserInfo: null
  });

  // Detekcja przeglądarki (rozszerzona)
  const detectBrowser = useCallback(() => {
    const ua = navigator.userAgent;
    
    // Kolejność ma znaczenie - Brave/Opera/Edge najpierw (bazują na Chrome)
    if (ua.includes('Brave')) return { name: 'brave', version: getBraveVersion() };
    if (ua.includes('OPR') || ua.includes('Opera')) return { name: 'opera', version: getOperaVersion() };
    if (ua.includes('Edg')) return { name: 'edge', version: getEdgeVersion() };
    if (ua.includes('Firefox')) return { name: 'firefox', version: getFirefoxVersion() };
    if (ua.includes('Safari') && !ua.includes('Chrome')) return { name: 'safari', version: getSafariVersion() };
    if (ua.includes('Chrome')) return { name: 'chrome', version: getChromeVersion() };
    
    return { name: 'unknown', version: null };
  }, []);

  // Sprawdzenie czy PWA
  const isPWA = useCallback(() => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  }, []);

  // Subskrypcja z rozszerzonymi metadanymi
  const subscribe = useCallback(async () => {
    // 1. Pobierz klucz publiczny z Edge Function
    const { data: config } = await supabase.functions.invoke('get-vapid-public-key');
    
    if (!config?.enabled || !config?.publicKey) {
      throw new Error('Push notifications are not configured');
    }

    // 2. Zarejestruj Service Worker
    const registration = await navigator.serviceWorker.register('/sw-push.js');
    
    // 3. Subskrybuj
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(config.publicKey)
    });

    // 4. Zapisz z metadanymi przeglądarki
    const browserInfo = detectBrowser();
    const osInfo = detectOS();
    
    await supabase.from('user_push_subscriptions').upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.toJSON().keys!.p256dh,
      auth: subscription.toJSON().keys!.auth,
      browser: browserInfo.name,
      browser_version: browserInfo.version,
      os: osInfo.name,
      os_version: osInfo.version,
      device_type: /Mobile|Android|iPhone|iPad/.test(ua) ? 'mobile' : 'desktop',
      is_pwa: isPWA()
    });

    return true;
  }, [user, detectBrowser, isPWA]);

  return { ...state, subscribe, unsubscribe, detectBrowser, isPWA };
};
```

---

## Faza 5: PWA i Service Worker

### 5.1 Service Worker (`public/sw-push.js`)

```javascript
// Service Worker z obsługą wielu platform i czyszczeniem powiadomień

self.addEventListener('push', (event) => {
  console.log('[SW] Push received');
  
  let data = { title: 'Pure Life Center', body: 'Nowa wiadomość', url: '/messages' };
  
  try {
    data = event.data?.json() || data;
  } catch (e) {}

  const options = {
    body: data.body,
    icon: data.icon || '/pwa-192.png',
    badge: data.badge || '/favicon.ico',
    tag: data.tag || `msg-${Date.now()}`,
    renotify: true,
    requireInteraction: data.requireInteraction || false,
    timestamp: Date.now(),
    vibrate: [100, 50, 100], // Mobile vibration pattern
    data: {
      url: data.url || '/messages',
      timestamp: Date.now()
    },
    actions: [
      { action: 'open', title: 'Otwórz' },
      { action: 'dismiss', title: 'Zamknij' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Kliknięcie w powiadomienie
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/messages';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        // Szukaj otwartego okna
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin)) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // Otwórz nowe okno
        return clients.openWindow(urlToOpen);
      })
  );
});

// Czyszczenie powiadomień przy aktywacji okna (mobile)
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_NOTIFICATIONS') {
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach(n => n.close());
    });
  }
});
```

### 5.2 Ikony PWA w `public/icons/`

Folder z domyślnymi ikonami:
- `icon-192x192.png`
- `icon-512x512.png`
- `icon-maskable-512x512.png`
- `badge-72x72.png` (monochromatyczna dla Android)

---

## Faza 6: Integracja z istniejącym systemem

### 6.1 Rozszerzenie `NotificationPermissionBanner.tsx`

```typescript
// Rozszerzenie o obsługę push z pobieraniem konfiguracji z bazy
const NotificationPermissionBanner = () => {
  const { isSupported, isSubscribed, subscribe, permission, isPWA, browserInfo } = usePushNotifications();
  const { data: pushConfig } = useQuery({
    queryKey: ['push-config-public'],
    queryFn: async () => {
      const { data } = await supabase.functions.invoke('get-vapid-public-key');
      return data;
    }
  });

  // Nie pokazuj jeśli push wyłączony przez admina
  if (!pushConfig?.enabled) return null;

  // ... reszta logiki
};
```

### 6.2 Czyszczenie powiadomień na mobile

```typescript
// W głównym komponencie aplikacji (App.tsx lub MessagesPage.tsx)
useEffect(() => {
  // Wyczyść powiadomienia gdy użytkownik wchodzi na stronę wiadomości
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage('CLEAR_NOTIFICATIONS');
  }
}, [location.pathname]);
```

---

## Podsumowanie plików

| Plik | Akcja | Opis |
|------|-------|------|
| `supabase/migrations/xxx_push_notification_system.sql` | Utworzenie | Tabele: config, subscriptions, logs |
| `supabase/functions/generate-vapid-keys/index.ts` | Utworzenie | Generowanie kluczy VAPID |
| `supabase/functions/send-push-notification/index.ts` | Utworzenie | Wysyłka powiadomień |
| `supabase/functions/get-vapid-public-key/index.ts` | Utworzenie | Pobieranie klucza publicznego |
| `src/components/admin/PushNotificationsManagement.tsx` | Utworzenie | Panel administracyjny |
| `src/components/admin/AdminSidebar.tsx` | Modyfikacja | Dodanie zakładki Push |
| `src/pages/Admin.tsx` | Modyfikacja | Import i render komponentu |
| `src/hooks/usePushNotifications.ts` | Utworzenie | Hook kliencki |
| `public/sw-push.js` | Utworzenie | Service Worker |
| `public/icons/` | Utworzenie | Domyślne ikony |
| `src/components/messages/NotificationPermissionBanner.tsx` | Modyfikacja | Obsługa push |

---

## Korzyści tego podejścia

1. **Bez zewnętrznych sekretów** - klucze VAPID przechowywane w bazie danych
2. **Pełna kontrola admina** - generowanie, podgląd, usuwanie kluczy z UI
3. **Statystyki w czasie rzeczywistym** - podgląd subskrypcji, przeglądarek, PWA
4. **Personalizacja** - własne ikony, teksty, tłumaczenia
5. **Detekcja przeglądarek** - Brave, Opera, Edge, Chrome, Safari, Firefox
6. **Mobilne czyszczenie** - automatyczne zamykanie powiadomień po otwarciu app
7. **Logi i debugging** - pełna historia wysyłek w panelu admina

