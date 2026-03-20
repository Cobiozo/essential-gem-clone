import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Plus, Trash2, GripVertical } from 'lucide-react';

interface Props {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export const SurveySectionEditor: React.FC<Props> = ({ config, onChange }) => {
  const questions: any[] = config.questions || [];
  const recommendations: any[] = config.product_recommendations || [];

  const set = (key: string, value: any) => onChange({ ...config, [key]: value });

  const updateQuestion = (idx: number, patch: Record<string, any>) => {
    const updated = questions.map((q, i) => i === idx ? { ...q, ...patch } : q);
    set('questions', updated);
  };

  const addQuestion = () => {
    set('questions', [...questions, {
      id: `q_${Date.now()}`,
      question: 'Nowe pytanie',
      type: 'single',
      options: [{ label: 'Opcja 1', value: 'opt1', tags: [] }],
    }]);
  };

  const removeQuestion = (idx: number) => {
    set('questions', questions.filter((_, i) => i !== idx));
  };

  const updateOption = (qIdx: number, oIdx: number, patch: Record<string, any>) => {
    const opts = [...(questions[qIdx].options || [])];
    opts[oIdx] = { ...opts[oIdx], ...patch };
    updateQuestion(qIdx, { options: opts });
  };

  const addOption = (qIdx: number) => {
    const opts = [...(questions[qIdx].options || []), { label: 'Nowa opcja', value: `opt_${Date.now()}`, tags: [] }];
    updateQuestion(qIdx, { options: opts });
  };

  const removeOption = (qIdx: number, oIdx: number) => {
    const opts = (questions[qIdx].options || []).filter((_: any, i: number) => i !== oIdx);
    updateQuestion(qIdx, { options: opts });
  };

  const updateRec = (idx: number, patch: Record<string, any>) => {
    const updated = recommendations.map((r, i) => i === idx ? { ...r, ...patch } : r);
    set('product_recommendations', updated);
  };

  const addRec = () => {
    set('product_recommendations', [...recommendations, {
      tags: [],
      product_name: 'Nowy produkt',
      description: '',
      image_url: '',
      link: '',
    }]);
  };

