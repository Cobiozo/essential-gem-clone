import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { 
  Crown, 
  User, 
  Handshake, 
  Wrench, 
  Ghost, 
  RotateCcw, 
  ChevronDown,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

export type PreviewRole = 'admin' | 'client' | 'partner' | 'specjalista' | 'anonymous' | 'real';

interface RolePreviewProps {
  currentRole: PreviewRole;
  onRoleChange: (role: PreviewRole) => void;
  className?: string;
}

const roles: Array<{
  type: PreviewRole;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  color?: string;
}> = [
  { type: 'real', icon: RotateCcw, labelKey: 'rolePreview.real', color: 'text-primary' },
  { type: 'admin', icon: Crown, labelKey: 'rolePreview.admin', color: 'text-amber-500' },
  { type: 'client', icon: User, labelKey: 'rolePreview.client', color: 'text-blue-500' },
  { type: 'partner', icon: Handshake, labelKey: 'rolePreview.partner', color: 'text-green-500' },
  { type: 'specjalista', icon: Wrench, labelKey: 'rolePreview.specjalista', color: 'text-purple-500' },
  { type: 'anonymous', icon: Ghost, labelKey: 'rolePreview.anonymous', color: 'text-muted-foreground' },
];

export const RolePreview: React.FC<RolePreviewProps> = ({
  currentRole,
  onRoleChange,
  className,
}) => {
  const { t } = useLanguage();
  
  const currentRoleConfig = roles.find(r => r.type === currentRole) || roles[0];
  const CurrentIcon = currentRoleConfig.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={currentRole !== 'real' ? 'default' : 'outline'} 
          size="sm" 
          className={cn("gap-2", className)}
        >
          <Eye className="w-4 h-4" />
          <CurrentIcon className={cn("w-4 h-4", currentRoleConfig.color)} />
          <span className="hidden sm:inline">{t(currentRoleConfig.labelKey)}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-56 bg-popover z-50">
        <DropdownMenuLabel>{t('rolePreview.title')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {roles.map((role) => {
          const Icon = role.icon;
          const isActive = currentRole === role.type;
          
          return (
            <DropdownMenuItem
              key={role.type}
              onClick={() => onRoleChange(role.type)}
              className={cn(
                "flex items-center gap-3 cursor-pointer",
                isActive && "bg-accent"
              )}
            >
              <Icon className={cn("w-4 h-4", role.color)} />
              <span className="flex-1">{t(role.labelKey)}</span>
              {isActive && (
                <span className="text-xs text-muted-foreground">✓</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Banner component shown when previewing as different role
interface RolePreviewBannerProps {
  previewRole: PreviewRole;
  onReset: () => void;
}

export const RolePreviewBanner: React.FC<RolePreviewBannerProps> = ({
  previewRole,
  onReset,
}) => {
  const { t } = useLanguage();
  
  if (previewRole === 'real') return null;
  
  const roleConfig = roles.find(r => r.type === previewRole);
  const Icon = roleConfig?.icon || User;
  
  const bgColors: Record<PreviewRole, string> = {
    admin: 'bg-amber-500',
    client: 'bg-blue-500',
    partner: 'bg-green-500',
    specjalista: 'bg-purple-500',
    anonymous: 'bg-muted-foreground',
    real: 'bg-primary',
  };

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-[60]",
      "text-white text-center py-2 px-4",
      "flex items-center justify-center gap-3",
      "shadow-lg",
      bgColors[previewRole]
    )}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">
        {t('rolePreview.viewingAs')}: <strong>{t(roleConfig?.labelKey || '')}</strong>
      </span>
      <Button 
        size="sm" 
        variant="ghost" 
        onClick={onReset}
        className="text-white hover:bg-white/20 gap-1 h-7"
      >
        <RotateCcw className="w-3 h-3" />
        {t('rolePreview.reset')}
      </Button>
    </div>
  );
};
