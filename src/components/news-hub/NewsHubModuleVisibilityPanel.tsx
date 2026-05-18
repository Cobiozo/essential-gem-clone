import React, { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserAccessPicker } from './UserAccessPicker';

interface Settings {
  is_active: boolean;
  visible_to_admin: boolean;
  visible_to_partner: boolean;
  visible_to_client: boolean;
  visible_to_specjalista: boolean;
}

const DEFAULTS: Settings = {
  is_active: true,
  visible_to_admin: true,
  visible_to_partner: true,
  visible_to_client: true,
  visible_to_specjalista: true,
};

const ROLES: Array<{ key: keyof Settings; label: string }> = [
  { key: 'visible_to_admin', label: 'Admin' },
  { key: 'visible_to_partner', label: 'Partner' },
  { key: 'visible_to_client', label: 'Klient' },
  { key: 'visible_to_specjalista', label: 'Specjalista' },
];

export const NewsHubModuleVisibilityPanel: React.FC = () => {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from('news_hub_settings' as any) as any)
      .select('is_active, visible_to_admin, visible_to_partner, visible_to_client, visible_to_specjalista')
      .eq('id', true)
      .maybeSingle();
    if (data) setS(data as Settings);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const update = async (patch: Partial<Settings>) => {
    const next = { ...s, ...patch };
    setS(next);
    const { error } = await (supabase.from('news_hub_settings' as any) as any)
      .upsert({ id: true, ...next, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) toast.error('Błąd zapisu: ' + error.message);
    else toast.success('Zapisano');
  };

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <EyeOff className="h-5 w-5" /> Widoczność modułu Aktualności
        </CardTitle>
        <CardDescription>
          Określ, kto widzi Centrum Aktualności w menu i może wejść pod <code className="text-xs">/aktualnosci</code>.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div>
            <div className="text-sm font-semibold">Moduł włączony</div>
            <div className="text-xs text-muted-foreground">Wyłączenie ukryje moduł dla wszystkich poza administratorem.</div>
          </div>
          <Switch checked={s.is_active} onCheckedChange={(v) => update({ is_active: v })} />
        </div>

        <div className={`space-y-2 ${!s.is_active ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="text-sm font-semibold">Widoczne dla ról</div>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map((r) => (
              <label key={r.key} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span>{r.label}</span>
                <Switch checked={s[r.key] as boolean} onCheckedChange={(v) => update({ [r.key]: v } as any)} />
              </label>
            ))}
          </div>
        </div>

        <div className={!s.is_active ? 'opacity-50 pointer-events-none' : ''}>
          <UserAccessPicker
            table="news_hub_user_access"
            label="Indywidualny dostęp (override)"
            description="Dodaj użytkowników, którzy mają widzieć moduł niezależnie od ustawień ról."
          />
        </div>
      </CardContent>
    </Card>
  );
};
