import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Save, Mail, Phone, Clock, Info, FileText, MessageSquare, ChevronDown, Loader2 } from 'lucide-react';
import { IconPicker } from '@/components/cms/IconPicker';

interface SupportSettings {
  id: string;
  header_title: string;
  header_description: string;
  email_address: string;
  email_label: string;
  email_icon: string;
  phone_number: string;
  phone_label: string;
  phone_icon: string;
  working_hours: string;
  working_hours_label: string;
  working_hours_icon: string;
  info_box_title: string;
  info_box_content: string;
  info_box_icon: string;
  form_title: string;
  name_label: string;
  name_placeholder: string;
  email_field_label: string;
  email_placeholder: string;
  subject_label: string;
  subject_placeholder: string;
  message_label: string;
  message_placeholder: string;
  submit_button_text: string;
  success_message: string;
  error_message: string;
  is_active: boolean;
}

export const SupportSettingsManagement: React.FC = () => {
  const [settings, setSettings] = useState<SupportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Collapsible sections state
  const [headerOpen, setHeaderOpen] = useState(true);
  const [cardsOpen, setCardsOpen] = useState(true);
  const [infoBoxOpen, setInfoBoxOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(true);
  const [messagesOpen, setMessagesOpen] = useState(true);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('support_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setSettings(data);
      } else {
        // Create default settings if none exist
        const { data: newData, error: insertError } = await supabase
          .from('support_settings')
          .insert({})
          .select()
          .single();
        
        if (insertError) throw insertError;
        setSettings(newData);
      }
    } catch (error) {
      console.error('Error fetching support settings:', error);
      toast.error('Błąd podczas pobierania ustawień');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('support_settings')
        .update({
          header_title: settings.header_title,
          header_description: settings.header_description,
          email_address: settings.email_address,
          email_label: settings.email_label,
          email_icon: settings.email_icon,
          phone_number: settings.phone_number,
          phone_label: settings.phone_label,
          phone_icon: settings.phone_icon,
          working_hours: settings.working_hours,
          working_hours_label: settings.working_hours_label,
          working_hours_icon: settings.working_hours_icon,
          info_box_title: settings.info_box_title,
          info_box_content: settings.info_box_content,
          info_box_icon: settings.info_box_icon,
          form_title: settings.form_title,
          name_label: settings.name_label,
          name_placeholder: settings.name_placeholder,
          email_field_label: settings.email_field_label,
          email_placeholder: settings.email_placeholder,
          subject_label: settings.subject_label,
          subject_placeholder: settings.subject_placeholder,
          message_label: settings.message_label,
          message_placeholder: settings.message_placeholder,
          submit_button_text: settings.submit_button_text,
          success_message: settings.success_message,
          error_message: settings.error_message,
          is_active: settings.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;

      toast.success('Ustawienia zapisane');
    } catch (error) {
      console.error('Error saving support settings:', error);
      toast.error('Błąd podczas zapisywania ustawień');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof SupportSettings, value: string | boolean) => {
    if (!settings) return;
    setSettings({ ...settings, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nie znaleziono ustawień
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Wsparcie i pomoc</h2>
          <p className="text-muted-foreground">
            Zarządzaj treściami formularza kontaktowego wsparcia technicznego
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Zapisywanie...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Zapisz zmiany
            </>
          )}
        </Button>
      </div>

      {/* Header Section */}
      <Collapsible open={headerOpen} onOpenChange={setHeaderOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Nagłówek</CardTitle>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${headerOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tytuł</Label>
                <Input
                  value={settings.header_title}
                  onChange={(e) => updateField('header_title', e.target.value)}
                  placeholder="Wsparcie techniczne"
                />
              </div>
              <div className="space-y-2">
                <Label>Opis</Label>
                <Textarea
                  value={settings.header_description}
                  onChange={(e) => updateField('header_description', e.target.value)}
                  placeholder="Masz pytania? Skontaktuj się z naszym zespołem wsparcia."
                  rows={2}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Info Cards Section */}
      <Collapsible open={cardsOpen} onOpenChange={setCardsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Karty informacyjne</CardTitle>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${cardsOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-6">
              {/* Email Card */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" /> Karta Email
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Etykieta</Label>
                    <Input
                      value={settings.email_label}
                      onChange={(e) => updateField('email_label', e.target.value)}
                      placeholder="Email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Adres email</Label>
                    <Input
                      value={settings.email_address}
                      onChange={(e) => updateField('email_address', e.target.value)}
                      placeholder="support@purelife.info.pl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ikona</Label>
                    <IconPicker
                      value={settings.email_icon}
                      onChange={(icon) => updateField('email_icon', icon || 'Mail')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Phone Card */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Karta Telefon
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Etykieta</Label>
                    <Input
                      value={settings.phone_label}
                      onChange={(e) => updateField('phone_label', e.target.value)}
                      placeholder="Telefon"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Numer telefonu</Label>
                    <Input
                      value={settings.phone_number}
                      onChange={(e) => updateField('phone_number', e.target.value)}
                      placeholder="+48 123 456 789"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ikona</Label>
                    <IconPicker
                      value={settings.phone_icon}
                      onChange={(icon) => updateField('phone_icon', icon || 'Phone')}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Working Hours Card */}
              <div className="space-y-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Karta Godziny pracy
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Etykieta</Label>
                    <Input
                      value={settings.working_hours_label}
                      onChange={(e) => updateField('working_hours_label', e.target.value)}
                      placeholder="Godziny pracy"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Godziny</Label>
                    <Input
                      value={settings.working_hours}
                      onChange={(e) => updateField('working_hours', e.target.value)}
                      placeholder="Pon-Pt: 09:00-14:00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ikona</Label>
                    <IconPicker
                      value={settings.working_hours_icon}
                      onChange={(icon) => updateField('working_hours_icon', icon || 'Clock')}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Info Box Section */}
      <Collapsible open={infoBoxOpen} onOpenChange={setInfoBoxOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Box informacyjny</CardTitle>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${infoBoxOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tytuł</Label>
                  <Input
                    value={settings.info_box_title}
                    onChange={(e) => updateField('info_box_title', e.target.value)}
                    placeholder="Informacja"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ikona</Label>
                  <IconPicker
                    value={settings.info_box_icon}
                    onChange={(icon) => updateField('info_box_icon', icon || 'Clock')}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Treść</Label>
                <Textarea
                  value={settings.info_box_content}
                  onChange={(e) => updateField('info_box_content', e.target.value)}
                  placeholder="W przypadku dużej ilości zgłoszeń odpowiedź może potrwać do 24h..."
                  rows={3}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Form Section */}
      <Collapsible open={formOpen} onOpenChange={setFormOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Formularz kontaktowy</CardTitle>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${formOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Tytuł formularza</Label>
                <Input
                  value={settings.form_title}
                  onChange={(e) => updateField('form_title', e.target.value)}
                  placeholder="Napisz do nas"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Etykieta: Imię i nazwisko</Label>
                  <Input
                    value={settings.name_label}
                    onChange={(e) => updateField('name_label', e.target.value)}
                    placeholder="Imię i nazwisko"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placeholder: Imię i nazwisko</Label>
                  <Input
                    value={settings.name_placeholder}
                    onChange={(e) => updateField('name_placeholder', e.target.value)}
                    placeholder="Jan Kowalski"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Etykieta: Email</Label>
                  <Input
                    value={settings.email_field_label}
                    onChange={(e) => updateField('email_field_label', e.target.value)}
                    placeholder="Email"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placeholder: Email</Label>
                  <Input
                    value={settings.email_placeholder}
                    onChange={(e) => updateField('email_placeholder', e.target.value)}
                    placeholder="jan@example.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Etykieta: Temat</Label>
                  <Input
                    value={settings.subject_label}
                    onChange={(e) => updateField('subject_label', e.target.value)}
                    placeholder="Temat"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placeholder: Temat</Label>
                  <Input
                    value={settings.subject_placeholder}
                    onChange={(e) => updateField('subject_placeholder', e.target.value)}
                    placeholder="W czym możemy pomóc?"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Etykieta: Wiadomość</Label>
                  <Input
                    value={settings.message_label}
                    onChange={(e) => updateField('message_label', e.target.value)}
                    placeholder="Wiadomość"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Placeholder: Wiadomość</Label>
                  <Input
                    value={settings.message_placeholder}
                    onChange={(e) => updateField('message_placeholder', e.target.value)}
                    placeholder="Opisz swoje pytanie lub problem..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tekst przycisku</Label>
                <Input
                  value={settings.submit_button_text}
                  onChange={(e) => updateField('submit_button_text', e.target.value)}
                  placeholder="Wyślij wiadomość"
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Response Messages Section */}
      <Collapsible open={messagesOpen} onOpenChange={setMessagesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Komunikaty odpowiedzi</CardTitle>
                </div>
                <ChevronDown className={`h-5 w-5 transition-transform ${messagesOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Komunikat sukcesu</Label>
                <Textarea
                  value={settings.success_message}
                  onChange={(e) => updateField('success_message', e.target.value)}
                  placeholder="Wiadomość wysłana! Odpowiemy najszybciej jak to możliwe."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Komunikat błędu</Label>
                <Textarea
                  value={settings.error_message}
                  onChange={(e) => updateField('error_message', e.target.value)}
                  placeholder="Nie udało się wysłać wiadomości. Spróbuj ponownie."
                  rows={2}
                />
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
};

export default SupportSettingsManagement;
