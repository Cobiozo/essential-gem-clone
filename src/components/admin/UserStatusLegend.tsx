import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

const statusColors = [
  { color: 'bg-green-500', label: 'W pełni zatwierdzony', description: 'Email potwierdzony, opiekun i admin zatwierdził' },
  { color: 'bg-amber-500', label: 'Oczekuje na admina', description: 'Opiekun zatwierdził, czeka na admina (brak lidera w ścieżce)' },
  { color: 'bg-violet-500', label: 'Oczekuje na Lidera', description: 'Opiekun zatwierdził, lider w ścieżce musi zatwierdzić (admin też może)' },
  { color: 'bg-red-500', label: 'Oczekuje na opiekuna', description: 'Email potwierdzony, brak zatwierdzenia opiekuna' },
  { color: 'bg-gray-400', label: 'Email niepotwierdzony', description: 'Użytkownik nie potwierdził emaila' },
  { color: 'bg-gray-300', label: 'Zablokowany', description: 'Konto zablokowane przez admina' },
];

export const UserStatusLegend: React.FC = () => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Legenda statusów</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="start" className="max-w-xs p-3">
          <div className="space-y-2">
            <p className="font-medium text-sm mb-2">Znaczenie kolorów kropek:</p>
            {statusColors.map(({ color, label, description }) => (
              <div key={label} className="flex items-start gap-2">
                <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} flex-shrink-0 mt-0.5`} />
                <div>
                  <span className="text-xs font-medium">{label}</span>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
            ))}
            <div className="mt-3 pt-2 border-t border-border">
              <p className="text-xs font-medium mb-1">Ścieżka zatwierdzania:</p>
              <p className="text-xs text-muted-foreground">
                📧 Email → 👤 Opiekun → 👑 Lider <span className="text-muted-foreground/60">(lub)</span> 🛡️ Admin → ✅ Aktywny
              </p>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
