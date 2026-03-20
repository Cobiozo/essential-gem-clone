import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_SECTION_CONFIGS } from './template-preview/defaultSectionConfigs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { SurveySectionEditor } from './template-sections/SurveySectionEditor';
import { SurveySection } from '@/components/partner-page/sections';
import { AlertElement } from '@/components/elements/AlertElement';
import { toast } from 'sonner';
import { Save, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface TemplateOption {
  id: string;
  name: string;
  is_active: boolean;
}

export const SurveyManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [surveyConfig, setSurveyConfig] = useState<Record<string, any>>({});
  const [templateData, setTemplateData] = useState<any[]>([]);
  const [surveyExists, setSurveyExists] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplateId) {
      loadSurveyForTemplate(selectedTemplateId);
    }
  }, [selectedTemplateId]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('partner_page_template')
      .select('id, name, is_active')
      .order('position', { ascending: true });

    if (error || !data || data.length === 0) {
      toast.error('Nie udało się załadować szablonów');
      setLoading(false);
      return;
    }

    setTemplates(data);
    // Default to first active template, or first template
    const active = data.find(t => t.is_active) || data[0];
    setSelectedTemplateId(active.id);
  };

  const loadSurveyForTemplate = async (templateId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('partner_page_template')
      .select('id, template_data')
      .eq('id', templateId)
      .single();

    if (error || !data) {
      toast.error('Nie udało się załadować szablonu');
      setLoading(false);
      return;
    }

    const elements = (data.template_data as any[]) || [];
    setTemplateData(elements);

    const surveyElement = elements.find((el: any) => el.type === 'survey');
    setSurveyConfig(surveyElement?.config || DEFAULT_SECTION_CONFIGS.survey);
    setSurveyExists(!!surveyElement);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!selectedTemplateId) return;
    setSaving(true);

    const surveyIdx = templateData.findIndex((el: any) => el.type === 'survey');
    let updatedData = [...templateData];

    if (surveyIdx >= 0) {
      updatedData[surveyIdx] = { ...updatedData[surveyIdx], config: surveyConfig };
    } else {
      updatedData.push({
        id: `survey_${Date.now()}`,
        type: 'survey',
        label: 'Ankieta zdrowotna',
        position: updatedData.length,
        config: { ...surveyConfig, anchor_id: 'ankieta' },
      });
    }

    const { error } = await supabase
      .from('partner_page_template')
      .update({ template_data: updatedData as any })
      .eq('id', selectedTemplateId);

    setSaving(false);
    if (error) {
      toast.error('Błąd zapisu ankiety');
    } else {
      setTemplateData(updatedData);
      setSurveyExists(true);
      toast.success('Ankieta zapisana');
    }
  };

  const selectedTemplateName = templates.find(t => t.id === selectedTemplateId)?.name;

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-wrap gap-3">
        <div>
          <CardTitle className="text-lg">Ankieta zdrowotna</CardTitle>
          <CardDescription>Zarządzaj pytaniami, opcjami i rekomendacjami produktów</CardDescription>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {templates.length > 1 && (
            <Select value={selectedTemplateId || ''} onValueChange={setSelectedTemplateId}>
              <SelectTrigger className="w-[200px] h-9 text-sm">
                <SelectValue placeholder="Wybierz szablon" />
              </SelectTrigger>
              <SelectContent>
                {templates.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} {t.is_active && <Badge variant="outline" className="ml-1 text-[10px]">aktywny</Badge>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {templates.length === 1 && selectedTemplateName && (
            <Badge variant="secondary" className="text-xs">Szablon: {selectedTemplateName}</Badge>
          )}
          <Button onClick={() => setShowPreview(!showPreview)} variant="outline" size="sm">
            {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
            {showPreview ? 'Edytor' : 'Podgląd'}
          </Button>
          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save className="w-4 h-4 mr-1" />
            {saving ? 'Zapisywanie...' : 'Zapisz'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!surveyExists && !showPreview && (
          <AlertElement
            variant="info"
            title="Ankieta nie jest jeszcze aktywna w tym szablonie"
            content={`Kliknij „Zapisz", aby dodać ankietę do szablonu "${selectedTemplateName || ''}". Sekcja będzie widoczna pod kotwicą #ankieta.`}
          />
        )}
        {showPreview ? (
          <div className="rounded-xl overflow-hidden border border-border">
            <SurveySection config={surveyConfig} />
          </div>
        ) : (
          <SurveySectionEditor config={surveyConfig} onChange={setSurveyConfig} />
        )}
      </CardContent>
    </Card>
  );
};
