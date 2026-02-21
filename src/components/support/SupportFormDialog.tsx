import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Send } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// ========== Types ==========

interface CustomCard {
  id: string;
  icon: string;
  label: string;
  value: string;
  visible: boolean;
  position: number;
}

interface CustomFormField {
  id: string;
  label: string;
  placeholder: string;
  type: 'input' | 'textarea';
  required: boolean;
  position: number;
  width: 'half' | 'full';
}

interface CustomInfoBox {
  id: string;
  icon: string;
  title: string;
  content: string;
  visible: boolean;
  position: number;
}

interface SupportSettings {
  id: string;
  header_title: string;
  header_description: string;
  form_title: string;
  submit_button_text: string;
  success_message: string;
  error_message: string;
  custom_cards: CustomCard[];
  custom_form_fields: CustomFormField[];
  custom_info_boxes: CustomInfoBox[];
}

interface SupportFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} />;
};

export const SupportFormDialog: React.FC<SupportFormDialogProps> = ({ open, onOpenChange }) => {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const [settings, setSettings] = useState<SupportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Fetch settings
  useEffect(() => {
    if (!open) return;
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('support_settings')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const customCards = Array.isArray(data.custom_cards) ? (data.custom_cards as unknown as CustomCard[]) : [];
          const customFormFields = Array.isArray(data.custom_form_fields) ? (data.custom_form_fields as unknown as CustomFormField[]) : [];
          const customInfoBoxes = Array.isArray(data.custom_info_boxes) ? (data.custom_info_boxes as unknown as CustomInfoBox[]) : [];

          setSettings({
            id: data.id,
            header_title: data.header_title || 'Wsparcie techniczne',
            header_description: data.header_description || 'Masz pytania? Skontaktuj się z naszym zespołem wsparcia.',
            form_title: data.form_title || 'Napisz do nas',
            submit_button_text: data.submit_button_text || 'Wyślij wiadomość',
            success_message: data.success_message || 'Wiadomość wysłana!',
            error_message: data.error_message || 'Nie udało się wysłać wiadomości',
            custom_cards: customCards.filter(c => c.visible).sort((a, b) => a.position - b.position),
            custom_form_fields: customFormFields.sort((a, b) => a.position - b.position),
            custom_info_boxes: customInfoBoxes.filter(b => b.visible).sort((a, b) => a.position - b.position),
          });

          // Initialize form data from fields
          const initialFormData: Record<string, string> = {};
          customFormFields.forEach(f => { initialFormData[f.id] = ''; });
          setFormData(initialFormData);
        }
      } catch (error) {
        console.error('Error fetching support settings:', error);
      } finally {
        setLoading(false);
      }
    };
    setLoading(true);
    fetchSettings();
  }, [open]);

  // Auto-fill for logged in users
  useEffect(() => {
    if (!profile || !user || !settings) return;
    const nameField = settings.custom_form_fields.find(f => f.id === 'field_name' || f.label.toLowerCase().includes('imię'));
    const emailField = settings.custom_form_fields.find(f => f.id === 'field_email' || f.label.toLowerCase().includes('email'));
    setFormData(prev => ({
      ...prev,
      ...(nameField ? { [nameField.id]: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() } : {}),
      ...(emailField ? { [emailField.id]: user.email || '' } : {}),
    }));
  }, [profile, user, settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    // Validate required fields
    const missingFields = settings.custom_form_fields
      .filter(f => f.required && !formData[f.id]?.trim())
      .map(f => f.label);

    if (missingFields.length > 0) {
      toast({ title: 'Błąd', description: `Wypełnij wymagane pola: ${missingFields.join(', ')}`, variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      // Build readable form data for email
      const fieldEntries = settings.custom_form_fields
        .map(f => ({ label: f.label, value: formData[f.id] || '' }))
        .filter(e => e.value);

      const { data, error } = await supabase.functions.invoke('send-support-email', {
        body: {
          name: formData['field_name'] || fieldEntries[0]?.value || 'Nieznany',
          email: formData['field_email'] || user?.email || '',
          subject: formData['field_subject'] || 'Formularz wsparcia',
          message: fieldEntries.map(e => `${e.label}: ${e.value}`).join('\n'),
          userId: user?.id,
        },
      });

      if (error) throw new Error(error.message || 'Błąd wywołania funkcji');
      if (data && !data.success) throw new Error(data.error || 'Nie udało się wysłać wiadomości');

      toast({ title: 'Sukces', description: settings.success_message });
      const resetData: Record<string, string> = {};
      settings.custom_form_fields.forEach(f => { resetData[f.id] = ''; });
      setFormData(resetData);
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending support email:', error);
      toast({ title: 'Błąd', description: error.message || settings.error_message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">
            {settings?.header_title}
          </DialogTitle>
          <p className="text-muted-foreground">{settings?.header_description}</p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Dynamic Cards */}
          {settings && settings.custom_cards.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {settings.custom_cards.map((card) => (
                <Card key={card.id} className="bg-card border shadow-sm">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                      <DynamicIcon name={card.icon} className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-sm text-foreground">{card.label}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{card.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Dynamic Info Boxes */}
          {settings?.custom_info_boxes.map((box) => (
            <div key={box.id} className="flex items-start gap-3 p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg">
              <DynamicIcon name={box.icon} className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-semibold text-sm text-foreground">{box.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{box.content}</p>
              </div>
            </div>
          ))}

          {/* Dynamic Form */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">{settings?.form_title}</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {settings?.custom_form_fields.map((field) => (
                    <div
                      key={field.id}
                      className={`space-y-2 ${field.width === 'full' ? 'md:col-span-2' : ''}`}
                    >
                      <Label htmlFor={field.id}>
                        {field.label} {field.required && <span className="text-destructive">*</span>}
                      </Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.id}
                          value={formData[field.id] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder={field.placeholder}
                          rows={5}
                          required={field.required}
                        />
                      ) : (
                        <Input
                          id={field.id}
                          value={formData[field.id] || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, [field.id]: e.target.value }))}
                          placeholder={field.placeholder}
                          required={field.required}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <Button type="submit" className="w-full" disabled={sending}>
                  {sending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Wysyłanie...</>
                  ) : (
                    <><Send className="mr-2 h-4 w-4" />{settings?.submit_button_text}</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SupportFormDialog;
