import React, { useState } from 'react';
import type { FormBlockData } from '@/types/leaderLanding';
import { trackLandingEvent } from '../utils/analytics';

interface Props {
  data: FormBlockData;
  blockId: string;
  pageId: string;
  themeColor: string;
  eqId: string;
}

export const FormBlock: React.FC<Props> = ({ data, blockId, pageId, themeColor }) => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    trackLandingEvent(pageId, 'form_submit', { block_id: blockId, ...values });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <section id={blockId} className="max-w-md mx-auto px-6 py-12 text-center">
        <div className="bg-green-50 rounded-xl p-8">
          <h3 className="text-xl font-semibold text-green-700 mb-2">Dziękujemy!</h3>
          <p className="text-green-600">Twoja wiadomość została wysłana.</p>
        </div>
      </section>
    );
  }

  const fieldLabels: Record<string, string> = {
    name: 'Imię', email: 'Email', phone: 'Telefon', message: 'Wiadomość',
  };

  return (
    <section id={blockId} className="max-w-md mx-auto px-6 py-12">
      {data.heading && <h2 className="text-2xl font-bold mb-6 text-center">{data.heading}</h2>}
      <form onSubmit={handleSubmit} className="space-y-4">
        {(data.fields || ['name', 'email', 'message']).map(field => (
          <div key={field}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{fieldLabels[field] || field}</label>
            {field === 'message' ? (
              <textarea
                required
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': themeColor } as any}
                value={values[field] || ''}
                onChange={e => setValues(v => ({ ...v, [field]: e.target.value }))}
              />
            ) : (
              <input
                type={field === 'email' ? 'email' : field === 'phone' ? 'tel' : 'text'}
                required={field !== 'phone'}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': themeColor } as any}
                value={values[field] || ''}
                onChange={e => setValues(v => ({ ...v, [field]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <button
          type="submit"
          className="w-full py-3 rounded-lg text-white font-semibold transition-transform hover:scale-105"
          style={{ backgroundColor: themeColor }}
        >
          {data.submit_text || 'Wyślij'}
        </button>
      </form>
    </section>
  );
};
