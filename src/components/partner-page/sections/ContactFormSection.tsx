import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface FormField {
  label: string;
  placeholder?: string;
  type: string;
  required?: boolean;
}

interface Props {
  config: Record<string, any>;
  partnerEmail?: string;
}

export const ContactFormSection: React.FC<Props> = ({ config, partnerEmail }) => {
  const { toast } = useToast();
  const {
    heading, subheading, fields, submit_text, privacy_text,
    bg_color, text_color, layout, cta_bg_color, success_message,
  } = config;

  const formFields: FormField[] = fields || [
    { label: 'Imię', type: 'text', placeholder: 'Twoje imię', required: true },
    { label: 'Email', type: 'email', placeholder: 'twoj@email.com', required: true },
    { label: 'Telefon', type: 'tel', placeholder: '+48 ...', required: false },
  ];

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const ctaBg = cta_bg_color || '#2d6a4f';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    try {
      if (partnerEmail) {
        const fieldsSummary = Object.entries(formData)
          .map(([key, val]) => `<strong>${key}:</strong> ${val}`)
          .join('<br/>');

        await supabase.functions.invoke('send-single-email', {
          body: {
            template_id: null,
            skip_template: true,
            recipientEmail: partnerEmail,
            subject: `Nowa wiadomość ze strony partnerskiej`,
            htmlContent: `
              <h2>Nowa wiadomość z formularza kontaktowego</h2>
              <p>${fieldsSummary}</p>
              <hr/>
              <p style="font-size:12px;color:#888;">Wiadomość wysłana automatycznie ze strony partnerskiej.</p>
            `,
          },
        });
      }

      toast({
        title: 'Wysłano!',
        description: success_message || 'Dziękujemy za wiadomość. Odezwiemy się wkrótce.',
      });
      setFormData({});
    } catch {
      toast({ title: 'Błąd', description: 'Nie udało się wysłać wiadomości.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const isFloating = layout === 'floating';

  if (isFloating) {
    return (
      <div className="bg-[#1a2332] rounded-2xl p-6 sm:p-8 text-white shadow-xl">
        {heading && <h3 className="text-xl font-bold mb-1">{heading}</h3>}
        {subheading && <p className="text-sm text-white/70 mb-6">{subheading}</p>}
        <form onSubmit={handleSubmit} className="space-y-3">
          {formFields.map((field, i) => (
            <div key={i}>
              <label className="block text-xs font-medium text-white/80 mb-1">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  className="w-full border border-white/20 rounded-lg px-4 py-2.5 bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none text-sm"
                  rows={3}
                  placeholder={field.placeholder || ''}
                  required={field.required}
                  value={formData[field.label] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [field.label]: e.target.value }))}
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  className="w-full border border-white/20 rounded-lg px-4 py-2.5 bg-white/10 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm"
                  placeholder={field.placeholder || ''}
                  required={field.required}
                  value={formData[field.label] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [field.label]: e.target.value }))}
                />
              )}
            </div>
          ))}
          {privacy_text && <p className="text-xs text-white/50">{privacy_text}</p>}
          <button
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 text-white font-bold py-3 rounded-full transition-all hover:shadow-lg disabled:opacity-50"
            style={{ backgroundColor: ctaBg }}
          >
            {sending ? 'Wysyłanie...' : (submit_text || 'Wyślij')} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <section
      className="py-16 md:py-24"
      style={{ backgroundColor: bg_color || '#f8fafc', color: text_color || undefined }}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {heading && <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">{heading}</h2>}
        {subheading && <p className="text-center text-muted-foreground mb-8">{subheading}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          {formFields.map((field, i) => (
            <div key={i}>
              <label className="block text-sm font-medium mb-1">{field.label}</label>
              {field.type === 'textarea' ? (
                <textarea
                  className="w-full border border-border rounded-lg px-4 py-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  rows={4}
                  placeholder={field.placeholder || ''}
                  required={field.required}
                  value={formData[field.label] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [field.label]: e.target.value }))}
                />
              ) : (
                <input
                  type={field.type || 'text'}
                  className="w-full border border-border rounded-lg px-4 py-3 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder={field.placeholder || ''}
                  required={field.required}
                  value={formData[field.label] || ''}
                  onChange={e => setFormData(prev => ({ ...prev, [field.label]: e.target.value }))}
                />
              )}
            </div>
          ))}
          {privacy_text && <p className="text-xs text-muted-foreground">{privacy_text}</p>}
          <button
            type="submit"
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 text-white font-bold py-3.5 rounded-full transition-all hover:shadow-lg disabled:opacity-50"
            style={{ backgroundColor: ctaBg }}
          >
            {sending ? 'Wysyłanie...' : (submit_text || 'Wyślij')} <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </section>
  );
};
