import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHomepageV2Content, useHomepageVariant } from '@/hooks/useHomepageConfig';
import type { HomepageV2Content, EditElementType, ElementStyle } from '@/types/homepageV2';
import LandingV2 from '@/components/landing-v2/LandingV2';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Save, Eye, Rocket, Undo2, Monitor, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { Inspector } from '@/components/landing-v2/editor/Inspector';
import { SelectionOverlay } from '@/components/landing-v2/editor/SelectionOverlay';
import { updateStyle } from '@/components/landing-v2/editor/pathUtils';

const HomepageEditor: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { variant, reload: reloadVariant } = useHomepageVariant();
  const { content: published, draft, rowId, reload, loading } = useHomepageV2Content(false);
  const [working, setWorking] = useState<HomepageV2Content | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<EditElementType | null>(null);
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const autoTimer = useRef<any>(null);
  const dirtyRef = useRef(false);

  // Load working from draft or published
  useEffect(() => {
    if (!working && (draft || published)) {
      setWorking(JSON.parse(JSON.stringify(draft ?? published)));
    }
  }, [draft, published, working]);

  // Auto-save draft (debounced)
  useEffect(() => {
    if (!working || !rowId || !dirtyRef.current) return;
    if (autoTimer.current) clearTimeout(autoTimer.current);
    setAutosaveStatus('saving');
    autoTimer.current = setTimeout(async () => {
      const { error } = await (supabase.from('homepage_v2_content' as any) as any)
        .update({ draft_content: working, updated_at: new Date().toISOString(), updated_by: user!.id })
        .eq('id', rowId);
      if (!error) setAutosaveStatus('saved');
      else setAutosaveStatus('idle');
      dirtyRef.current = false;
    }, 900);
    return () => { if (autoTimer.current) clearTimeout(autoTimer.current); };
  }, [working, rowId, user]);

  const handleChange = (next: HomepageV2Content) => {
    dirtyRef.current = true;
    setWorking(next);
  };

  if (user === null) return <Navigate to="/auth" replace />;
  if (user && !isAdmin) return <Navigate to="/dashboard" replace />;

  if (loading || !working) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const publish = async () => {
    if (!rowId) return;
    setSaving(true);
    const { error } = await (supabase.from('homepage_v2_content' as any) as any)
      .update({
        content: working,
        draft_content: null,
        published_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        updated_by: user!.id,
      })
      .eq('id', rowId);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success('Opublikowano na stronie głównej'); reload(); }
  };

  const discardDraft = async () => {
    if (!rowId || !published) return;
    if (!confirm('Odrzucić wszystkie niezapisane zmiany i wrócić do opublikowanej wersji?')) return;
    setSaving(true);
    const { error } = await (supabase.from('homepage_v2_content' as any) as any)
      .update({ draft_content: null, updated_at: new Date().toISOString(), updated_by: user!.id })
      .eq('id', rowId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setWorking(JSON.parse(JSON.stringify(published)));
    setSelectedPath(null); setSelectedType(null);
    toast.success('Cofnięto do opublikowanej wersji');
    reload();
  };

  const setVariant = async (v: 'v1' | 'v2') => {
    const { error } = await (supabase.from('homepage_settings' as any) as any)
      .update({ active_variant: v, updated_at: new Date().toISOString(), updated_by: user!.id })
      .eq('singleton', true);
    if (error) toast.error(error.message);
    else {
      toast.success(`Aktywna strona główna: ${v === 'v2' ? 'V2 nowa' : 'V1 klasyczna'}`);
      reloadVariant();
    }
  };

  const canvasWidth = device === 'mobile' ? 'max-w-[430px]' : 'max-w-none';

  return (
    <div className="h-screen flex flex-col bg-muted/30 text-foreground">
      {/* ==== Toolbar ==== */}
      <div className="border-b border-border bg-card shrink-0 z-40">
        <div className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-sm text-muted-foreground hover:text-foreground hover:underline">← Panel</Link>
            <div>
              <h1 className="text-sm font-bold leading-tight">Edytor strony głównej V2</h1>
              <p className="text-[11px] text-muted-foreground">Kliknij dowolny element w podglądzie, aby go edytować.</p>
            </div>
            <div className="flex items-center gap-1.5 pl-4 border-l border-border">
              <span className="text-[11px] text-muted-foreground">Aktywna:</span>
              <Button size="sm" variant={variant === 'v1' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setVariant('v1')}>V1</Button>
              <Button size="sm" variant={variant === 'v2' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setVariant('v2')}>V2</Button>
            </div>
            <div className="flex items-center gap-1 pl-2 border-l border-border">
              <Button size="sm" variant={device === 'desktop' ? 'default' : 'ghost'} className="h-7 w-7 p-0" onClick={() => setDevice('desktop')}>
                <Monitor className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant={device === 'mobile' ? 'default' : 'ghost'} className="h-7 w-7 p-0" onClick={() => setDevice('mobile')}>
                <Smartphone className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground min-w-[100px] text-right">
              {autosaveStatus === 'saving' && '⏳ zapisuję...'}
              {autosaveStatus === 'saved' && '✓ draft zapisany'}
            </span>
            <a href="/?variant=v2&preview=draft" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm" className="h-8"><Eye className="w-3.5 h-3.5 mr-1" /> Podgląd draftu</Button>
            </a>
            <Button variant="outline" size="sm" className="h-8" onClick={discardDraft} disabled={saving}>
              <Undo2 className="w-3.5 h-3.5 mr-1" /> Odrzuć zmiany
            </Button>
            <Button size="sm" className="h-8" onClick={publish} disabled={saving}>
              <Rocket className="w-3.5 h-3.5 mr-1" /> Opublikuj
            </Button>
          </div>
        </div>
      </div>

      {/* ==== Body: Canvas + Inspector ==== */}
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_400px]">
        {/* Canvas */}
        <div className="overflow-y-auto overflow-x-hidden bg-muted/30">
          <div
            className="min-h-full p-4 flex justify-center"
            onClick={() => { setSelectedPath(null); setSelectedType(null); }}
          >
            <div
              className={`${canvasWidth} w-full bg-background border border-border rounded-lg shadow-sm overflow-hidden transition-all`}
              onClick={(e) => e.stopPropagation()}
            >
              <LandingV2
                overrideContent={working}
                editable
                selectedPath={selectedPath}
                onSelect={(p, t) => { setSelectedPath(p); setSelectedType(t); }}
              />
            </div>
          </div>
        </div>

        {/* Inspector */}
        <aside className="border-l border-border bg-card overflow-y-auto">
          <Inspector
            content={working}
            onChange={handleChange}
            selectedPath={selectedPath}
            selectedType={selectedType}
            onSelect={(p, t) => { setSelectedPath(p); setSelectedType(t); }}
          />
        </aside>
      </div>
    </div>
  );
};

export default HomepageEditor;

