import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, Sparkles } from 'lucide-react';
import { useNewsHubTemplates } from '@/hooks/useNewsHubTemplates';
import type { NewsHubBlock, NewsHubTemplate } from '@/types/newsHubBlocks';
import { makeBlockId } from '@/types/newsHubBlocks';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (blocks: NewsHubBlock[], template?: NewsHubTemplate) => void;
}

// Reassign ids so blocks are unique within the new post
function cloneBlocks(blocks: NewsHubBlock[]): NewsHubBlock[] {
  return (blocks || []).map((b) => ({
    ...b,
    id: makeBlockId(),
    data: b.type === 'columns' && Array.isArray(b.data?.columns)
      ? { ...b.data, columns: b.data.columns.map((c: NewsHubBlock[]) => cloneBlocks(c)) }
      : { ...b.data },
  }));
}

export const TemplatePicker: React.FC<Props> = ({ open, onClose, onPick }) => {
  const { templates, loading } = useNewsHubTemplates();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Wybierz szablon</DialogTitle>
          <DialogDescription>Zacznij od pustego postu lub gotowego układu bloków.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <button
            type="button"
            onClick={() => onPick([])}
            className="text-left rounded-xl border border-border hover:border-primary hover:bg-muted/40 p-4 transition group"
          >
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              <div className="font-semibold">Pusty post</div>
            </div>
            <div className="text-xs text-muted-foreground">Zacznij od zera — dodawaj bloki jak chcesz.</div>
          </button>

          {loading ? (
            <div className="col-span-full flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : (
            templates.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onPick(cloneBlocks(t.blocks || []), t)}
                className="text-left rounded-xl border border-border hover:border-primary hover:bg-muted/40 p-4 transition group"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <div className="font-semibold truncate">{t.name}</div>
                  {t.is_system && <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">system</span>}
                </div>
                {t.description && <div className="text-xs text-muted-foreground line-clamp-2">{t.description}</div>}
                <div className="mt-2 text-[10px] text-muted-foreground">{(t.blocks || []).length} bloków</div>
              </button>
            ))
          )}
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={onClose}>Anuluj</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
