import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Trash2, PlugZap, CheckCircle2, XCircle, Eye, ExternalLink, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Integration {
  id: string;
  name: string;
  slug: string;
  base_url: string;
  auth_type: string;
  auth_header_name: string;
  description: string | null;
  health_path: string | null;
  enabled: boolean;
  last_test_at: string | null;
  last_test_status: string | null;
  last_test_message: string | null;
  created_at: string;
}

interface CallLog {
  id: string;
  method: string;
  path: string;
  status_code: number | null;
  duration_ms: number | null;
  error_message: string | null;
  created_at: string;
}

const SUPABASE_PROJECT_REF = 'xzlhssqqbajqhnsmbucf';
const SECRETS_URL = `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_REF}/settings/functions`;

export const OutboundIntegrations: React.FC = () => {
  const [items, setItems] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Integration | null>(null);
  const [open, setOpen] = useState(false);
  const [logsFor, setLogsFor] = useState<string | null>(null);
  const [logs, setLogs] = useState<CallLog[]>([]);

  // form
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [authType, setAuthType] = useState('bearer');
  const [authHeaderName, setAuthHeaderName] = useState('Authorization');
  const [healthPath, setHealthPath] = useState('');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('outbound_integrations')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Błąd ładowania integracji');
    else setItems((data ?? []) as Integration[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setName(''); setSlug(''); setBaseUrl(''); setAuthType('bearer');
    setAuthHeaderName('Authorization'); setHealthPath(''); setDescription('');
    setEditing(null);
  };

  const openEdit = (it: Integration) => {
    setEditing(it);
    setName(it.name); setSlug(it.slug); setBaseUrl(it.base_url);
    setAuthType(it.auth_type); setAuthHeaderName(it.auth_header_name);
    setHealthPath(it.health_path ?? ''); setDescription(it.description ?? '');
    setOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !slug.trim() || !baseUrl.trim()) {
      toast.error('Wypełnij nazwę, slug i base URL');
      return;
    }
    if (!/^[a-z0-9_-]{2,40}$/.test(slug)) {
      toast.error('Slug: tylko a-z, 0-9, _ i -, długość 2-40');
      return;
    }
    if (!/^https:\/\//i.test(baseUrl)) {
      toast.error('Base URL musi zaczynać się od https://');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error('Brak sesji'); return; }

    const payload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      base_url: baseUrl.trim(),
      auth_type: authType,
      auth_header_name: authHeaderName.trim() || 'Authorization',
      health_path: healthPath.trim() || null,
      description: description.trim() || null,
    };

    if (editing) {
      const { error } = await supabase.from('outbound_integrations').update(payload).eq('id', editing.id);
      if (error) { toast.error('Błąd zapisu'); return; }
      toast.success('Zapisano');
    } else {
      const { error } = await supabase.from('outbound_integrations').insert({ ...payload, created_by: user.id });
      if (error) { toast.error(`Błąd: ${error.message}`); return; }
      toast.success('Integracja dodana');
      const secretName = `OUTBOUND_${payload.slug.toUpperCase().replace(/-/g, '_')}_API_KEY`;
      toast.info(`Dodaj sekret ${secretName} w Lovable Cloud`, { duration: 8000 });
    }
    setOpen(false);
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('outbound_integrations').delete().eq('id', id);
    if (error) { toast.error('Błąd usuwania'); return; }
    toast.success('Usunięto');
    load();
  };

  const handleToggle = async (it: Integration) => {
    const { error } = await supabase.from('outbound_integrations').update({ enabled: !it.enabled }).eq('id', it.id);
    if (error) toast.error('Błąd');
    else load();
  };

  const handleTest = async (it: Integration) => {
    toast.loading('Testowanie połączenia…', { id: `test-${it.id}` });
    const { data, error } = await supabase.functions.invoke('admin-test-outbound-integration', {
      body: { integration_id: it.id },
    });
    toast.dismiss(`test-${it.id}`);
    if (error) { toast.error('Błąd testu'); return; }
    if (data?.status === 'ok') toast.success(`OK: ${data.message}`);
    else toast.error(`Błąd: ${data?.message ?? 'unknown'}`);
    if (data?.secret_configured === false) {
      toast.warning(`Brakuje sekretu: ${data.secret_name}`, { duration: 6000 });
    }
    load();
  };

  const loadLogs = async (id: string) => {
    setLogsFor(id);
    const { data } = await supabase
      .from('outbound_call_log')
      .select('id, method, path, status_code, duration_ms, error_message, created_at')
      .eq('integration_id', id)
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs((data ?? []) as CallLog[]);
  };

  const copySecretName = (slug: string) => {
    const name = `OUTBOUND_${slug.toUpperCase().replace(/-/g, '_')}_API_KEY`;
    navigator.clipboard.writeText(name);
    toast.success(`Skopiowano: ${name}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Integracje wychodzące (outbound)</h3>
          <p className="text-sm text-muted-foreground">
            Konfiguruj zewnętrzne API. Klucze trzymane są w Lovable Cloud Secrets — nigdy w bazie.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" /> Dodaj integrację</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edytuj integrację' : 'Nowa integracja'}</DialogTitle>
              <DialogDescription>
                Po utworzeniu UI pokaże nazwę sekretu, którą musisz dodać ręcznie w Lovable Cloud.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div>
                <Label>Nazwa</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="np. MailerLite" />
              </div>
              <div>
                <Label>Slug (do nazwy sekretu)</Label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} placeholder="mailerlite" disabled={!!editing} />
                {slug && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Sekret: <code>OUTBOUND_{slug.toUpperCase().replace(/-/g, '_')}_API_KEY</code>
                  </div>
                )}
              </div>
              <div>
                <Label>Base URL (HTTPS)</Label>
                <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://api.example.com/v2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Typ auth</Label>
                  <Select value={authType} onValueChange={setAuthType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bearer">Bearer token</SelectItem>
                      <SelectItem value="api_key_header">API Key (header)</SelectItem>
                      <SelectItem value="basic">Basic auth</SelectItem>
                      <SelectItem value="none">Brak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nazwa nagłówka</Label>
                  <Input value={authHeaderName} onChange={(e) => setAuthHeaderName(e.target.value)} placeholder="Authorization" />
                </div>
              </div>
              <div>
                <Label>Health path (opcjonalnie, do testu)</Label>
                <Input value={healthPath} onChange={(e) => setHealthPath(e.target.value)} placeholder="/health" />
              </div>
              <div>
                <Label>Opis</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Anuluj</Button>
              <Button onClick={handleSave}>{editing ? 'Zapisz' : 'Dodaj'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Ładowanie…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Brak skonfigurowanych integracji. Dodaj pierwszą, aby umożliwić platformie wywołania zewnętrznych API.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlugZap className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate flex items-center gap-2">
                        {it.name}
                        <Badge variant="outline" className="text-[10px]">{it.slug}</Badge>
                      </div>
                      <code className="text-xs text-muted-foreground truncate block">{it.base_url}</code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Switch checked={it.enabled} onCheckedChange={() => handleToggle(it)} />
                    {it.last_test_status === 'ok' && <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> OK</Badge>}
                    {it.last_test_status === 'error' && <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Błąd</Badge>}
                    <Button size="sm" variant="outline" onClick={() => handleTest(it)}>Testuj</Button>
                    <Button size="sm" variant="ghost" onClick={() => loadLogs(it.id)}><Eye className="w-3.5 h-3.5 mr-1" /> Logi</Button>
                    <Button size="sm" variant="ghost" onClick={() => openEdit(it)}>Edytuj</Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="outline"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Usunąć „{it.name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Konfiguracja zostanie usunięta. Sekret w Lovable Cloud pozostanie — usuń go ręcznie.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Anuluj</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(it.id)}>Usuń</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                  <span>Auth: <code className="bg-muted px-1 rounded">{it.auth_type}</code></span>
                  <button onClick={() => copySecretName(it.slug)} className="inline-flex items-center gap-1 hover:text-foreground">
                    <Copy className="w-3 h-3" /> sekret: <code>OUTBOUND_{it.slug.toUpperCase().replace(/-/g, '_')}_API_KEY</code>
                  </button>
                  <a href={SECRETS_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground underline">
                    <ExternalLink className="w-3 h-3" /> Zarządzaj sekretami
                  </a>
                  {it.last_test_at && (
                    <span className="ml-auto">Ostatni test: {format(new Date(it.last_test_at), 'yyyy-MM-dd HH:mm')}</span>
                  )}
                </div>

                {logsFor === it.id && (
                  <div className="mt-2 border-t pt-2">
                    <div className="text-xs font-medium mb-1">Ostatnie 50 wywołań:</div>
                    {logs.length === 0 ? (
                      <div className="text-xs text-muted-foreground">Brak wywołań.</div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto text-xs space-y-1">
                        {logs.map((l) => (
                          <div key={l.id} className="flex gap-2 font-mono">
                            <span className="text-muted-foreground">{format(new Date(l.created_at), 'MM-dd HH:mm:ss')}</span>
                            <span className="font-semibold">{l.method}</span>
                            <span className={`${(l.status_code ?? 0) >= 400 || !l.status_code ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                              {l.status_code ?? 'ERR'}
                            </span>
                            <span className="truncate flex-1">{l.path}</span>
                            {l.duration_ms != null && <span className="text-muted-foreground">{l.duration_ms}ms</span>}
                            {l.error_message && <span className="text-destructive truncate">{l.error_message}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
