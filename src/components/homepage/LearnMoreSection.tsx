import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

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
    <section className="py-20 px-4 bg-white">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6 text-black uppercase tracking-wide">
            Dowiedz się więcej
          </h2>
          <p className="text-gray-600 text-lg">
            Tu znajdziesz materiały dla wszystkich zainteresowanych omega-3
          </p>
        </div>
        
        <div className="space-y-4">
          {items.map((item, index) => (
            <div 
              key={index} 
              className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100"
            >
              <button
                onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-6 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full bg-[hsl(45,100%,51%)] flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                    {index + 1}
                  </div>
                  <span className="text-left text-black font-semibold text-lg">{item.title}</span>
                </div>
                <ChevronDown 
                  className={`w-6 h-6 text-gray-400 group-hover:text-[hsl(45,100%,51%)] transition-all duration-300 ${
                    expandedIndex === index ? 'rotate-180' : ''
                  }`} 
                />
              </button>
              <div 
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  expandedIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="px-6 pb-6 text-gray-600 leading-relaxed">
                  {item.content}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LearnMoreSection;
