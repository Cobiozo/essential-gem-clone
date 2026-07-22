import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHomepageV2Content, useHomepageVariant } from '@/hooks/useHomepageConfig';
import type { HomepageV2Content } from '@/types/homepageV2';
import LandingV2 from '@/components/landing-v2/LandingV2';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Upload, ArrowUp, ArrowDown, Save, Eye, Rocket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';

const uid = () => Math.random().toString(36).slice(2, 10);

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'png';
  const path = `homepage-v2/${Date.now()}-${uid()}.${ext}`;
  const { error } = await supabase.storage.from('cms-images').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from('cms-images').getPublicUrl(path);
  return data.publicUrl;
}

function ImageField({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2 items-start">
        {value && <img src={value} alt="" className="w-16 h-16 object-cover rounded border" />}
        <div className="flex-1 space-y-2">
          <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="URL obrazu" />
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2 text-xs px-3 py-1.5 border rounded cursor-pointer hover:bg-muted">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
              Wgraj plik
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  setBusy(true);
                  try {
                    const url = await uploadImage(f);
                    onChange(url);
                  } catch (err: any) {
                    toast.error(err.message || 'Błąd uploadu');
                  } finally {
                    setBusy(false);
                    e.target.value = '';
                  }
                }}
              />
            </label>
            {value && (
              <Button variant="ghost" size="sm" onClick={() => onChange('')}>Usuń</Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ListEditor<T extends { id: string }>({
  items, onChange, renderItem, newItem, label,
}: {
  items: T[]; onChange: (items: T[]) => void; renderItem: (item: T, update: (patch: Partial<T>) => void) => React.ReactNode; newItem: () => T; label: string;
}) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <Card key={item.id} className="p-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">#{i + 1}</span>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => move(i, -1)}><ArrowUp className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => move(i, 1)}><ArrowDown className="w-4 h-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => onChange(items.filter((_, idx) => idx !== i))}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          </div>
          {renderItem(item, (patch) => {
            const next = [...items];
            next[i] = { ...item, ...patch };
            onChange(next);
          })}
        </Card>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, newItem()])}>
        <Plus className="w-4 h-4 mr-2" /> Dodaj {label}
      </Button>
    </div>
  );
}

