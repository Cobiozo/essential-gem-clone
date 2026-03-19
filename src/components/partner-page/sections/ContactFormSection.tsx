import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

interface FormField {
  label: string;
  placeholder?: string;
  type: string; // text, email, tel, textarea
  required?: boolean;
}

interface Props {
  config: Record<string, any>;
}

export const ContactFormSection: React.FC<Props> = ({ config }) => {
  const { toast } = useToast();
  const {
    heading, subheading, fields, submit_text, privacy_text,
    bg_color, text_color,
  } = config;

  const formFields: FormField[] = fields || [
    { label: 'Imię', type: 'text', placeholder: 'Twoje imię', required: true },
    { label: 'Email', type: 'email', placeholder: 'twoj@email.com', required: true },
    { label: 'Telefon', type: 'tel', placeholder: '+48 ...', required: false },
  ];

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // MVP: just show toast
    await new Promise(r => setTimeout(r, 800));
    toast({ title: 'Wysłano!', description: 'Dziękujemy za wiadomość. Odezwiemy się wkrótce.' });
    setFormData({});
    setSending(false);
  };

  return (
    <section
      className="py-16 md:py-24"
      style={{ backgroundColor: bg_color || '#f8fafc', color: text_color || undefined }}
    >
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {heading && (
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2">{heading}</h2>
        )}
        {subheading && (
          <p className="text-center text-muted-foreground mb-8">{subheading}</p>
        )}

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

          {privacy_text && (
            <p className="text-xs text-muted-foreground">{privacy_text}</p>
          )}

          <button
            type="submit"
            disabled={sending}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50"
          >
            {sending ? 'Wysyłanie...' : (submit_text || 'Wyślij')}
          </button>
        </form>
      </div>
    </section>
  );
};
