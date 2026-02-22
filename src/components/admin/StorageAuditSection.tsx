import React, { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Trash2,
  RefreshCw,
  HardDrive,
  Cloud,
  Loader2,
  FolderOpen,
  FileWarning,
} from 'lucide-react';
import { formatFileSize } from '@/lib/storageConfig';

interface BucketAudit {
  bucket_id: string;
  total_files: number;
  total_bytes: number;
  orphaned_files: number;
  orphaned_bytes: number;
}

interface AuditTotals {
  total_files: number;
  total_bytes: number;
  orphaned_files: number;
  orphaned_bytes: number;
}

const BUCKET_ICONS: Record<string, string> = {
  'certificates': '📜',
  'cms-videos': '🎬',
  'cms-images': '🖼️',
  'training-media': '🎓',
  'healthy-knowledge': '💊',
  'knowledge-resources': '📚',
  'cms-files': '📁',
  'sidebar-icons': '🎨',
};

const BUCKET_LABELS: Record<string, string> = {
  'certificates': 'Certyfikaty',
  'cms-videos': 'Filmy CMS',
  'cms-images': 'Obrazy CMS',
  'training-media': 'Media szkoleniowe',
  'healthy-knowledge': 'Zdrowa wiedza',
  'knowledge-resources': 'Zasoby wiedzy',
  'cms-files': 'Pliki CMS',
  'sidebar-icons': 'Ikony paska bocznego',
};

export const StorageAuditSection: React.FC = () => {
  const { toast } = useToast();
  const [buckets, setBuckets] = useState<BucketAudit[]>([]);
  const [totals, setTotals] = useState<AuditTotals | null>(null);
  const [loading, setLoading] = useState(false);
  const [audited, setAudited] = useState(false);
  const [cleaningBucket, setCleaningBucket] = useState<string | null>(null);
  const [confirmCleanup, setConfirmCleanup] = useState<BucketAudit | null>(null);

  const runAudit = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('audit-storage-files', {
        body: { action: 'audit' },
      });
      if (error) throw error;
      setBuckets(data?.buckets || []);
      setTotals(data?.totals || null);
      setAudited(true);
    } catch (err: any) {
      toast({ title: 'Błąd audytu', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const runCleanup = async (bucket: BucketAudit) => {
    setConfirmCleanup(null);
    setCleaningBucket(bucket.bucket_id);
    try {
      const { data, error } = await supabase.functions.invoke('audit-storage-files', {
        body: { action: 'cleanup', bucket_name: bucket.bucket_id },
      });
      if (error) throw error;
      toast({
        title: 'Czyszczenie zakończone',
        description: `Usunięto ${data?.deleted ?? 0} plików z "${BUCKET_LABELS[bucket.bucket_id] || bucket.bucket_id}" (${formatFileSize(data?.freed_bytes ?? 0)}).`,
      });
      // Refresh audit after cleanup
      await runAudit();
    } catch (err: any) {
      toast({ title: 'Błąd czyszczenia', description: err.message, variant: 'destructive' });
    } finally {
      setCleaningBucket(null);
    }
  };

  return (
    <div className="space-y-4">
      <Separator />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <HardDrive className="w-6 h-6 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Audyt plików Storage</h3>
            <p className="text-sm text-muted-foreground">
              Skanuj buckety Supabase Storage w poszukiwaniu osieroconych plików
            </p>
          </div>
        </div>
        <Button onClick={runAudit} disabled={loading} variant="outline" size="sm">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {audited ? 'Odśwież audyt' : 'Uruchom audyt'}
        </Button>
      </div>

      {/* Summary cards */}
      {totals && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Cloud className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{formatFileSize(totals.total_bytes)}</p>
                  <p className="text-sm text-muted-foreground">
                    Łącznie w Storage ({totals.total_files} plików)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileWarning className="w-8 h-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold">{totals.orphaned_files}</p>
                  <p className="text-sm text-muted-foreground">Osieroconych plików do usunięcia</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-destructive/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <HardDrive className="w-8 h-8 text-destructive" />
                <div>
                  <p className="text-2xl font-bold text-destructive">
                    {formatFileSize(totals.orphaned_bytes)}
                  </p>
                  <p className="text-sm text-muted-foreground">Do odzyskania po czyszczeniu</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bucket list */}
      {audited && buckets.length > 0 && (
        <div className="space-y-3">
          {buckets.map((bucket) => {
            const isCleaning = cleaningBucket === bucket.bucket_id;
            const icon = BUCKET_ICONS[bucket.bucket_id] || '📦';
            const label = BUCKET_LABELS[bucket.bucket_id] || bucket.bucket_id;

            return (
              <Card
                key={bucket.bucket_id}
                className={bucket.orphaned_files > 0 ? 'border-destructive/20' : ''}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-base">{icon}</span>
                      <div>
                        <CardTitle className="text-base">{label}</CardTitle>
                        <CardDescription className="text-xs font-mono">
                          {bucket.bucket_id}
                        </CardDescription>
                      </div>
                    </div>
                    {bucket.orphaned_files > 0 ? (
                      <Badge variant="destructive" className="text-xs font-mono">
                        {bucket.orphaned_files} osieroconych ({formatFileSize(bucket.orphaned_bytes)})
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs">
                        ✓ Czysto
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2 text-sm">
                      <FolderOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Plików:</span>
                      <span className="font-mono font-medium">{bucket.total_files}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <HardDrive className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Rozmiar:</span>
                      <span className="font-mono font-medium">
                        {formatFileSize(bucket.total_bytes)}
                      </span>
                    </div>
                    {bucket.orphaned_files > 0 && (
                      <>
                        <Separator orientation="vertical" className="h-6 hidden sm:block" />
                        <div className="flex items-center gap-2 text-sm text-destructive">
                          <FileWarning className="w-4 h-4" />
                          <span>Osierocone:</span>
                          <span className="font-mono font-medium">
                            {bucket.orphaned_files} plików ({formatFileSize(bucket.orphaned_bytes)})
                          </span>
                        </div>
                        <div className="ml-auto">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setConfirmCleanup(bucket)}
                            disabled={isCleaning}
                          >
                            {isCleaning ? (
                              <Loader2 className="w-4 h-4 animate-spin mr-2" />
                            ) : (
                              <Trash2 className="w-4 h-4 mr-2" />
                            )}
                            Wyczyść osierocone
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {audited && buckets.length === 0 && !loading && (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            Brak bucketów do wyświetlenia.
          </CardContent>
        </Card>
      )}

      {/* Confirm cleanup dialog */}
      <AlertDialog open={!!confirmCleanup} onOpenChange={() => setConfirmCleanup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Potwierdzenie czyszczenia Storage</AlertDialogTitle>
            <AlertDialogDescription>
              Czy na pewno chcesz usunąć{' '}
              <strong>
                {confirmCleanup?.orphaned_files} osieroconych plików
              </strong>{' '}
              z bucketu{' '}
              <strong>
                „{BUCKET_LABELS[confirmCleanup?.bucket_id ?? ''] || confirmCleanup?.bucket_id}"
              </strong>
              ?
              <br /><br />
              Odzyskasz{' '}
              <strong>{formatFileSize(confirmCleanup?.orphaned_bytes ?? 0)}</strong>{' '}
              przestrzeni storage.
              <br /><br />
              Ta operacja jest <strong>nieodwracalna</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anuluj</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmCleanup && runCleanup(confirmCleanup)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Tak, usuń pliki
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default StorageAuditSection;
