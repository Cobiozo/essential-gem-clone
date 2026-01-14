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
import { Loader2, Mail, Phone, Clock, Send } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

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
}

interface SupportFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Dynamic icon renderer
const DynamicIcon = ({ name, className }: { name: string; className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || Mail;
  return <IconComponent className={className} />;
};

export const SupportFormDialog: React.FC<SupportFormDialogProps> = ({ open, onOpenChange }) => {
  const { profile, user } = useAuth();
  const { toast } = useToast();
  
  const [settings, setSettings] = useState<SupportSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  // Fetch settings
  useEffect(() => {
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
        }
      } catch (error) {
        console.error('Error fetching support settings:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchSettings();
    }
  }, [open]);

  // Auto-fill form for logged in users
  useEffect(() => {
    if (profile && user) {
      setFormData(prev => ({
        ...prev,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim(),
        email: user.email || '',
      }));
    }
  }, [profile, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.subject || !formData.message) {
      toast({
        title: 'Błąd',
        description: 'Wszystkie pola są wymagane',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('send-support-email', {
        body: {
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          userId: user?.id,
        },
      });

      if (error) throw error;

      toast({
        title: 'Sukces',
        description: settings?.success_message || 'Wiadomość wysłana!',
      });

      // Reset form and close dialog
      setFormData({ name: '', email: '', subject: '', message: '' });
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending support email:', error);
      toast({
        title: 'Błąd',
        description: settings?.error_message || 'Nie udało się wysłać wiadomości',
        variant: 'destructive',
      });
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
            {settings?.header_title || 'Wsparcie techniczne'}
          </DialogTitle>
          <p className="text-muted-foreground">
            {settings?.header_description || 'Masz pytania? Skontaktuj się z naszym zespołem wsparcia.'}
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Info Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email Card */}
            <Card className="bg-card border shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <DynamicIcon name={settings?.email_icon || 'Mail'} className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">
                  {settings?.email_label || 'Email'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {settings?.email_address || 'support@purelife.info.pl'}
                </p>
              </CardContent>
            </Card>

            {/* Phone Card */}
            <Card className="bg-card border shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <DynamicIcon name={settings?.phone_icon || 'Phone'} className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">
                  {settings?.phone_label || 'Telefon'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {settings?.phone_number || '+48 123 456 789'}
                </p>
              </CardContent>
            </Card>

            {/* Working Hours Card */}
            <Card className="bg-card border shadow-sm">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <DynamicIcon name={settings?.working_hours_icon || 'Clock'} className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">
                  {settings?.working_hours_label || 'Godziny pracy'}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {settings?.working_hours || 'Pon-Pt: 09:00-14:00'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Info Box */}
          <div className="flex items-start gap-3 p-4 bg-primary/5 border-l-4 border-primary rounded-r-lg">
            <DynamicIcon name={settings?.info_box_icon || 'Clock'} className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-foreground">
                {settings?.info_box_title || 'Informacja'}
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                {settings?.info_box_content || 'W przypadku dużej ilości zgłoszeń odpowiedź może potrwać do 24h. W pilnych sprawach zalecamy kontakt telefoniczny.'}
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {settings?.form_title || 'Napisz do nas'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {settings?.name_label || 'Imię i nazwisko'}
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder={settings?.name_placeholder || 'Jan Kowalski'}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">
                      {settings?.email_field_label || 'Email'}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder={settings?.email_placeholder || 'jan@example.com'}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">
                    {settings?.subject_label || 'Temat'}
                  </Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder={settings?.subject_placeholder || 'W czym możemy pomóc?'}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">
                    {settings?.message_label || 'Wiadomość'}
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder={settings?.message_placeholder || 'Opisz swoje pytanie lub problem...'}
                    rows={5}
                    required
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={sending}
                >
                  {sending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wysyłanie...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      {settings?.submit_button_text || 'Wyślij wiadomość'}
                    </>
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
