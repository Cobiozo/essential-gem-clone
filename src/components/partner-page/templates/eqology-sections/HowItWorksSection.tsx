import React from 'react';
import type { EqologyHowItWorksSection, EqologyTheme } from '@/types/eqologyTemplate';
import { Package, Droplets, FlaskConical, FileText, Heart, Shield } from 'lucide-react';

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Package, Droplets, FlaskConical, FileText, Heart, Shield,
};

interface Props {
  data: EqologyHowItWorksSection;
  theme: EqologyTheme;
}

export const HowItWorksSection: React.FC<Props> = ({ data, theme }) => {
  return (
    <section style={{ backgroundColor: theme.bgAlt }} className="py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-6">
        <h2
          className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-16"
          style={{ color: theme.primaryColor }}
        >
          {data.title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {data.steps.map((step, i) => {
            const Icon = ICON_MAP[step.icon] || Package;
            return (
              <div key={i} className="text-center group">
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                  style={{
                    backgroundColor: `${theme.primaryColor}15`,
                    border: `2px solid ${theme.primaryColor}30`,
                  }}
                >
                  <Icon className="w-9 h-9" style={{ color: theme.primaryColor }} />
                </div>
                <div className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: theme.accentColor }}>
                  Krok {i + 1}
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: theme.primaryColor }}>
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>

        {data.videoUrl && (
          <div className="max-w-3xl mx-auto">
            <div className="aspect-video rounded-2xl overflow-hidden shadow-xl border border-gray-200">
              <iframe
                src={data.videoUrl}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
