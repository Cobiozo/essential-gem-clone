import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { OrganizationTreeNode } from '@/hooks/useOrganizationTree';
import { OrganizationTreeSettings } from '@/hooks/useOrganizationTreeSettings';
import { Users, Star } from 'lucide-react';

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
    container: 'w-24 p-2',
    avatar: 'w-10 h-10',
    text: 'text-xs',
    badge: 'text-[10px] px-1.5 py-0.5',
  },
  medium: {
    container: 'w-32 p-3',
    avatar: 'w-14 h-14',
    text: 'text-sm',
    badge: 'text-xs px-2 py-0.5',
  },
  large: {
    container: 'w-40 p-4',
    avatar: 'w-16 h-16',
    text: 'text-base',
    badge: 'text-sm px-2.5 py-1',
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

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col items-center rounded-xl border-2 transition-all duration-200',
        sizes.container,
        roleConfig.bgColor,
        roleConfig.borderColor,
        isRoot && 'ring-2 ring-primary ring-offset-2',
        isUpline && 'opacity-75',
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-105'
      )}
    >
      {/* Avatar */}
      {settings.show_avatar && (
        <div className="relative">
          <Avatar className={cn(sizes.avatar, 'border-2', roleConfig.borderColor)}>
            {node.avatar_url ? (
              <AvatarImage src={node.avatar_url} alt={`${node.first_name} ${node.last_name}`} />
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

      {/* Name */}
      <div className={cn('mt-2 text-center font-medium truncate w-full', sizes.text)}>
        {node.first_name || 'Brak'}
      </div>
      <div className={cn('text-center text-muted-foreground truncate w-full', sizes.text)}>
        {node.last_name || 'danych'}
      </div>

      {/* Role Badge */}
      {settings.show_role_badge && (
        <Badge
          variant="secondary"
          className={cn(
            'mt-1',
            sizes.badge,
            roleConfig.badgeColor,
            'text-white'
          )}
        >
          {roleConfig.label}
        </Badge>
      )}

      {/* EQ ID */}
      {settings.show_eq_id && node.eq_id && (
        <div className={cn('mt-1 text-muted-foreground', sizes.text === 'text-xs' ? 'text-[10px]' : 'text-xs')}>
          {node.eq_id}
        </div>
      )}

      {/* Child count */}
      {settings.show_statistics && node.childCount > 0 && (
        <div className={cn('mt-1 flex items-center gap-1 text-muted-foreground', sizes.text === 'text-xs' ? 'text-[10px]' : 'text-xs')}>
          <Users className="w-3 h-3" />
          <span>+{node.childCount}</span>
        </div>
      )}
    </div>
  );
};

export default OrganizationNode;
