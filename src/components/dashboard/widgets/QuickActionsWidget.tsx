import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  GraduationCap, 
  UserPlus, 
  Link2, 
  Compass,
  FolderOpen,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  path: string;
  color: string;
  roles: string[];
}

const quickActions: QuickAction[] = [
  {
    id: 'training',
    label: 'Kontynuuj naukę',
    description: 'Wróć do szkoleń',
    icon: GraduationCap,
    path: '/szkolenia',
    color: 'bg-primary/10 text-primary hover:bg-primary/20',
    roles: ['admin', 'partner', 'client', 'specjalista'],
  },
  {
    id: 'contact',
    label: 'Dodaj kontakt',
    description: 'Nowy członek zespołu',
    icon: UserPlus,
    path: '/moje-konto?tab=team',
    color: 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20',
    roles: ['admin', 'partner', 'specjalista'],
  },
  {
    id: 'reflink',
    label: 'Generuj reflink',
    description: 'Stwórz link polecający',
    icon: Link2,
    path: '/moje-konto?tab=reflinks',
    color: 'bg-green-500/10 text-green-600 hover:bg-green-500/20',
    roles: ['admin', 'partner', 'specjalista'],
  },
  {
    id: 'compass',
    label: 'Kompas AI',
    description: 'Asystent sprzedaży',
    icon: Compass,
    path: '/moje-konto?tab=compass',
    color: 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20',
    roles: ['admin', 'partner', 'specjalista'],
  },
  {
    id: 'resources',
    label: 'Zasoby wiedzy',
    description: 'Materiały i dokumenty',
    icon: FolderOpen,
    path: '/centrum-wiedzy',
    color: 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20',
    roles: ['admin', 'partner', 'client', 'specjalista'],
  },
];

export const QuickActionsWidget: React.FC = () => {
  const navigate = useNavigate();
  const { userRole, profile } = useAuth();
  
  const currentRole = userRole?.role || profile?.role || 'client';
  
  const filteredActions = quickActions
    .filter(action => action.roles.includes(currentRole))
    .slice(0, 4); // Show max 4 actions

  return (
    <Card className="dashboard-widget h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Szybkie akcje</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {filteredActions.map((action) => (
          <button
            key={action.id}
            onClick={() => navigate(action.path)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 group text-left",
              action.color
            )}
          >
            <div className="h-10 w-10 rounded-lg bg-background/50 flex items-center justify-center shrink-0">
              <action.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{action.label}</p>
              <p className="text-xs opacity-70">{action.description}</p>
            </div>
            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
};
