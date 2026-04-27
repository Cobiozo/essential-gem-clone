import React, { useState } from 'react';
import { OmegaTest, OmegaTestInput } from '@/hooks/useOmegaTests';
import { format, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { Trash2, Pencil, Check, X, Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getRatioThreshold, getIndexThreshold } from './OmegaThresholds';
import { ReminderHistoryList } from './ReminderHistoryList';

interface OmegaTestHistoryProps {
  tests: OmegaTest[];
  onDelete?: (id: string) => void;
  onEdit?: (id: string, data: OmegaTestInput) => void;
  showReminderHistoryButton?: boolean;
}

export const OmegaTestHistory: React.FC<OmegaTestHistoryProps> = ({ tests, onDelete, onEdit, showReminderHistoryButton }) => {
  const reversed = [...tests].reverse();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<OmegaTestInput>({ test_date: '' });
  const [reminderTestId, setReminderTestId] = useState<string | null>(null);

  const startEdit = (test: OmegaTest) => {
    setEditingId(test.id);
    setEditData({
      test_date: test.test_date,
      omega3_index: test.omega3_index,
      omega6_3_ratio: test.omega6_3_ratio,
      aa: test.aa,
      epa: test.epa,
      dha: test.dha,
      la: test.la,
      notes: test.notes,
    });
  };

  const handleSave = () => {
    if (editingId && onEdit) {
      onEdit(editingId, editData);
      setEditingId(null);
    }
  };

  const handleCancel = () => setEditingId(null);

  const updateField = (field: keyof OmegaTestInput, value: string) => {
    if (field === 'test_date' || field === 'notes') {
      setEditData(prev => ({ ...prev, [field]: value || null }));
    } else {
      setEditData(prev => ({ ...prev, [field]: value === '' ? null : parseFloat(value) }));
    }
  };

  return (
    <div className="p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">Historia Transformacji Omega</h3>
      {reversed.length === 0 ? (
        <p className="text-xs text-muted-foreground">Brak wpisów. Dodaj swój pierwszy test.</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {reversed.map((test) => {
            if (editingId === test.id) {
              return (
                <div key={test.id} className="p-3 rounded-lg bg-background/50 border border-primary/30 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Data</label>
                      <Input type="date" className="h-7 text-xs" value={editData.test_date} onChange={e => updateField('test_date', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Index %</label>
                      <Input type="number" step="0.1" className="h-7 text-xs" value={editData.omega3_index ?? ''} onChange={e => updateField('omega3_index', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Ratio</label>
                      <Input type="number" step="0.1" className="h-7 text-xs" value={editData.omega6_3_ratio ?? ''} onChange={e => updateField('omega6_3_ratio', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">EPA %</label>
                      <Input type="number" step="0.1" className="h-7 text-xs" value={editData.epa ?? ''} onChange={e => updateField('epa', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">DHA %</label>
                      <Input type="number" step="0.1" className="h-7 text-xs" value={editData.dha ?? ''} onChange={e => updateField('dha', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">AA %</label>
                      <Input type="number" step="0.1" className="h-7 text-xs" value={editData.aa ?? ''} onChange={e => updateField('aa', e.target.value)} />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">LA %</label>
                      <Input type="number" step="0.1" className="h-7 text-xs" value={editData.la ?? ''} onChange={e => updateField('la', e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground">Notatki</label>
                    <Input className="h-7 text-xs" value={editData.notes ?? ''} onChange={e => updateField('notes', e.target.value)} />
                  </div>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCancel}>
                      <X className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-primary" onClick={handleSave}>
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            }

            const ratioT = getRatioThreshold(test.omega6_3_ratio);
            const indexT = getIndexThreshold(test.omega3_index);
            return (
              <div key={test.id} className="p-3 rounded-lg bg-background/50 border border-border/20 space-y-1">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-medium text-foreground">
                    {format(parseISO(test.test_date), 'dd MMMM yyyy', { locale: pl })}
                  </span>
                  <div className="flex gap-0.5">
                    {onEdit && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => startEdit(test)}>
                        <Pencil className="h-3 w-3 text-muted-foreground hover:text-primary" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(test.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {test.omega3_index !== null && (
                    <span>Index: <strong className={indexT.color}>{test.omega3_index}%</strong></span>
                  )}
                  {test.omega6_3_ratio !== null && (
                    <span>Ratio: <strong className={ratioT.color}>{test.omega6_3_ratio}:1</strong></span>
                  )}
                  {test.epa !== null && <span>EPA: {test.epa}%</span>}
                  {test.dha !== null && <span>DHA: {test.dha}%</span>}
                  {test.aa !== null && <span>AA: {test.aa}%</span>}
                  {test.la !== null && <span>LA: {test.la}%</span>}
                </div>
                {test.notes && (
                  <p className="text-[11px] text-muted-foreground/80 italic mt-1">„{test.notes}"</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