const HomepageEditor: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { variant, reload: reloadVariant } = useHomepageVariant();
  const { content: published, draft, rowId, reload, loading } = useHomepageV2Content(false);
  const [working, setWorking] = useState<HomepageV2Content | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!working && (draft || published)) {
      setWorking(JSON.parse(JSON.stringify(draft ?? published)));
    }
  }, [draft, published, working]);

  // isAdmin from useAuth
  if (user === null) return <Navigate to="/auth" replace />;
  if (user && !isAdmin) return <Navigate to="/dashboard" replace />;

  if (loading || !working) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const patch = (path: (w: HomepageV2Content) => void) => {
    const next = JSON.parse(JSON.stringify(working));
    path(next);
    setWorking(next);
  };

  const saveDraft = async () => {
    if (!rowId) return;
    setSaving(true);
    const { error } = await (supabase.from('homepage_v2_content' as any) as any)
      .update({ draft_content: working, updated_at: new Date().toISOString(), updated_by: user!.id })
      .eq('id', rowId);
    setSaving(false);
    if (error) toast.error(error.message);
    else { toast.success('Wersja robocza zapisana'); reload(); }
  };

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

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b sticky top-0 bg-background z-40">
        <div className="container mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <Link to="/admin" className="text-sm text-muted-foreground hover:underline">← Panel admina</Link>
            <div>
              <h1 className="text-lg font-bold">Strona główna V1/V2</h1>
              <p className="text-xs text-muted-foreground">Ten wybór decyduje, którą stronę widzą osoby niezalogowane na purelifecenter.pl.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-4 border-l">
              <span className="text-xs text-muted-foreground">Aktualnie widoczna:</span>
              <span className={`text-xs font-bold ${variant === 'v2' ? 'text-[hsl(var(--gold-metallic))]' : ''}`}>
                {variant === 'v2' ? 'V2 nowa' : variant === 'v1' ? 'V1 klasyczna' : '...'}
              </span>
              <Button size="sm" variant={variant === 'v1' ? 'default' : 'outline'} onClick={() => setVariant('v1')}>V1 klasyczna</Button>
              <Button size="sm" variant={variant === 'v2' ? 'default' : 'outline'} onClick={() => setVariant('v2')}>V2 nowa</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/?variant=v2" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> Podgląd V2</Button>
            </a>
            <a href="/?variant=v2&preview=draft" target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm"><Eye className="w-4 h-4 mr-1" /> Podgląd draftu</Button>
            </a>
            <Button variant="outline" size="sm" onClick={saveDraft} disabled={saving}>
              <Save className="w-4 h-4 mr-1" /> Zapisz draft
            </Button>
            <Button size="sm" onClick={publish} disabled={saving}>
              <Rocket className="w-4 h-4 mr-1" /> Opublikuj
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 grid lg:grid-cols-2 gap-6">
        <div>
          <Tabs defaultValue="hero" className="w-full">
            <TabsList className="w-full grid grid-cols-6">
              <TabsTrigger value="hero">Hero</TabsTrigger>
              <TabsTrigger value="features">Karty</TabsTrigger>
              <TabsTrigger value="stats">Statystyki</TabsTrigger>
              <TabsTrigger value="community">Społeczność</TabsTrigger>
              <TabsTrigger value="trusted">Zaufali</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="hero" className="space-y-4 mt-4">
              <Card className="p-4 space-y-3">
                <div><Label>Nadtytuł</Label><Input value={working.hero.eyebrow} onChange={(e) => patch((w) => { w.hero.eyebrow = e.target.value; })} /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label>Nagłówek — linia 1</Label><Input value={working.hero.titleLine1} onChange={(e) => patch((w) => { w.hero.titleLine1 = e.target.value; })} /></div>
                  <div><Label>Linia 2</Label><Input value={working.hero.titleLine2} onChange={(e) => patch((w) => { w.hero.titleLine2 = e.target.value; })} /></div>
                  <div><Label>Linia 3 (akcent)</Label><Input value={working.hero.titleLine3} onChange={(e) => patch((w) => { w.hero.titleLine3 = e.target.value; })} /></div>
                </div>
                <div><Label>Opis</Label><Textarea rows={3} value={working.hero.description} onChange={(e) => patch((w) => { w.hero.description = e.target.value; })} /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>CTA główne — tekst</Label><Input value={working.hero.primaryCtaText} onChange={(e) => patch((w) => { w.hero.primaryCtaText = e.target.value; })} /></div>
                  <div><Label>CTA główne — link</Label><Input value={working.hero.primaryCtaUrl} onChange={(e) => patch((w) => { w.hero.primaryCtaUrl = e.target.value; })} /></div>
                  <div><Label>CTA wtórne — tekst</Label><Input value={working.hero.secondaryCtaText} onChange={(e) => patch((w) => { w.hero.secondaryCtaText = e.target.value; })} /></div>
                  <div><Label>CTA wtórne — link</Label><Input value={working.hero.secondaryCtaUrl} onChange={(e) => patch((w) => { w.hero.secondaryCtaUrl = e.target.value; })} /></div>
                </div>
                <div><Label>Tekst pod avatarami</Label><Textarea rows={2} value={working.hero.socialProofText} onChange={(e) => patch((w) => { w.hero.socialProofText = e.target.value; })} /></div>
                <ImageField label="Obraz mockupu (prawa strona hero)" value={working.hero.mockupImage} onChange={(v) => patch((w) => { w.hero.mockupImage = v; })} />
                <div>
                  <Label className="mb-2 block">Avatary społeczności</Label>
                  <ListEditor
                    items={working.hero.avatars}
                    onChange={(items) => patch((w) => { w.hero.avatars = items; })}
                    newItem={() => ({ id: uid(), url: '' })}
                    label="avatar"
                    renderItem={(item, update) => (
                      <ImageField label="Avatar" value={item.url} onChange={(v) => update({ url: v })} />
                    )}
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="features" className="space-y-4 mt-4">
              <Card className="p-4 space-y-3">
                <div><Label>Nadtytuł</Label><Input value={working.features.eyebrow} onChange={(e) => patch((w) => { w.features.eyebrow = e.target.value; })} /></div>
                <div><Label>Tytuł</Label><Input value={working.features.title} onChange={(e) => patch((w) => { w.features.title = e.target.value; })} /></div>
                <Label className="mt-2 block">Karty</Label>
                <ListEditor
                  items={working.features.items}
                  onChange={(items) => patch((w) => { w.features.items = items; })}
                  newItem={() => ({ id: uid(), icon: 'Sparkles', title: '', description: '' })}
                  label="kartę"
                  renderItem={(item, update) => (
                    <div className="space-y-2">
                      <div><Label>Ikona (nazwa Lucide, np. HeartPulse, GraduationCap, Users)</Label><Input value={item.icon} onChange={(e) => update({ icon: e.target.value })} /></div>
                      <div><Label>Tytuł</Label><Input value={item.title} onChange={(e) => update({ title: e.target.value })} /></div>
                      <div><Label>Opis</Label><Textarea rows={2} value={item.description} onChange={(e) => update({ description: e.target.value })} /></div>
                    </div>
                  )}
                />
              </Card>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4 mt-4">
              <Card className="p-4 space-y-3">
                <Label className="mb-2 block">Pozycje statystyk</Label>
                <ListEditor
                  items={working.stats.items}
                  onChange={(items) => patch((w) => { w.stats.items = items; })}
                  newItem={() => ({ id: uid(), icon: 'Users', value: '', label: '' })}
                  label="statystykę"
                  renderItem={(item, update) => (
                    <div className="space-y-2">
                      <div><Label>Ikona</Label><Input value={item.icon} onChange={(e) => update({ icon: e.target.value })} /></div>
                      <div><Label>Liczba</Label><Input value={item.value} onChange={(e) => update({ value: e.target.value })} /></div>
                      <div><Label>Podpis</Label><Input value={item.label} onChange={(e) => update({ label: e.target.value })} /></div>
                    </div>
                  )}
                />
              </Card>
            </TabsContent>

            <TabsContent value="community" className="space-y-4 mt-4">
              <Card className="p-4 space-y-3">
                <div><Label>Nadtytuł</Label><Input value={working.community.eyebrow} onChange={(e) => patch((w) => { w.community.eyebrow = e.target.value; })} /></div>
                <div><Label>Tytuł</Label><Input value={working.community.title} onChange={(e) => patch((w) => { w.community.title = e.target.value; })} /></div>
                <div>
                  <Label>Bullety</Label>
                  <ListEditor
                    items={working.community.bullets.map((b, i) => ({ id: `b-${i}`, text: b }))}
                    onChange={(items) => patch((w) => { w.community.bullets = items.map((it: any) => it.text); })}
                    newItem={() => ({ id: uid(), text: '' } as any)}
                    label="bullet"
                    renderItem={(item: any, update) => (
                      <Input value={item.text} onChange={(e) => update({ text: e.target.value } as any)} />
                    )}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>CTA — tekst</Label><Input value={working.community.ctaText} onChange={(e) => patch((w) => { w.community.ctaText = e.target.value; })} /></div>
                  <div><Label>CTA — link</Label><Input value={working.community.ctaUrl} onChange={(e) => patch((w) => { w.community.ctaUrl = e.target.value; })} /></div>
                </div>
                <ImageField label="Obraz tła" value={working.community.backgroundImage} onChange={(v) => patch((w) => { w.community.backgroundImage = v; })} />
                <div><Label>Tekst nakładki</Label><Textarea rows={2} value={working.community.overlayText} onChange={(e) => patch((w) => { w.community.overlayText = e.target.value; })} /></div>
                <div><Label>URL wideo</Label><Input value={working.community.videoUrl} onChange={(e) => patch((w) => { w.community.videoUrl = e.target.value; })} /></div>
                <div><Label>Licznik osób</Label><Input value={working.community.peopleCount} onChange={(e) => patch((w) => { w.community.peopleCount = e.target.value; })} /></div>
                <div>
                  <Label className="mb-2 block">Avatary społeczności</Label>
                  <ListEditor
                    items={working.community.avatars}
                    onChange={(items) => patch((w) => { w.community.avatars = items; })}
                    newItem={() => ({ id: uid(), url: '' })}
                    label="avatar"
                    renderItem={(item, update) => (
                      <ImageField label="Avatar" value={item.url} onChange={(v) => update({ url: v })} />
                    )}
                  />
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="trusted" className="space-y-4 mt-4">
              <Card className="p-4 space-y-3">
                <div><Label>Nadtytuł</Label><Input value={working.trustedBy.eyebrow} onChange={(e) => patch((w) => { w.trustedBy.eyebrow = e.target.value; })} /></div>
                <Label className="mt-2 block">Logotypy</Label>
                <ListEditor
                  items={working.trustedBy.logos}
                  onChange={(items) => patch((w) => { w.trustedBy.logos = items; })}
                  newItem={() => ({ id: uid(), url: '', alt: '', link: '' })}
                  label="logo"
                  renderItem={(item, update) => (
                    <div className="space-y-2">
                      <ImageField label="Logo" value={item.url} onChange={(v) => update({ url: v })} />
                      <div><Label>Alt</Label><Input value={item.alt} onChange={(e) => update({ alt: e.target.value })} /></div>
                      <div><Label>Link (opcjonalny)</Label><Input value={item.link || ''} onChange={(e) => update({ link: e.target.value })} /></div>
                    </div>
                  )}
                />
              </Card>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 mt-4">
              <Card className="p-4 space-y-3">
                <div><Label>Meta title</Label><Input value={working.seo.title} onChange={(e) => patch((w) => { w.seo.title = e.target.value; })} /></div>
                <div><Label>Meta description</Label><Textarea rows={3} value={working.seo.description} onChange={(e) => patch((w) => { w.seo.description = e.target.value; })} /></div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="hidden lg:block">
          <Card className="sticky top-24 overflow-hidden">
            <div className="text-xs px-3 py-2 bg-muted border-b">Podgląd na żywo (draft)</div>
            <div className="max-h-[80vh] overflow-y-auto">
              <div className="origin-top-left" style={{ transform: 'scale(0.55)', width: '181%' }}>
                <LandingV2 overrideContent={working} />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomepageEditor;
