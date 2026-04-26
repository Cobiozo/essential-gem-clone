import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Copy, KeyRound, Ban, AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { localInputToISO } from '@/utils/datetimeLocal';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
  expires_at: string | null;
}

interface UsageLogRow {
  id: string;
  endpoint: string;
  method: string;
  status_code: number;
  ip: string | null;
  created_at: string;
  error_message: string | null;
}

const ALL_SCOPES = [
  { value: 'contacts:read', label: 'Kontakty (odczyt)' },
  { value: 'contacts:write', label: 'Kontakty (zapis)' },
  { value: 'events:read', label: 'Wydarzenia (odczyt)' },
  { value: 'registrations:read', label: 'Rejestracje (odczyt)' },
  { value: 'autowebinar-stats:read', label: 'Statystyki auto-webinarów (odczyt)' },
];

export const InboundApiKeys: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [showFullKey, setShowFullKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState('');
  const [logsForKey, setLogsForKey] = useState<string | null>(null);
  const [logs, setLogs] = useState<UsageLogRow[]>([]);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys')
      .select('id, name, key_prefix, scopes, created_at, last_used_at, revoked_at, expires_at')
      .order('created_at', { ascending: false });
    if (error) toast.error('Błąd ładowania kluczy');
    else setKeys(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const resetForm = () => {
    setName('');
    setSelectedScopes([]);
    setExpiresAt('');
  };

  const handleCreate = async () => {
    if (!name.trim() || selectedScopes.length === 0) {
      toast.error('Podaj nazwę i wybierz co najmniej jeden scope');
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke('admin-create-api-key', {
      body: {
        name: name.trim(),
        scopes: selectedScopes,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      },
    });
    setCreating(false);
    if (error || !data?.full_key) {
      toast.error('Nie udało się wygenerować klucza');
      return;
    }
    setShowFullKey(data.full_key);
    setCreateOpen(false);
    resetForm();
    loadKeys();
  };

  const handleRevoke = async (id: string) => {
    const { error } = await supabase.functions.invoke('admin-revoke-api-key', { body: { key_id: id } });
    if (error) { toast.error('Błąd odwoływania klucza'); return; }
    toast.success('Klucz odwołany');
    loadKeys();
  };

  const loadLogs = async (keyId: string) => {
    setLogsForKey(keyId);
    const { data } = await supabase
      .from('api_key_usage_log')
      .select('id, endpoint, method, status_code, ip, created_at, error_message')
      .eq('api_key_id', keyId)
      .order('created_at', { ascending: false })
      .limit(50);
    setLogs(data ?? []);
  };

  const copyKey = async () => {
    if (!showFullKey) return;
    await navigator.clipboard.writeText(showFullKey);
    toast.success('Klucz skopiowany do schowka');
  };

  const getStatus = (k: ApiKey): { label: string; variant: 'default' | 'destructive' | 'secondary' } => {
    if (k.revoked_at) return { label: 'Odwołany', variant: 'destructive' };
    if (k.expires_at && new Date(k.expires_at) < new Date()) return { label: 'Wygasły', variant: 'destructive' };
    return { label: 'Aktywny', variant: 'default' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Klucze API (inbound)</h3>
          <p className="text-sm text-muted-foreground">
            Wydaj klucz zewnętrznej aplikacji, aby mogła czytać/zapisywać dane przez Public API.
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-1" /> Wygeneruj klucz</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nowy klucz API</DialogTitle>
              <DialogDescription>Po wygenerowaniu klucz będzie widoczny tylko raz.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="key-name">Nazwa</Label>
                <Input
                  id="key-name" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="np. Integracja Zoho CRM" maxLength={120}
                />
              </div>
              <div>
                <Label>Scope-y (uprawnienia)</Label>
                <div className="space-y-2 mt-2">
                  {ALL_SCOPES.map((s) => (
                    <label key={s.value} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedScopes.includes(s.value)}
                        onCheckedChange={(checked) => {
                          setSelectedScopes((prev) =>
                            checked ? [...prev, s.value] : prev.filter((x) => x !== s.value)
                          );
                        }}
                      />
                      <span>{s.label}</span>
                      <code className="ml-auto text-[11px] text-muted-foreground">{s.value}</code>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="expires">Data wygaśnięcia (opcjonalnie)</Label>
                <Input id="expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Anuluj</Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? 'Generowanie…' : 'Wygeneruj'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal z pełnym kluczem (one-time view) */}
      <Dialog open={!!showFullKey} onOpenChange={(open) => { if (!open) setShowFullKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Skopiuj teraz — nie zobaczysz go ponownie
            </DialogTitle>
            <DialogDescription>
              Ten klucz jest pokazywany tylko raz. Po zamknięciu okna nie będzie można go odzyskać.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-muted p-3 rounded-md font-mono text-xs break-all border">
              {showFullKey}
            </div>
            <Button onClick={copyKey} className="w-full">
              <Copy className="w-4 h-4 mr-1" /> Kopiuj klucz
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFullKey(null)}>Zamknij</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lista kluczy */}
      <Card className="p-4">
        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Ładowanie…</div>
        ) : keys.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">
            Brak kluczy. Wygeneruj pierwszy, aby umożliwić zewnętrznej aplikacji dostęp.
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((k) => {
              const status = getStatus(k);
              return (
                <div key={k.id} className="border rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <KeyRound className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{k.name}</div>
                        <code className="text-xs text-muted-foreground">{k.key_prefix}…</code>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <Button size="sm" variant="ghost" onClick={() => loadLogs(k.id)}>
                        <Eye className="w-3.5 h-3.5 mr-1" /> Logi
                      </Button>
                      {!k.revoked_at && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Ban className="w-3.5 h-3.5 mr-1" /> Odwołaj
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Odwołać klucz „{k.name}"?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Zewnętrzne aplikacje używające tego klucza natychmiast stracą dostęp.
                                Operacja jest nieodwracalna.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Anuluj</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleRevoke(k.id)}>Odwołaj</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {k.scopes.map((s) => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4">
                    <span>Utworzony: {format(new Date(k.created_at), 'yyyy-MM-dd HH:mm')}</span>
                    <span>Ostatnio użyty: {k.last_used_at ? format(new Date(k.last_used_at), 'yyyy-MM-dd HH:mm') : '—'}</span>
                    {k.expires_at && <span>Wygasa: {format(new Date(k.expires_at), 'yyyy-MM-dd HH:mm')}</span>}
                  </div>

                  {logsForKey === k.id && (
                    <div className="mt-2 border-t pt-2">
                      <div className="text-xs font-medium mb-1">Ostatnie 50 wywołań:</div>
                      {logs.length === 0 ? (
                        <div className="text-xs text-muted-foreground">Brak wywołań.</div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto text-xs space-y-1">
                          {logs.map((l) => (
                            <div key={l.id} className="flex gap-2 font-mono">
                              <span className="text-muted-foreground">{format(new Date(l.created_at), 'MM-dd HH:mm:ss')}</span>
                              <span className={l.status_code >= 400 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}>
                                {l.status_code}
                              </span>
                              <span className="truncate">{l.endpoint}</span>
                              {l.ip && <span className="text-muted-foreground ml-auto">{l.ip}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
