import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OrganizationTreeNode } from '@/hooks/useOrganizationTree';
import { OrganizationTreeSettings } from '@/hooks/useOrganizationTreeSettings';
import { Users, Star, Mail, Phone } from 'lucide-react';

interface OrganizationNodeProps {
  node: OrganizationTreeNode;
  settings: OrganizationTreeSettings;
  isRoot?: boolean;
  isUpline?: boolean;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

const getRoleConfig = (role: string | null) => {
  switch (role) {
    case 'partner':
      return {
        label: 'Partner',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        borderColor: 'border-blue-300 dark:border-blue-700',
        badgeColor: 'bg-blue-500',
        avatarBg: 'bg-blue-200 dark:bg-blue-800',
        textColor: 'text-blue-700 dark:text-blue-300',
      };
    case 'specjalista':
      return {
        label: 'Specjalista',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        borderColor: 'border-purple-300 dark:border-purple-700',
        badgeColor: 'bg-purple-500',
        avatarBg: 'bg-purple-200 dark:bg-purple-800',
        textColor: 'text-purple-700 dark:text-purple-300',
      };
    case 'client':
      return {
        label: 'Klient',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        borderColor: 'border-green-300 dark:border-green-700',
        badgeColor: 'bg-green-500',
        avatarBg: 'bg-green-200 dark:bg-green-800',
        textColor: 'text-green-700 dark:text-green-300',
      };
    case 'admin':
      return {
        label: 'Admin',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        borderColor: 'border-amber-300 dark:border-amber-700',
        badgeColor: 'bg-amber-500',
        avatarBg: 'bg-amber-200 dark:bg-amber-800',
        textColor: 'text-amber-700 dark:text-amber-300',
      };
    default:
      return {
        label: 'Użytkownik',
        bgColor: 'bg-muted',
        borderColor: 'border-border',
        badgeColor: 'bg-muted-foreground',
        avatarBg: 'bg-muted',
        textColor: 'text-muted-foreground',
      };
  }
};

const getInitials = (firstName: string | null, lastName: string | null): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
};

const sizeConfig = {
  small: {
    container: 'min-w-[200px] p-3',
    avatar: 'w-10 h-10',
    text: 'text-xs',
    nameText: 'text-sm',
    badge: 'text-[10px] px-1.5 py-0.5',
    infoText: 'text-[10px]',
  },
  medium: {
    container: 'min-w-[240px] p-4',
    avatar: 'w-12 h-12',
    text: 'text-sm',
    nameText: 'text-base',
    badge: 'text-xs px-2 py-0.5',
    infoText: 'text-xs',
  },
  large: {
    container: 'min-w-[280px] p-5',
    avatar: 'w-14 h-14',
    text: 'text-base',
    nameText: 'text-lg',
    badge: 'text-sm px-2.5 py-1',
    infoText: 'text-sm',
  },
};

export const OrganizationNode: React.FC<OrganizationNodeProps> = ({
  node,
  settings,
  isRoot = false,
  isUpline = false,
  size = 'medium',
  onClick,
}) => {
  const roleConfig = getRoleConfig(node.role);
  const sizes = sizeConfig[size];
  const initials = getInitials(node.first_name, node.last_name);
  const fullName = `${node.first_name || 'Brak'} ${node.last_name || 'danych'}`.trim();

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col rounded-xl border-2 transition-all duration-200',
        sizes.container,
        roleConfig.bgColor,
        roleConfig.borderColor,
        isRoot && 'ring-2 ring-primary ring-offset-2',
        isUpline && 'opacity-75',
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-105'
      )}
    >
      {/* Main content - two columns */}
      <div className="flex gap-3">
        {/* Left column - Avatar */}
        {settings.show_avatar && (
          <div className="relative flex-shrink-0">
            <Avatar className={cn(sizes.avatar, 'border-2', roleConfig.borderColor)}>
              {node.avatar_url ? (
                <AvatarImage src={node.avatar_url} alt={fullName} />
              ) : null}
              <AvatarFallback className={cn(roleConfig.avatarBg, roleConfig.textColor, 'font-semibold')}>
                {initials}
              </AvatarFallback>
            </Avatar>
            {isRoot && (
              <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                <Star className="w-3 h-3" />
              </div>
            )}
          </div>
        )}

        {/* Right column - Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Name */}
          <div className={cn('font-semibold truncate', sizes.nameText)}>
            {fullName}
          </div>

          {/* Role Badge */}
          {settings.show_role_badge && (
            <Badge
              variant="secondary"
              className={cn(
                'mt-1 w-fit',
                sizes.badge,
                roleConfig.badgeColor,
                'text-white'
              )}
            >
              {roleConfig.label}
            </Badge>
          )}

          {/* Additional info - EQID, Email, Phone */}
          <div className="mt-2 space-y-0.5">
            {settings.show_eq_id && node.eq_id && (
              <div className={cn('text-muted-foreground font-mono', sizes.infoText)}>
                ID: {node.eq_id}
              </div>
            )}
            {settings.show_email && node.email && (
              <div className={cn('flex items-center gap-1 text-muted-foreground truncate', sizes.infoText)}>
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{node.email}</span>
              </div>
            )}
            {settings.show_phone && node.phone_number && (
              <div className={cn('flex items-center gap-1 text-muted-foreground', sizes.infoText)}>
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span>{node.phone_number}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer - Child count */}
      {settings.show_statistics && node.childCount > 0 && (
        <div className={cn(
          'mt-3 pt-2 border-t border-current/10 flex items-center justify-center gap-1.5 text-muted-foreground',
          sizes.infoText
        )}>
          <Users className="w-3.5 h-3.5" />
          <span className="font-medium">+{node.childCount} osób w strukturze</span>
        </div>
      )}
    </div>
  );
};

export default OrganizationNode;
