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

export const SurveyManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [surveyConfig, setSurveyConfig] = useState<Record<string, any>>({});
  const [templateData, setTemplateData] = useState<any[]>([]);
  const [surveyExists, setSurveyExists] = useState(true);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadSurvey();
  }, []);

  const loadSurvey = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('partner_page_template')
      .select('id, template_data')
      .order('position', { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      toast.error('Nie udało się załadować szablonu');
      setLoading(false);
      return;
    }

    setTemplateId(data.id);
    const elements = (data.template_data as any[]) || [];
    setTemplateData(elements);

    const surveyElement = elements.find((el: any) => el.type === 'survey');
    setSurveyConfig(surveyElement?.config || DEFAULT_SECTION_CONFIGS.survey);
    setSurveyExists(!!surveyElement);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!templateId) return;
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
        config: surveyConfig,
      });
    }

    const { error } = await supabase
      .from('partner_page_template')
      .update({ template_data: updatedData as any })
      .eq('id', templateId);

    setSaving(false);
    if (error) {
      toast.error('Błąd zapisu ankiety');
    } else {
      setTemplateData(updatedData);
      setSurveyExists(true);
      toast.success('Ankieta zapisana');
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-lg">Ankieta zdrowotna</CardTitle>
          <CardDescription>Zarządzaj pytaniami, opcjami i rekomendacjami produktów</CardDescription>
        </div>
        <Button onClick={() => setShowPreview(!showPreview)} variant="outline" size="sm">
          {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
          {showPreview ? 'Edytor' : 'Podgląd'}
        </Button>
        <Button onClick={handleSave} disabled={saving} size="sm">
          <Save className="w-4 h-4 mr-1" />
          {saving ? 'Zapisywanie...' : 'Zapisz'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {!surveyExists && !showPreview && (
          <AlertElement
            variant="info"
            title="Ankieta nie jest jeszcze aktywna"
            content={'Kliknij „Zapisz", aby dodać ankietę do szablonu stron partnerów. Dopiero po zapisie sekcja będzie widoczna i dostępna pod kotwicą #ankieta.'}
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
