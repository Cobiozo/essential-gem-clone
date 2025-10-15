import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';

const LearnMoreSection = () => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const items = [
    {
      title: 'Materiały edukacyjne',
      content: 'Kompleksowe materiały edukacyjne o omega-3 i zdrowiu'
    },
    {
      title: 'Materiały sprzedażowe',
      content: 'Profesjonalne materiały do wspierania sprzedaży'
    },
    {
      title: 'Szkolenia wideo',
      content: 'Szkolenia wideo dla partnerów i specjalistów'
    }
  ];

  return (
    <section className="py-16 px-4 bg-gray-50">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4 text-black">DOWIEDZ SIĘ WIĘCEJ</h2>
          <p className="text-gray-600">
            Tu znajdziesz materiały dla wszystkich zainteresowanych omega-3
          </p>
        </div>
        
        <div className="space-y-4">
          {items.map((item, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <button
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-[hsl(45,100%,51%)] flex items-center justify-center text-white font-bold text-lg">
                    {index + 1}
                  </div>
                  <span className="text-left text-black font-medium">{item.title}</span>
                </div>
                <ChevronRight 
                  className={`w-5 h-5 text-gray-400 transition-transform ${
                    expandedIndex === index ? 'rotate-90' : ''
                  }`} 
                />
              </button>
              {expandedIndex === index && (
                <div className="px-6 pb-6 text-gray-600 text-sm">
                  {item.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LearnMoreSection;
