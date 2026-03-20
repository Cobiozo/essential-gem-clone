import React, { useState, useMemo, useCallback } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SurveyOption {
  label: string;
  value: string;
  tags?: string[];
}

interface SurveyQuestion {
  id: string;
  question: string;
  type: 'single' | 'multiple';
  options: SurveyOption[];
}

interface ProductRecommendation {
  tags: string[];
  product_name: string;
  description?: string;
  image_url?: string;
  link?: string;
}

interface SurveySectionProps {
  config: Record<string, any>;
}

export const SurveySection: React.FC<SurveySectionProps> = ({ config }) => {
  const questions: SurveyQuestion[] = config.questions || [];
  const recommendations: ProductRecommendation[] = config.product_recommendations || [];
  const bgColor = config.bg_color || '#0a1628';
  const textColor = config.text_color || '#ffffff';
  const accentColor = config.accent_color || '#3b82f6';

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [finished, setFinished] = useState(false);

  const current = questions[step];
  const progress = questions.length > 0 ? ((step + (finished ? 1 : 0)) / questions.length) * 100 : 0;

  const handleSelect = useCallback((questionId: string, value: string, type: 'single' | 'multiple') => {
    setAnswers(prev => {
      const existing = prev[questionId] || [];
      if (type === 'single') return { ...prev, [questionId]: [value] };
      return {
        ...prev,
        [questionId]: existing.includes(value)
          ? existing.filter(v => v !== value)
          : [...existing, value],
      };
    });
  }, []);

  const canNext = current && (answers[current.id]?.length || 0) > 0;

  const handleNext = useCallback(() => {
    if (step < questions.length - 1) {
      setStep(s => s + 1);
    } else {
      setFinished(true);
    }
  }, [step, questions.length]);

  const handleBack = useCallback(() => {
    if (finished) { setFinished(false); return; }
    if (step > 0) setStep(s => s - 1);
  }, [finished, step]);

  const handleReset = useCallback(() => {
    setStep(0);
    setAnswers({});
    setFinished(false);
  }, []);

  // Collect all tags from selected answers
  const collectedTags = useMemo(() => {
    const tags = new Set<string>();
    for (const q of questions) {
      const selected = answers[q.id] || [];
      for (const opt of q.options) {
        if (selected.includes(opt.value) && opt.tags) {
          opt.tags.forEach(t => tags.add(t));
        }
      }
    }
    return tags;
  }, [answers, questions]);

  // Match recommendations — show products where at least one tag matches
  const matchedProducts = useMemo(() => {
    if (collectedTags.size === 0) return recommendations;
    return recommendations.filter(r =>
      r.tags?.some(t => collectedTags.has(t))
    ).sort((a, b) => {
      const aScore = a.tags?.filter(t => collectedTags.has(t)).length || 0;
      const bScore = b.tags?.filter(t => collectedTags.has(t)).length || 0;
      return bScore - aScore;
    });
  }, [collectedTags, recommendations]);

  if (questions.length === 0) {
    return (
      <section style={{ backgroundColor: bgColor, color: textColor }} className="py-16">
        <div className="max-w-2xl mx-auto px-4 text-center opacity-60">
          Ankieta nie zawiera pytań — dodaj je w edytorze.
        </div>
      </section>
    );
  }

  return (
    <section style={{ backgroundColor: bgColor, color: textColor }} className="py-12 sm:py-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        {/* Header */}
        {config.heading && (
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-2" style={{ color: textColor }}>
            {config.heading}
          </h2>
        )}
        {config.subtitle && (
          <p className="text-center mb-8 opacity-70 text-sm sm:text-base" style={{ color: textColor }}>
            {config.subtitle}
          </p>
        )}

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full mb-8 overflow-hidden" style={{ backgroundColor: `${textColor}15` }}>
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%`, backgroundColor: accentColor }}
          />
        </div>

        {!finished ? (
          /* Question view */
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-xs font-medium opacity-50 uppercase tracking-wider">
                Pytanie {step + 1} z {questions.length}
              </span>
              <h3 className="text-xl sm:text-2xl font-semibold mt-2" style={{ color: textColor }}>
                {current.question}
              </h3>
            </div>

            {/* Options */}
            <div className="grid gap-3 mt-6">
              {current.options.map((opt) => {
                const selected = (answers[current.id] || []).includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(current.id, opt.value, current.type)}
                    className={cn(
                      'w-full text-left px-5 py-4 rounded-xl border-2 transition-all duration-200',
                      'hover:scale-[1.01] active:scale-[0.98]',
                      selected
                        ? 'shadow-lg'
                        : 'hover:shadow-md'
                    )}
                    style={{
                      borderColor: selected ? accentColor : `${textColor}20`,
                      backgroundColor: selected ? `${accentColor}18` : `${textColor}08`,
                      color: textColor,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 flex-shrink-0 border-2 flex items-center justify-center transition-colors',
                          current.type === 'single' ? 'rounded-full' : 'rounded-md'
                        )}
                        style={{
                          borderColor: selected ? accentColor : `${textColor}40`,
                          backgroundColor: selected ? accentColor : 'transparent',
                        }}
                      >
                        {selected && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm sm:text-base font-medium">{opt.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={handleBack}
                disabled={step === 0}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-opacity disabled:opacity-30"
                style={{ color: textColor }}
              >
                <ChevronLeft className="w-4 h-4" /> Wstecz
              </button>
              <button
                onClick={handleNext}
                disabled={!canNext}
                className="flex items-center gap-1 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-30 hover:shadow-lg active:scale-[0.97]"
                style={{
                  backgroundColor: canNext ? accentColor : `${textColor}20`,
                  color: canNext ? '#ffffff' : textColor,
                }}
              >
                {step < questions.length - 1 ? 'Dalej' : 'Zobacz wyniki'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Results view */
          <div className="space-y-6">
            <div className="text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3" style={{ color: accentColor }} />
              <h3 className="text-xl sm:text-2xl font-bold" style={{ color: textColor }}>
                {config.result_heading || 'Twoje rekomendowane produkty'}
              </h3>
              {config.result_description && (
                <p className="mt-2 opacity-70 text-sm" style={{ color: textColor }}>
                  {config.result_description}
                </p>
              )}
            </div>

            {matchedProducts.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {matchedProducts.map((prod, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-5 border transition-shadow hover:shadow-lg"
                    style={{
                      borderColor: `${textColor}15`,
                      backgroundColor: `${textColor}08`,
                    }}
                  >
                    {prod.image_url && (
                      <img src={prod.image_url} alt={prod.product_name} className="w-full h-32 object-contain rounded-lg mb-3" />
                    )}
                    <h4 className="font-semibold text-base" style={{ color: textColor }}>{prod.product_name}</h4>
                    {prod.description && (
                      <p className="text-sm mt-1 opacity-70" style={{ color: textColor }}>{prod.description}</p>
                    )}
                    {prod.link && (
                      <a
                        href={prod.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-3 text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:shadow-md"
                        style={{ backgroundColor: accentColor, color: '#ffffff' }}
                      >
                        Dowiedz się więcej
                      </a>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center opacity-60 text-sm" style={{ color: textColor }}>
                Nie znaleziono produktów pasujących do Twojego profilu.
              </p>
            )}

            <div className="flex justify-center gap-3 pt-4">
              <button
                onClick={handleBack}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{ borderColor: `${textColor}30`, color: textColor }}
              >
                <ChevronLeft className="w-4 h-4" /> Wróć do pytań
              </button>
              <button
                onClick={handleReset}
                className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ backgroundColor: `${textColor}15`, color: textColor }}
              >
                <RotateCcw className="w-4 h-4" /> Od nowa
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
