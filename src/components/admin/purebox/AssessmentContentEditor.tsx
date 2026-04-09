import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Save, RotateCcw, Loader2 } from 'lucide-react';
import { useAssessmentSteps, useSavePureBoxContent } from '@/hooks/usePureBoxContent';
import { ASSESSMENT_STEPS, type AssessmentStepData } from '@/components/skills-assessment/assessmentData';

export const AssessmentContentEditor: React.FC = () => {
  const { steps, isLoading } = useAssessmentSteps();
  const saveMutation = useSavePureBoxContent();
  const [editSteps, setEditSteps] = useState<AssessmentStepData[]>([]);

  useEffect(() => {
    if (!isLoading) {
      setEditSteps(JSON.parse(JSON.stringify(steps)));
    }
  }, [steps, isLoading]);

  const updateStep = (idx: number, field: keyof AssessmentStepData, value: string) => {
    setEditSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const updateRange = (stepIdx: number, rangeIdx: number, field: string, value: string) => {
    setEditSteps(prev => prev.map((s, i) => {
      if (i !== stepIdx) return s;
      const ranges = [...s.ranges];
      ranges[rangeIdx] = { ...ranges[rangeIdx], [field]: value };
      return { ...s, ranges };
    }));
  };

  const handleSave = () => {
    saveMutation.mutate({ key: 'assessment_steps', data: editSteps });
  };

  const handleReset = () => {
    setEditSteps(JSON.parse(JSON.stringify(ASSESSMENT_STEPS)));
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edycja pytań Oceny Umiejętności</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Accordion type="single" collapsible className="space-y-2">
          {editSteps.map((step, idx) => (
            <AccordionItem key={step.key} value={step.key} className="border rounded-lg px-4">
              <AccordionTrigger className="text-sm font-medium">
                {idx + 1}. {step.title || '(bez tytułu)'}
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="grid gap-3">
                  <div>
                    <Label className="text-xs">Klucz</Label>
                    <Input value={step.key} disabled className="text-xs bg-muted" />
                  </div>
                  <div>
                    <Label className="text-xs">Tytuł</Label>
                    <Input
                      value={step.title}
                      onChange={(e) => updateStep(idx, 'title', e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Opis</Label>
                    <Textarea
                      value={step.description}
                      onChange={(e) => updateStep(idx, 'description', e.target.value)}
                      className="text-sm min-h-[80px]"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kolor wykresu (HSL)</Label>
                    <Input
                      value={step.chartColor}
                      onChange={(e) => updateStep(idx, 'chartColor', e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Zakresy ocen</Label>
                  {step.ranges.map((range, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-2 gap-2 p-3 border rounded-lg bg-muted/30">
                      <div>
                        <Label className="text-[10px]">Zakres</Label>
                        <Input
                          value={range.range}
                          onChange={(e) => updateRange(idx, rIdx, 'range', e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Etykieta</Label>
                        <Input
                          value={range.label}
                          onChange={(e) => updateRange(idx, rIdx, 'label', e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-[10px]">Opis</Label>
                        <Textarea
                          value={range.description}
                          onChange={(e) => updateRange(idx, rIdx, 'description', e.target.value)}
                          className="text-xs min-h-[50px]"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px]">Kolor (HSL)</Label>
                        <Input
                          value={range.color}
                          onChange={(e) => updateRange(idx, rIdx, 'color', e.target.value)}
                          className="text-xs h-8"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="flex gap-2 pt-4">
          <Button onClick={handleSave} disabled={saveMutation.isPending} className="gap-2">
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Zapisz zmiany
          </Button>
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Przywróć domyślne
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
