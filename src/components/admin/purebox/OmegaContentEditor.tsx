import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Save, RotateCcw, Loader2 } from 'lucide-react';
import { useOmegaMilestones, useOmegaThresholds, useSavePureBoxContent, DEFAULT_MILESTONES, DEFAULT_OMEGA_THRESHOLDS } from '@/hooks/usePureBoxContent';

export const OmegaContentEditor: React.FC = () => {
  const { milestones, isLoading: mLoading } = useOmegaMilestones();
  const { thresholds, isLoading: tLoading } = useOmegaThresholds();
  const saveMutation = useSavePureBoxContent();

  const [editMilestones, setEditMilestones] = useState<typeof DEFAULT_MILESTONES>([]);
  const [editThresholds, setEditThresholds] = useState<typeof DEFAULT_OMEGA_THRESHOLDS>(DEFAULT_OMEGA_THRESHOLDS);

  useEffect(() => {
    if (!mLoading) setEditMilestones(JSON.parse(JSON.stringify(milestones)));
  }, [milestones, mLoading]);

  useEffect(() => {
    if (!tLoading) setEditThresholds(JSON.parse(JSON.stringify(thresholds)));
  }, [thresholds, tLoading]);

  const updateMilestone = (idx: number, field: string, value: string | number) => {
    setEditMilestones(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleSaveMilestones = () => {
    saveMutation.mutate({ key: 'omega_milestones', data: editMilestones });
  };

  const handleSaveThresholds = () => {
    saveMutation.mutate({ key: 'omega_thresholds', data: editThresholds });
  };

  if (mLoading || tLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Milestones */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kamienie milowe protokołu Omega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {editMilestones.map((m, idx) => (
            <div key={idx} className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 border rounded-lg bg-muted/30">
              <div>
                <Label className="text-[10px]">Etykieta</Label>
                <Input value={m.label} onChange={(e) => updateMilestone(idx, 'label', e.target.value)} className="text-xs h-8" />
              </div>
              <div>
                <Label className="text-[10px]">Tytuł</Label>
                <Input value={m.title} onChange={(e) => updateMilestone(idx, 'title', e.target.value)} className="text-xs h-8" />
              </div>
              <div>
                <Label className="text-[10px]">Opis</Label>
                <Input value={m.description} onChange={(e) => updateMilestone(idx, 'description', e.target.value)} className="text-xs h-8" />
              </div>
              <div>
                <Label className="text-[10px]">Dni</Label>
                <Input type="number" value={m.days} onChange={(e) => updateMilestone(idx, 'days', parseInt(e.target.value) || 0)} className="text-xs h-8" />
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button onClick={handleSaveMilestones} disabled={saveMutation.isPending} size="sm" className="gap-2">
              {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Zapisz kamienie milowe
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditMilestones(JSON.parse(JSON.stringify(DEFAULT_MILESTONES)))} className="gap-2">
              <RotateCcw className="h-3 w-3" />
              Domyślne
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Thresholds */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progi kolorystyczne Omega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold mb-2">Stosunek Omega-6:3 (niższy = lepszy)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg bg-green-500/5">
                <Label className="text-[10px]">Optymalny ≤</Label>
                <Input type="number" step="0.1" value={editThresholds.ratio.optimal.max}
                  onChange={(e) => setEditThresholds(prev => ({
                    ...prev, ratio: { ...prev.ratio, optimal: { ...prev.ratio.optimal, max: parseFloat(e.target.value) || 0 } }
                  }))}
                  className="text-xs h-8 mt-1" />
                <Label className="text-[10px] mt-1">Etykieta</Label>
                <Input value={editThresholds.ratio.optimal.label}
                  onChange={(e) => setEditThresholds(prev => ({
                    ...prev, ratio: { ...prev.ratio, optimal: { ...prev.ratio.optimal, label: e.target.value } }
                  }))}
                  className="text-xs h-8" />
              </div>
              <div className="p-3 border rounded-lg bg-yellow-500/5">
                <Label className="text-[10px]">W poprawie ≤</Label>
                <Input type="number" step="0.1" value={editThresholds.ratio.improving.max}
                  onChange={(e) => setEditThresholds(prev => ({
                    ...prev, ratio: { ...prev.ratio, improving: { ...prev.ratio.improving, max: parseFloat(e.target.value) || 0 } }
                  }))}
                  className="text-xs h-8 mt-1" />
                <Label className="text-[10px] mt-1">Etykieta</Label>
                <Input value={editThresholds.ratio.improving.label}
                  onChange={(e) => setEditThresholds(prev => ({
                    ...prev, ratio: { ...prev.ratio, improving: { ...prev.ratio.improving, label: e.target.value } }
                  }))}
                  className="text-xs h-8" />
              </div>
              <div className="p-3 border rounded-lg bg-red-500/5">
                <Label className="text-[10px]">Krytyczny (powyżej)</Label>
                <Input value={editThresholds.ratio.critical.label}
                  onChange={(e) => setEditThresholds(prev => ({
                    ...prev, ratio: { ...prev.ratio, critical: { ...prev.ratio.critical, label: e.target.value } }
                  }))}
                  className="text-xs h-8 mt-1" />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold mb-2">Indeks Omega-3 % (wyższy = lepszy)</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg bg-green-500/5">
                <Label className="text-[10px]">Optymalny ≥</Label>
                <Input type="number" step="0.1" value={editThresholds.index.optimal.min}
                  onChange={(e) => setEditThresholds(prev => ({
                    ...prev, index: { ...prev.index, optimal: { ...prev.index.optimal, min: parseFloat(e.target.value) || 0 } }
                  }))}
                  className="text-xs h-8 mt-1" />
                <Label className="text-[10px] mt-1">Etykieta</Label>
                <Input value={editThresholds.index.optimal.label}
                  onChange={(e) => setEditThresholds(prev => ({
                    ...prev, index: { ...prev.index, optimal: { ...prev.index.optimal, label: e.target.value } }
                  }))}
                  className="text-xs h-8" />
              </div>
              <div className="p-3 border rounded-lg bg-yellow-500/5">
                <Label className="text-[10px]">W poprawie ≥</Label>
                <Input type="number" step="0.1" value={editThresholds.index.improving.min}
                  onChange={(e) => setEditThresholds(prev => ({
                    ...prev, index: { ...prev.index, improving: { ...prev.index.improving, min: parseFloat(e.target.value) || 0 } }
                  }))}
                  className="text-xs h-8 mt-1" />
                <Label className="text-[10px] mt-1">Etykieta</Label>
                <Input value={editThresholds.index.improving.label}
                  onChange={(e) => setEditThresholds(prev => ({
                    ...prev, index: { ...prev.index, improving: { ...prev.index.improving, label: e.target.value } }
                  }))}
                  className="text-xs h-8" />
              </div>
              <div className="p-3 border rounded-lg bg-red-500/5">
                <Label className="text-[10px]">Krytyczny (poniżej)</Label>
                <Input value={editThresholds.index.critical.label}
                  onChange={(e) => setEditThresholds(prev => ({
                    ...prev, index: { ...prev.index, critical: { ...prev.index.critical, label: e.target.value } }
                  }))}
                  className="text-xs h-8 mt-1" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSaveThresholds} disabled={saveMutation.isPending} size="sm" className="gap-2">
              {saveMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Zapisz progi
            </Button>
            <Button variant="outline" size="sm" onClick={() => setEditThresholds(JSON.parse(JSON.stringify(DEFAULT_OMEGA_THRESHOLDS)))} className="gap-2">
              <RotateCcw className="h-3 w-3" />
              Domyślne
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
