import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Eye, Users, UserCheck, Briefcase, GraduationCap, UserX } from 'lucide-react';

interface VisibilitySettings {
  visible_to_everyone?: boolean;
  visible_to_clients?: boolean;
  visible_to_partners?: boolean;
  visible_to_specjalista?: boolean;
  visible_to_anonymous?: boolean;
}

interface VisibilityEditorProps {
  value: VisibilitySettings;
  onChange: (settings: VisibilitySettings) => void;
  className?: string;
}

export const VisibilityEditor: React.FC<VisibilityEditorProps> = ({
  value,
  onChange,
  className = ''
}) => {
  const handleChange = (field: keyof VisibilitySettings, checked: boolean) => {
    // If "everyone" is checked, uncheck all others
    if (field === 'visible_to_everyone' && checked) {
      onChange({
        visible_to_everyone: true,
        visible_to_clients: false,
        visible_to_partners: false,
        visible_to_specjalista: false,
        visible_to_anonymous: false,
      });
    } else if (field !== 'visible_to_everyone' && checked) {
      // If any specific role is checked, uncheck "everyone"
      onChange({
        ...value,
        visible_to_everyone: false,
        [field]: checked,
      });
    } else {
      onChange({
        ...value,
        [field]: checked,
      });
    }
  };

  const visibilityOptions = [
    {
      key: 'visible_to_everyone' as const,
      label: 'Wszyscy',
      description: 'Widoczne dla wszystkich użytkowników',
      icon: Users,
    },
    {
      key: 'visible_to_clients' as const,
      label: 'Klienci',
      description: 'Widoczne dla klientów',
      icon: UserCheck,
    },
    {
      key: 'visible_to_partners' as const,
      label: 'Partnerzy',
      description: 'Widoczne dla partnerów',
      icon: Briefcase,
    },
    {
      key: 'visible_to_specjalista' as const,
      label: 'Specjaliści',
      description: 'Widoczne dla specjalistów',
      icon: GraduationCap,
    },
    {
      key: 'visible_to_anonymous' as const,
      label: 'Niezalogowani',
      description: 'Widoczne dla niezalogowanych użytkowników',
      icon: UserX,
    },
  ];

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Eye className="h-5 w-5 text-muted-foreground" />
        <Label className="text-base font-semibold">Widoczność</Label>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibilityOptions.map((option) => {
          const Icon = option.icon;
          const isChecked = value[option.key] ?? (option.key === 'visible_to_everyone');
          
          return (
            <label
              key={option.key}
              className={`
                flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors
                ${isChecked 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
                }
              `}
            >
              <Checkbox
                checked={isChecked}
                onCheckedChange={(checked) => handleChange(option.key, !!checked)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium text-sm">{option.label}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {option.description}
                </p>
              </div>
            </label>
          );
        })}
      </div>
      
      <p className="text-xs text-muted-foreground mt-2">
        💡 Zaznaczenie "Wszyscy" automatycznie odznacza pozostałe opcje. Administratorzy zawsze widzą wszystkie elementy.
      </p>
    </div>
  );
};