  const removeRec = (idx: number) => {
    set('product_recommendations', recommendations.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-5">
      {/* Global settings */}
      <div className="space-y-3">
        <div>
          <Label className="text-xs">Nagłówek ankiety</Label>
          <Input value={config.heading || ''} onChange={e => set('heading', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Podtytuł</Label>
          <Input value={config.subtitle || ''} onChange={e => set('subtitle', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Anchor ID (kotwica)</Label>
          <Input value={config.anchor_id || ''} onChange={e => set('anchor_id', e.target.value)} placeholder="ankieta" className="h-8 text-xs" />
          <p className="text-[10px] text-muted-foreground mt-1">
            Wpisz ID, np. „ankieta" — użyj w CTA jako #ankieta
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">Kolor tła</Label>
            <Input type="color" value={config.bg_color || '#0a1628'} onChange={e => set('bg_color', e.target.value)} className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Kolor tekstu</Label>
            <Input type="color" value={config.text_color || '#ffffff'} onChange={e => set('text_color', e.target.value)} className="h-8" />
          </div>
          <div>
            <Label className="text-xs">Akcent</Label>
            <Input type="color" value={config.accent_color || '#3b82f6'} onChange={e => set('accent_color', e.target.value)} className="h-8" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Nagłówek wyniku</Label>
          <Input value={config.result_heading || ''} onChange={e => set('result_heading', e.target.value)} className="h-8 text-xs" />
        </div>
        <div>
          <Label className="text-xs">Opis wyniku</Label>
          <Textarea value={config.result_description || ''} onChange={e => set('result_description', e.target.value)} className="text-xs min-h-[60px]" />
        </div>
      </div>

      {/* Questions */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">Pytania ({questions.length})</Label>
          <Button size="sm" variant="outline" onClick={addQuestion} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Dodaj pytanie
          </Button>
        </div>

        <Accordion type="multiple" className="space-y-1">
          {questions.map((q, qi) => (
            <AccordionItem key={q.id || qi} value={`q-${qi}`} className="border rounded-lg px-3">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">
                <div className="flex items-center gap-2 text-left">
                  <GripVertical className="w-3 h-3 opacity-40" />
                  <span className="font-medium">{qi + 1}. {q.question}</span>
                  <span className="text-muted-foreground ml-1">({q.type === 'multiple' ? 'wielokrotny' : 'jednokrotny'})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-3">
                <div>
                  <Label className="text-xs">Treść pytania</Label>
                  <Input value={q.question} onChange={e => updateQuestion(qi, { question: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Typ odpowiedzi</Label>
                  <Select value={q.type || 'single'} onValueChange={v => updateQuestion(qi, { type: v })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Jednokrotny wybór</SelectItem>
                      <SelectItem value="multiple">Wielokrotny wybór</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Options */}
                <div className="space-y-2">
                  <Label className="text-xs">Opcje odpowiedzi</Label>
                  {(q.options || []).map((opt: any, oi: number) => (
                    <div key={oi} className="flex gap-2 items-start p-2 rounded-md border bg-muted/30">
                      <div className="flex-1 space-y-1">
                        <Input
                          placeholder="Etykieta"
                          value={opt.label}
                          onChange={e => updateOption(qi, oi, { label: e.target.value })}
                          className="h-7 text-xs"
                        />
                        <Input
                          placeholder="Tagi (oddzielone przecinkami)"
                          value={(opt.tags || []).join(', ')}
                          onChange={e => updateOption(qi, oi, { tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) })}
                          className="h-7 text-xs"
                        />
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => removeOption(qi, oi)}>
                        <Trash2 className="w-3 h-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => addOption(qi)} className="h-7 text-xs w-full">
                    <Plus className="w-3 h-3 mr-1" /> Dodaj opcję
                  </Button>
                </div>

                <Button size="sm" variant="destructive" onClick={() => removeQuestion(qi)} className="h-7 text-xs">
                  <Trash2 className="w-3 h-3 mr-1" /> Usuń pytanie
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      {/* Product recommendations */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-xs font-semibold">Rekomendacje produktów ({recommendations.length})</Label>
          <Button size="sm" variant="outline" onClick={addRec} className="h-7 text-xs">
            <Plus className="w-3 h-3 mr-1" /> Dodaj produkt
          </Button>
        </div>

        <Accordion type="multiple" className="space-y-1">
          {recommendations.map((r, ri) => (
            <AccordionItem key={ri} value={`r-${ri}`} className="border rounded-lg px-3">
              <AccordionTrigger className="text-xs py-2 hover:no-underline">
                {r.product_name || 'Produkt'}
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pb-3">
                <div>
                  <Label className="text-xs">Nazwa produktu</Label>
                  <Input value={r.product_name || ''} onChange={e => updateRec(ri, { product_name: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Opis</Label>
                  <Textarea value={r.description || ''} onChange={e => updateRec(ri, { description: e.target.value })} className="text-xs min-h-[50px]" />
                </div>
                <div>
                  <Label className="text-xs">URL obrazka</Label>
                  <Input value={r.image_url || ''} onChange={e => updateRec(ri, { image_url: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Link do produktu</Label>
                  <Input value={r.link || ''} onChange={e => updateRec(ri, { link: e.target.value })} className="h-8 text-xs" />
                </div>
                <div>
                  <Label className="text-xs">Tagi (oddzielone przecinkami)</Label>
                  <Input
                    value={(r.tags || []).join(', ')}
                    onChange={e => updateRec(ri, { tags: e.target.value.split(',').map((t: string) => t.trim()).filter(Boolean) })}
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Produkt pojawi się gdy użytkownik zbierze przynajmniej jeden z tych tagów
                  </p>
                </div>
                <Button size="sm" variant="destructive" onClick={() => removeRec(ri)} className="h-7 text-xs">
                  <Trash2 className="w-3 h-3 mr-1" /> Usuń
                </Button>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
};
