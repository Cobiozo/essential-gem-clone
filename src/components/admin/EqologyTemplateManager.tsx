import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Save, Plus, Trash2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { EqologyTemplateData } from '@/types/eqologyTemplate';
import { DEFAULT_EQOLOGY_TEMPLATE } from '@/components/partner-page/templates/eqologyDefaults';

export const EqologyTemplateManager: React.FC = () => {
  const { toast } = useToast();
  const [data, setData] = useState<EqologyTemplateData>(DEFAULT_EQOLOGY_TEMPLATE);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: row } = await supabase
        .from('partner_page_template')
        .select('template_data')
        .limit(1)
        .maybeSingle();

      if (row?.template_data) {
        const td = row.template_data as any;
        if (td.template_type === 'eqology_omega3') {
          setData(td as EqologyTemplateData);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from('partner_page_template')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('partner_page_template')
          .update({ template_data: data as any, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
      } else {
        await supabase
          .from('partner_page_template')
          .insert({ template_data: data as any });
      }

      toast({ title: 'Szablon zapisany', description: 'Zmiany zostały zapisane pomyślnie.' });
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się zapisać szablonu.', variant: 'destructive' });
    }
    setSaving(false);
  };

  const updateSection = <K extends keyof EqologyTemplateData['sections']>(
    section: K,
    field: string,
    value: any
  ) => {
    setData(prev => ({
      ...prev,
      sections: {
        ...prev.sections,
        [section]: {
          ...prev.sections[section],
          [field]: value,
        },
      },
    }));
  };

  const updateTheme = (field: string, value: string) => {
    setData(prev => ({
      ...prev,
      theme: { ...prev.theme, [field]: value },
    }));
  };

  const resetToDefaults = () => {
    setData(DEFAULT_EQOLOGY_TEMPLATE);
    toast({ title: 'Przywrócono domyślne', description: 'Szablon został zresetowany do wartości domyślnych.' });
  };

  if (loading) {
    return <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>;
  }

  const s = data.sections;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold">Szablon Eqology Omega-3</h3>
          <p className="text-sm text-muted-foreground">Edytuj treści landing page dla partnerów</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
          <Button onClick={save} disabled={saving} size="sm">
            <Save className="w-4 h-4 mr-1" /> {saving ? 'Zapisuję...' : 'Zapisz szablon'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="hero">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="problem">Problem</TabsTrigger>
          <TabsTrigger value="scale">Skala</TabsTrigger>
          <TabsTrigger value="howItWorks">Jak działa</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="guarantee">Gwarancja</TabsTrigger>
          <TabsTrigger value="socialProof">Social Proof</TabsTrigger>
          <TabsTrigger value="products">Produkty</TabsTrigger>
          <TabsTrigger value="faq">FAQ</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="theme">Kolory</TabsTrigger>
        </TabsList>

        {/* HERO */}
        <TabsContent value="hero">
          <Card>
            <CardHeader><CardTitle>Sekcja Hero</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Tytuł główny</Label><Input value={s.hero.title} onChange={e => updateSection('hero', 'title', e.target.value)} /></div>
              <div><Label>Podtytuł</Label><Input value={s.hero.subtitle} onChange={e => updateSection('hero', 'subtitle', e.target.value)} /></div>
              <div><Label>Opis</Label><Textarea value={s.hero.description} onChange={e => updateSection('hero', 'description', e.target.value)} /></div>
              <div><Label>URL obrazka tła</Label><Input value={s.hero.bgImageUrl} onChange={e => updateSection('hero', 'bgImageUrl', e.target.value)} /></div>
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tekst CTA główny</Label><Input value={s.hero.ctaPrimaryText} onChange={e => updateSection('hero', 'ctaPrimaryText', e.target.value)} /></div>
                <div><Label>Tekst CTA drugorzędny</Label><Input value={s.hero.ctaSecondaryText} onChange={e => updateSection('hero', 'ctaSecondaryText', e.target.value)} /></div>
              </div>
              <div><Label>URL CTA drugorzędny</Label><Input value={s.hero.ctaSecondaryUrl} onChange={e => updateSection('hero', 'ctaSecondaryUrl', e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PROBLEM */}
        <TabsContent value="problem">
          <Card>
            <CardHeader><CardTitle>Sekcja Problem</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Tytuł</Label><Input value={s.problem.title} onChange={e => updateSection('problem', 'title', e.target.value)} /></div>
              <Label>Punkty problemów</Label>
              {s.problem.items.map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input value={item} onChange={e => {
                    const items = [...s.problem.items];
                    items[i] = e.target.value;
                    updateSection('problem', 'items', items);
                  }} />
                  <Button variant="ghost" size="icon" onClick={() => {
                    updateSection('problem', 'items', s.problem.items.filter((_, idx) => idx !== i));
                  }}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => updateSection('problem', 'items', [...s.problem.items, ''])}>
                <Plus className="w-4 h-4 mr-1" /> Dodaj punkt
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SCALE */}
        <TabsContent value="scale">
          <Card>
            <CardHeader><CardTitle>Sekcja Skala</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Tytuł</Label><Input value={s.scale.title} onChange={e => updateSection('scale', 'title', e.target.value)} /></div>
              <div><Label>Statystyka (np. 9/10)</Label><Input value={s.scale.stat} onChange={e => updateSection('scale', 'stat', e.target.value)} /></div>
              <div><Label>Opis</Label><Textarea value={s.scale.description} onChange={e => updateSection('scale', 'description', e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HOW IT WORKS */}
        <TabsContent value="howItWorks">
          <Card>
            <CardHeader><CardTitle>Jak to działa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Tytuł</Label><Input value={s.howItWorks.title} onChange={e => updateSection('howItWorks', 'title', e.target.value)} /></div>
              <div><Label>URL wideo</Label><Input value={s.howItWorks.videoUrl} onChange={e => updateSection('howItWorks', 'videoUrl', e.target.value)} /></div>
              <Separator />
              <Label>Kroki</Label>
              {s.howItWorks.steps.map((step, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Ikona</Label><Input value={step.icon} onChange={e => {
                      const steps = [...s.howItWorks.steps];
                      steps[i] = { ...steps[i], icon: e.target.value };
                      updateSection('howItWorks', 'steps', steps);
                    }} placeholder="Package, Droplets, FlaskConical" /></div>
                    <div><Label className="text-xs">Tytuł</Label><Input value={step.title} onChange={e => {
                      const steps = [...s.howItWorks.steps];
                      steps[i] = { ...steps[i], title: e.target.value };
                      updateSection('howItWorks', 'steps', steps);
                    }} /></div>
                  </div>
                  <div><Label className="text-xs">Opis</Label><Input value={step.description} onChange={e => {
                    const steps = [...s.howItWorks.steps];
                    steps[i] = { ...steps[i], description: e.target.value };
                    updateSection('howItWorks', 'steps', steps);
                  }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader><CardTitle>Proces 6-miesięczny</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Tytuł</Label><Input value={s.timeline.title} onChange={e => updateSection('timeline', 'title', e.target.value)} /></div>
              <Label>Kamienie milowe</Label>
              {s.timeline.milestones.map((ms, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Miesiąc</Label><Input value={ms.month} onChange={e => {
                      const arr = [...s.timeline.milestones];
                      arr[i] = { ...arr[i], month: e.target.value };
                      updateSection('timeline', 'milestones', arr);
                    }} /></div>
                    <div><Label className="text-xs">Tytuł</Label><Input value={ms.title} onChange={e => {
                      const arr = [...s.timeline.milestones];
                      arr[i] = { ...arr[i], title: e.target.value };
                      updateSection('timeline', 'milestones', arr);
                    }} /></div>
                  </div>
                  <div><Label className="text-xs">Opis</Label><Input value={ms.description} onChange={e => {
                    const arr = [...s.timeline.milestones];
                    arr[i] = { ...arr[i], description: e.target.value };
                    updateSection('timeline', 'milestones', arr);
                  }} /></div>
                  <Button variant="ghost" size="sm" onClick={() => updateSection('timeline', 'milestones', s.timeline.milestones.filter((_, idx) => idx !== i))}>
                    <Trash2 className="w-3 h-3 mr-1" /> Usuń
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => updateSection('timeline', 'milestones', [...s.timeline.milestones, { month: '', title: '', description: '' }])}>
                <Plus className="w-4 h-4 mr-1" /> Dodaj milestone
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* GUARANTEE */}
        <TabsContent value="guarantee">
          <Card>
            <CardHeader><CardTitle>Gwarancja</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Tytuł</Label><Input value={s.guarantee.title} onChange={e => updateSection('guarantee', 'title', e.target.value)} /></div>
              <div><Label>Opis</Label><Textarea value={s.guarantee.description} onChange={e => updateSection('guarantee', 'description', e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SOCIAL PROOF */}
        <TabsContent value="socialProof">
          <Card>
            <CardHeader><CardTitle>Social Proof</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Tytuł</Label><Input value={s.socialProof.title} onChange={e => updateSection('socialProof', 'title', e.target.value)} /></div>
              <Label>Wyniki Before/After</Label>
              {s.socialProof.items.map((item, i) => (
                <div key={i} className="border rounded-lg p-3 grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Imię</Label><Input value={item.name} onChange={e => {
                    const arr = [...s.socialProof.items];
                    arr[i] = { ...arr[i], name: e.target.value };
                    updateSection('socialProof', 'items', arr);
                  }} /></div>
                  <div><Label className="text-xs">Przed</Label><Input value={item.beforeRatio} onChange={e => {
                    const arr = [...s.socialProof.items];
                    arr[i] = { ...arr[i], beforeRatio: e.target.value };
                    updateSection('socialProof', 'items', arr);
                  }} /></div>
                  <div><Label className="text-xs">Po</Label><Input value={item.afterRatio} onChange={e => {
                    const arr = [...s.socialProof.items];
                    arr[i] = { ...arr[i], afterRatio: e.target.value };
                    updateSection('socialProof', 'items', arr);
                  }} /></div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => updateSection('socialProof', 'items', [...s.socialProof.items, { name: '', beforeRatio: '', afterRatio: '' }])}>
                <Plus className="w-4 h-4 mr-1" /> Dodaj wynik
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PRODUCTS */}
        <TabsContent value="products">
          <Card>
            <CardHeader><CardTitle>Produkty</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Tytuł sekcji</Label><Input value={s.products.title} onChange={e => updateSection('products', 'title', e.target.value)} /></div>
              <Separator />
              {s.products.products.map((prod, i) => (
                <div key={i} className="border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Nazwa</Label><Input value={prod.name} onChange={e => {
                      const arr = [...s.products.products];
                      arr[i] = { ...arr[i], name: e.target.value };
                      updateSection('products', 'products', arr);
                    }} /></div>
                    <div><Label className="text-xs">Tier (Silver/Gold/Green)</Label><Input value={prod.tier} onChange={e => {
                      const arr = [...s.products.products];
                      arr[i] = { ...arr[i], tier: e.target.value };
                      updateSection('products', 'products', arr);
                    }} /></div>
                  </div>
                  <div><Label className="text-xs">Opis</Label><Textarea rows={2} value={prod.description} onChange={e => {
                    const arr = [...s.products.products];
                    arr[i] = { ...arr[i], description: e.target.value };
                    updateSection('products', 'products', arr);
                  }} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">URL obrazka</Label><Input value={prod.imageUrl} onChange={e => {
                      const arr = [...s.products.products];
                      arr[i] = { ...arr[i], imageUrl: e.target.value };
                      updateSection('products', 'products', arr);
                    }} /></div>
                    <div><Label className="text-xs">Domyślny URL CTA</Label><Input value={prod.defaultCtaUrl} onChange={e => {
                      const arr = [...s.products.products];
                      arr[i] = { ...arr[i], defaultCtaUrl: e.target.value };
                      updateSection('products', 'products', arr);
                    }} /></div>
                  </div>
                  <div><Label className="text-xs">Składniki</Label><Textarea rows={2} value={prod.ingredients} onChange={e => {
                    const arr = [...s.products.products];
                    arr[i] = { ...arr[i], ingredients: e.target.value };
                    updateSection('products', 'products', arr);
                  }} /></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ */}
        <TabsContent value="faq">
          <Card>
            <CardHeader><CardTitle>FAQ</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Tytuł</Label><Input value={s.faq.title} onChange={e => updateSection('faq', 'title', e.target.value)} /></div>
              <Label>Pytania i odpowiedzi</Label>
              {s.faq.items.map((item, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div><Label className="text-xs">Pytanie</Label><Input value={item.question} onChange={e => {
                    const arr = [...s.faq.items];
                    arr[i] = { ...arr[i], question: e.target.value };
                    updateSection('faq', 'items', arr);
                  }} /></div>
                  <div><Label className="text-xs">Odpowiedź</Label><Textarea rows={2} value={item.answer} onChange={e => {
                    const arr = [...s.faq.items];
                    arr[i] = { ...arr[i], answer: e.target.value };
                    updateSection('faq', 'items', arr);
                  }} /></div>
                  <Button variant="ghost" size="sm" onClick={() => updateSection('faq', 'items', s.faq.items.filter((_, idx) => idx !== i))}>
                    <Trash2 className="w-3 h-3 mr-1" /> Usuń
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => updateSection('faq', 'items', [...s.faq.items, { question: '', answer: '' }])}>
                <Plus className="w-4 h-4 mr-1" /> Dodaj pytanie
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FOOTER */}
        <TabsContent value="footer">
          <Card>
            <CardHeader><CardTitle>Footer / Ankieta</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Tytuł</Label><Input value={s.footerSurvey.title} onChange={e => updateSection('footerSurvey', 'title', e.target.value)} /></div>
              <div><Label>Opis</Label><Textarea value={s.footerSurvey.description} onChange={e => updateSection('footerSurvey', 'description', e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label>Tekst CTA</Label><Input value={s.footerSurvey.ctaText} onChange={e => updateSection('footerSurvey', 'ctaText', e.target.value)} /></div>
                <div><Label>URL CTA</Label><Input value={s.footerSurvey.ctaUrl} onChange={e => updateSection('footerSurvey', 'ctaUrl', e.target.value)} /></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* THEME */}
        <TabsContent value="theme">
          <Card>
            <CardHeader><CardTitle>Kolorystyka i czcionki</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Kolor główny (Deep Sea Blue)</Label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={data.theme.primaryColor} onChange={e => updateTheme('primaryColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                    <Input value={data.theme.primaryColor} onChange={e => updateTheme('primaryColor', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Kolor akcentowy (Gold)</Label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={data.theme.accentColor} onChange={e => updateTheme('accentColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                    <Input value={data.theme.accentColor} onChange={e => updateTheme('accentColor', e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tło główne</Label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={data.theme.bgColor} onChange={e => updateTheme('bgColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                    <Input value={data.theme.bgColor} onChange={e => updateTheme('bgColor', e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Tło alternatywne</Label>
                  <div className="flex gap-2 mt-1">
                    <input type="color" value={data.theme.bgAlt} onChange={e => updateTheme('bgAlt', e.target.value)} className="w-10 h-10 rounded cursor-pointer" />
                    <Input value={data.theme.bgAlt} onChange={e => updateTheme('bgAlt', e.target.value)} />
                  </div>
                </div>
              </div>
              <div><Label>Czcionka</Label><Input value={data.theme.fontFamily} onChange={e => updateTheme('fontFamily', e.target.value)} /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
