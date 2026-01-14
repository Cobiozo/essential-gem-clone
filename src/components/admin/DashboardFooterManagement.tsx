import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Users, Check, Mail, Pencil, Save, Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { IconPicker } from '@/components/cms/IconPicker';
import dropletIcon from '@/assets/pure-life-droplet.png';

interface DashboardFooterSettings {
  id: string;
  quote_text: string;
  mission_statement: string;
  team_title: string;
  team_description: string;
  feature_1_icon: string;
  feature_1_title: string;
  feature_1_description: string;
  feature_2_icon: string;
  feature_2_title: string;
  feature_2_description: string;
  feature_3_icon: string;
  feature_3_title: string;
  feature_3_description: string;
  contact_title: string;
  contact_description: string;
  contact_reminder: string;
  contact_email_label: string;
  contact_email_address: string;
  contact_icon: string;
}

// Dynamic icon renderer
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const Icon = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <Icon className={className} />;
};

// Editable text component with popover
const EditableText: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label: string;
  multiline?: boolean;
  className?: string;
  children: React.ReactNode;
}> = ({ value, onChange, label, multiline = false, className, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleSave = () => {
    onChange(localValue);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={`cursor-pointer hover:opacity-80 transition-opacity group relative ${className || ''}`}>
          {children}
          <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
              <Pencil className="w-3 h-3 text-primary-foreground" />
            </div>
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <Label>{label}</Label>
          {multiline ? (
            <Textarea
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
              rows={4}
              className="resize-none"
            />
          ) : (
            <Input
              value={localValue}
              onChange={(e) => setLocalValue(e.target.value)}
            />
          )}
          <Button size="sm" onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Zapisz
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Editable feature card component
const EditableFeatureCard: React.FC<{
  icon: string;
  title: string;
  description: string;
  onIconChange: (icon: string) => void;
  onTitleChange: (title: string) => void;
  onDescriptionChange: (description: string) => void;
}> = ({ icon, title, description, onIconChange, onTitleChange, onDescriptionChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [localDescription, setLocalDescription] = useState(description);

  useEffect(() => {
    setLocalTitle(title);
    setLocalDescription(description);
  }, [title, description]);

  const handleSave = () => {
    onTitleChange(localTitle);
    onDescriptionChange(localDescription);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col items-center">
      {/* Icon with picker */}
      <IconPicker
        value={icon}
        onChange={(newIcon) => onIconChange(newIcon || 'HelpCircle')}
        trigger={
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center mb-3 cursor-pointer hover:opacity-80 transition-opacity group relative">
            <DynamicIcon name={icon} className="w-8 h-8 text-primary-foreground" />
            <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
                <Pencil className="w-3 h-3 text-secondary-foreground" />
              </div>
            </div>
          </div>
        }
      />
      
      {/* Title and description with popover */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="cursor-pointer hover:opacity-80 transition-opacity group relative text-center">
            <h4 className="font-semibold mb-1 text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground max-w-[200px]">{description}</p>
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                <Pencil className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72" align="center">
          <div className="space-y-3">
            <div>
              <Label>Tytuł</Label>
              <Input
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
              />
            </div>
            <div>
              <Label>Opis</Label>
              <Textarea
                value={localDescription}
                onChange={(e) => setLocalDescription(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
            <Button size="sm" onClick={handleSave} className="w-full">
              <Save className="w-4 h-4 mr-2" />
              Zapisz
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export const DashboardFooterManagement: React.FC = () => {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [settings, setSettings] = useState<DashboardFooterSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_footer_settings')
        .select('*')
        .limit(1)
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching dashboard footer settings:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się pobrać ustawień stopki dashboardu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Update a single field
  const updateField = async (field: keyof DashboardFooterSettings, value: string) => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('dashboard_footer_settings')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', settings.id);

      if (error) throw error;

      setSettings((prev) => prev ? { ...prev, [field]: value } : null);
      toast({
        title: 'Zapisano',
        description: 'Zmiany zostały zapisane.',
      });
    } catch (error) {
      console.error('Error updating field:', error);
      toast({
        title: 'Błąd',
        description: 'Nie udało się zapisać zmian.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Nie znaleziono ustawień stopki dashboardu.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Stopka Dashboardu
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
        </CardTitle>
        <CardDescription>
          Edytuj zawartość sekcji wyświetlanej na dole dashboardu. Kliknij na dowolny element, aby go edytować.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* WYSIWYG Preview */}
        <div className="border rounded-lg p-6 bg-background space-y-12">
          
          {/* Quote section */}
          <section className="text-center py-8">
            <EditableText
              value={settings.quote_text}
              onChange={(v) => updateField('quote_text', v)}
              label="Cytat"
              className="inline-block"
            >
              <h2 className="text-3xl font-bold italic mb-4 text-foreground">
                "{settings.quote_text}"
              </h2>
            </EditableText>
            <EditableText
              value={settings.mission_statement}
              onChange={(v) => updateField('mission_statement', v)}
              label="Oświadczenie misji"
              multiline
              className="inline-block"
            >
              <p className="text-muted-foreground max-w-3xl mx-auto text-sm leading-relaxed">
                "{settings.mission_statement}"
              </p>
            </EditableText>
          </section>

          {/* Team section */}
          <section className="text-center py-8 bg-muted/30 rounded-lg">
            <EditableText
              value={settings.team_title}
              onChange={(v) => updateField('team_title', v)}
              label="Tytuł sekcji zespołu"
              className="inline-block"
            >
              <h3 className="text-2xl font-bold mb-2 text-foreground">{settings.team_title}</h3>
            </EditableText>
            <EditableText
              value={settings.team_description}
              onChange={(v) => updateField('team_description', v)}
              label="Opis zespołu"
              multiline
              className="inline-block"
            >
              <p className="text-muted-foreground text-sm max-w-2xl mx-auto mb-8">
                {settings.team_description}
              </p>
            </EditableText>
            
            {/* Feature cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 px-4">
              <EditableFeatureCard
                icon={settings.feature_1_icon}
                title={settings.feature_1_title}
                description={settings.feature_1_description}
                onIconChange={(v) => updateField('feature_1_icon', v)}
                onTitleChange={(v) => updateField('feature_1_title', v)}
                onDescriptionChange={(v) => updateField('feature_1_description', v)}
              />
              <EditableFeatureCard
                icon={settings.feature_2_icon}
                title={settings.feature_2_title}
                description={settings.feature_2_description}
                onIconChange={(v) => updateField('feature_2_icon', v)}
                onTitleChange={(v) => updateField('feature_2_title', v)}
                onDescriptionChange={(v) => updateField('feature_2_description', v)}
              />
              <EditableFeatureCard
                icon={settings.feature_3_icon}
                title={settings.feature_3_title}
                description={settings.feature_3_description}
                onIconChange={(v) => updateField('feature_3_icon', v)}
                onTitleChange={(v) => updateField('feature_3_title', v)}
                onDescriptionChange={(v) => updateField('feature_3_description', v)}
              />
            </div>
          </section>

          {/* Contact section */}
          <section className="text-center py-8">
            <EditableText
              value={settings.contact_title}
              onChange={(v) => updateField('contact_title', v)}
              label="Tytuł kontaktu"
              className="inline-block"
            >
              <h3 className="text-2xl font-bold uppercase tracking-wide mb-4 text-foreground">
                {settings.contact_title}
              </h3>
            </EditableText>
            <EditableText
              value={settings.contact_description}
              onChange={(v) => updateField('contact_description', v)}
              label="Opis kontaktu"
              className="inline-block"
            >
              <p className="text-muted-foreground text-sm mb-4">
                {settings.contact_description}
              </p>
            </EditableText>
            <EditableText
              value={settings.contact_reminder}
              onChange={(v) => updateField('contact_reminder', v)}
              label="Przypomnienie"
              multiline
              className="inline-block"
            >
              <p className="text-xs text-muted-foreground mb-6 max-w-md mx-auto">
                {settings.contact_reminder}
              </p>
            </EditableText>
            
            <div className="flex flex-col items-center">
              <IconPicker
                value={settings.contact_icon}
                onChange={(v) => updateField('contact_icon', v || 'Mail')}
                trigger={
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center mb-3 cursor-pointer hover:opacity-80 transition-opacity group relative">
                    <DynamicIcon name={settings.contact_icon} className="w-7 h-7 text-primary-foreground" />
                    <div className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-5 h-5 bg-secondary rounded-full flex items-center justify-center">
                        <Pencil className="w-3 h-3 text-secondary-foreground" />
                      </div>
                    </div>
                  </div>
                }
              />
              <EditableText
                value={settings.contact_email_label}
                onChange={(v) => updateField('contact_email_label', v)}
                label="Etykieta e-mail"
                className="inline-block"
              >
                <span className="font-semibold text-sm text-foreground">{settings.contact_email_label}</span>
              </EditableText>
              <EditableText
                value={settings.contact_email_address}
                onChange={(v) => updateField('contact_email_address', v)}
                label="Adres e-mail"
                className="inline-block mt-1"
              >
                <span className="text-primary hover:underline text-sm">
                  {settings.contact_email_address}
                </span>
              </EditableText>
            </div>
          </section>

          {/* Footer preview (read-only) */}
          <footer className="border-t border-border pt-4 pb-2 flex flex-col md:flex-row items-center justify-between text-xs text-muted-foreground gap-2">
            <div className="flex items-center gap-2">
              <img src={dropletIcon} alt="" className="w-5 h-5" />
              <span className="text-primary font-bold">PURE LIFE</span>
            </div>
            <span>© {new Date().getFullYear()} Pure Life. Wszelkie prawa zastrzeżone.</span>
            <div className="flex gap-4">
              <span className="text-muted-foreground">Polityka prywatności</span>
              <span>•</span>
              <span className="text-muted-foreground">Regulamin</span>
            </div>
          </footer>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardFooterManagement;
