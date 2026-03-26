import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  ChevronDown,
  ChevronRight,
  Search,
  Copy,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DnsRecord {
  type: string;
  status: 'ok' | 'warning' | 'error' | 'not_found';
  found: boolean;
  records: string[];
  message: string;
  details?: string;
}

interface DnsCheckResult {
  success: boolean;
  domain?: string;
  overall_status?: 'ok' | 'warning' | 'error';
  overall_message?: string;
  checks?: {
    spf: DnsRecord;
    dkim: DnsRecord;
    dmarc: DnsRecord;
  };
  mx_records?: string[];
  message?: string;
}

const statusConfig = {
  ok: { icon: CheckCircle2, color: 'text-green-600', badge: 'default' as const, label: 'OK' },
  warning: { icon: AlertTriangle, color: 'text-yellow-600', badge: 'secondary' as const, label: 'Uwaga' },
  error: { icon: XCircle, color: 'text-destructive', badge: 'destructive' as const, label: 'Błąd' },
  not_found: { icon: XCircle, color: 'text-destructive', badge: 'destructive' as const, label: 'Brak' },
};

const RecordCard: React.FC<{ record: DnsRecord }> = ({ record }) => {
  const [isOpen, setIsOpen] = useState(record.status !== 'ok');
  const config = statusConfig[record.status];
  const StatusIcon = config.icon;
  const { toast } = useToast();

  const copyRecord = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Skopiowano do schowka' });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <StatusIcon className={`w-5 h-5 ${config.color}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{record.type}</span>
                <Badge variant={config.badge} className="text-xs">{config.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">{record.message}</p>
            </div>
          </div>
          {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-4 pb-4 pt-2 space-y-3">
          {record.details && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">{record.details}</AlertDescription>
            </Alert>
          )}
          {record.records.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Znalezione rekordy:</p>
              {record.records.map((r, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded bg-muted/50 font-mono text-xs break-all">
                  <span className="flex-1">{r}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => copyRecord(r)}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const DnsDiagnosticPanel: React.FC<{ senderEmail?: string }> = ({ senderEmail }) => {
  const [domain, setDomain] = useState(() => {
    if (senderEmail?.includes('@')) return senderEmail.split('@')[1];
    return '';
  });
  const [dkimSelector, setDkimSelector] = useState('default');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<DnsCheckResult | null>(null);
  const { toast } = useToast();

  const handleCheck = async () => {
    if (!domain) {
      toast({ title: 'Podaj domenę do sprawdzenia', variant: 'destructive' });
      return;
    }

    setChecking(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('check-dns-records', {
        body: { domain, dkim_selector: dkimSelector },
      });

      if (error) throw error;
      setResult(data);
    } catch (error: any) {
      toast({
        title: 'Błąd sprawdzania DNS',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setChecking(false);
    }
  };

  const OverallIcon = result?.overall_status === 'ok'
    ? ShieldCheck
    : result?.overall_status === 'error'
    ? ShieldX
    : ShieldAlert;

  const overallColor = result?.overall_status === 'ok'
    ? 'text-green-600'
    : result?.overall_status === 'error'
    ? 'text-destructive'
    : 'text-yellow-600';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Diagnostyka uwierzytelniania e-mail
        </CardTitle>
        <CardDescription>
          Sprawdź rekordy SPF, DKIM i DMARC dla domeny nadawcy, aby upewnić się, że wiadomości docierają do odbiorców.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="dns-domain">Domena</Label>
            <Input
              id="dns-domain"
              placeholder="purelife.info.pl"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-40 space-y-1.5">
            <Label htmlFor="dkim-selector">Selektor DKIM</Label>
            <Input
              id="dkim-selector"
              placeholder="default"
              value={dkimSelector}
              onChange={(e) => setDkimSelector(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={handleCheck} disabled={checking || !domain}>
              {checking ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              Sprawdź
            </Button>
          </div>
        </div>

        {result?.success && result.checks && (
          <div className="space-y-4 mt-4">
            {/* Overall status */}
            <Alert variant={result.overall_status === 'error' ? 'destructive' : 'default'}>
              <OverallIcon className={`h-5 w-5 ${overallColor}`} />
              <AlertTitle className="flex items-center gap-2">
                {result.overall_status === 'ok' && 'Uwierzytelnianie poprawne'}
                {result.overall_status === 'warning' && 'Wymaga poprawek'}
                {result.overall_status === 'error' && 'Problemy z uwierzytelnianiem'}
              </AlertTitle>
              <AlertDescription>{result.overall_message}</AlertDescription>
            </Alert>

            {/* Individual checks */}
            <div className="space-y-2">
              <RecordCard record={result.checks.spf} />
              <RecordCard record={result.checks.dkim} />
              <RecordCard record={result.checks.dmarc} />
            </div>

            {/* MX Records info */}
            {result.mx_records && result.mx_records.length > 0 && (
              <div className="p-4 rounded-lg border bg-card">
                <p className="text-sm font-medium mb-2">Rekordy MX (serwery pocztowe):</p>
                <div className="space-y-1">
                  {result.mx_records.map((mx, i) => (
                    <p key={i} className="text-xs font-mono text-muted-foreground">{mx}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {result && !result.success && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};
