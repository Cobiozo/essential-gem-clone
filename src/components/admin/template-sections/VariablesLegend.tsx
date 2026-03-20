import React, { useState } from 'react';
import { VARIABLES_LEGEND } from '@/lib/partnerVariables';
import { ChevronDown, ChevronUp, Variable } from 'lucide-react';

export const VariablesLegend: React.FC = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Variable className="w-3.5 h-3.5" />
          Zmienne dynamiczne (dane partnera)
        </span>
        {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2 space-y-1">
          <p className="text-[10px] text-muted-foreground mb-2">
            Wpisz zmienną w polu tekstowym — zostanie zastąpiona danymi partnera.
          </p>
          {VARIABLES_LEGEND.map(v => (
            <div key={v.variable} className="flex items-center justify-between text-xs">
              <code className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-mono text-foreground">
                {v.variable}
              </code>
              <span className="text-muted-foreground text-[10px]">{v.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
