import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

type RoleKey = 'admin' | 'lider' | 'partner' | 'specjalista' | 'client';

interface RoleConfig {
  ring: string;
  bg: string;
  showIcon: boolean;
}

const ROLE_CONFIG: Record<RoleKey, RoleConfig> = {
  admin:       { ring: 'ring-red-500',      bg: 'bg-red-500',      showIcon: true },
  lider:       { ring: 'ring-amber-500',    bg: 'bg-amber-500',    showIcon: false },
  partner:     { ring: 'ring-neutral-400',  bg: 'bg-neutral-400',  showIcon: false },
  specjalista: { ring: 'ring-blue-500',     bg: 'bg-blue-500',     showIcon: false },
  client:      { ring: 'ring-green-500',    bg: 'bg-green-500',    showIcon: false },
};

const SIZE_MAP = {
  sm: { avatar: 'h-9 w-9',  badge: 'w-4 h-4',   icon: 'w-2.5 h-2.5' },
  md: { avatar: 'h-11 w-11', badge: 'w-5 h-5',   icon: 'w-3 h-3' },
};

interface RoleBadgedAvatarProps {
  role: string;
  isLeader?: boolean;
  avatarUrl?: string | null;
  initials: string;
  size?: 'sm' | 'md';
  className?: string;
}

export const RoleBadgedAvatar = ({
  role,
  isLeader,
  avatarUrl,
  initials,
  size = 'md',
  className,
}: RoleBadgedAvatarProps) => {
  const effectiveRole: RoleKey =
    role === 'partner' && isLeader ? 'lider' : (role as RoleKey);
  const config = ROLE_CONFIG[effectiveRole] || ROLE_CONFIG.client;
  const sizes = SIZE_MAP[size];

  return (
    <div className={cn('relative shrink-0', className)}>
      <Avatar className={cn(sizes.avatar, 'ring-2', config.ring)}>
        {avatarUrl && <AvatarImage src={avatarUrl} />}
        <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div
        className={cn(
          'absolute -bottom-0.5 -right-0.5 rounded-full flex items-center justify-center',
          sizes.badge,
          config.bg
        )}
      >
        {config.showIcon && <Shield className={cn(sizes.icon, 'text-white')} />}
      </div>
    </div>
  );
};
