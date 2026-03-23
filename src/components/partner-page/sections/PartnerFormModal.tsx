import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Checkbox } from '@/components/ui/checkbox';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'textarea';
  placeholder: string;
  required: boolean;
}

interface FormDef {
  id: string;
  name: string;
  cta_key: string;
  fields: FormField[];
  submit_text: string;
  success_message: string;
  description?: string;
  consent_text?: string;
}

interface Props {
  ctaKey: string;
  partnerUserId: string;
  open: boolean;
  onClose: () => void;
}

export const PartnerFormModal: React.FC<Props> = ({ ctaKey, partnerUserId, open, onClose }) => {
  const [formDef, setFormDef] = useState<FormDef | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const [consentChecked, setConsentChecked] = useState(false);

  useEffect(() => {
    if (!open || !ctaKey) return;
    setSubmitted(false);
    setValues({});
    setConsentChecked(false);
    setLoading(true);

    supabase
      .from('partner_page_forms')
      .select('*')
      .eq('cta_key', ctaKey)
      .eq('is_active', true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setFormDef(null);
        } else {
          setFormDef({
            ...data,
            fields: (data.fields as any) || [],
            description: (data as any).description || '',
            consent_text: (data as any).consent_text || '',
          });
        }
        setLoading(false);
      });
  }, [open, ctaKey]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDef) return;

    if (formDef.consent_text && !consentChecked) {
      toast.error('Musisz wyrazić zgodę na przetwarzanie danych');
      return;
    }

    const findField = (type: string) => {
      const f = formDef.fields.find(f => f.type === type);
      return f ? values[f.id] || '' : '';
    };

    const emailValue = findField('email') || '';
    const phoneValue = findField('tel') || '';
    
    const textFields = formDef.fields.filter(f => f.type === 'text');
    const firstNameField = textFields.find(f => /imi[eę]/i.test(f.label)) || textFields[0];
    const lastNameField = textFields.find(f => /nazw/i.test(f.label));
    
    const firstName = firstNameField ? values[firstNameField.id] || '' : '';
    const lastName = lastNameField ? values[lastNameField.id] || '' : '';

    const messageLines = formDef.fields
      .filter(f => f.type === 'textarea')
      .map(f => values[f.id] || '')
      .filter(Boolean);

    const allFieldNotes = formDef.fields
      .map(f => `${f.label}: ${values[f.id] || '(puste)'}`)
      .join('\n');

    setSubmitting(true);

    try {
      const { error } = await supabase.functions.invoke('save-partner-lead', {
        body: {
          partner_user_id: partnerUserId,
          first_name: firstName || 'Nieznany',
          last_name: lastName || '',
          email: emailValue || 'brak@email.com',
          phone_number: phoneValue || null,
          message: messageLines.length > 0 ? messageLines.join('\n') : allFieldNotes,
          form_cta_key: formDef.cta_key,
          form_name: formDef.name,
        },
      });

      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error('Form submit error:', err);
      toast.error('Wystąpił błąd podczas wysyłania formularza');
    } finally {
      setSubmitting(false);
    }
  };

  const hasConsent = formDef?.consent_text && formDef.consent_text.trim().length > 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {loading ? 'Ładowanie...' : formDef?.name || 'Formularz'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : !formDef ? (
            <p className="text-center text-gray-500 py-8">Formularz nie został znaleziony</p>
          ) : submitted ? (
            <div className="text-center py-8 space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-lg font-medium text-gray-900">{formDef.success_message}</p>
              <button
                onClick={onClose}
                className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                Zamknij
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Description / intro text */}
              {formDef.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{formDef.description}</p>
              )}

              {formDef.fields.map(field => (
                <div key={field.id} className="space-y-1.5">
                  <label className="text-sm font-medium text-gray-700">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none min-h-[80px]"
                      placeholder={field.placeholder}
                      required={field.required}
                      value={values[field.id] || ''}
                      onChange={e => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    />
                  ) : (
                    <input
                      type={field.type}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      placeholder={field.placeholder}
                      required={field.required}
                      value={values[field.id] || ''}
                      onChange={e => setValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    />
                  )}
                </div>
              ))}

              {/* Consent checkbox */}
              {hasConsent && (
                <div className="flex items-start gap-2.5 pt-2">
                  <Checkbox
                    id="form-consent"
                    checked={consentChecked}
                    onCheckedChange={(checked) => setConsentChecked(!!checked)}
                    className="mt-0.5"
                  />
                  <label htmlFor="form-consent" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                    {formDef.consent_text}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || (hasConsent && !consentChecked)}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {formDef.submit_text}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};