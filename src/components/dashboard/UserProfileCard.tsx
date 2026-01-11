import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useSidebar } from '@/components/ui/sidebar';

export const UserProfileCard: React.FC = () => {
  const { profile, userRole } = useAuth();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const getInitials = () => {
    const first = profile?.first_name?.[0] || '';
    const last = profile?.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getFullName = () => {
    if (profile?.first_name || profile?.last_name) {
      return `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
    }
    return profile?.email?.split('@')[0] || 'Użytkownik';
  };

  const getRoleBadge = () => {
    const role = userRole?.role || profile?.role;
    switch (role) {
      case 'admin':
        return { label: 'Administrator', variant: 'destructive' as const };
      case 'specjalista':
        return { label: 'Specjalista', variant: 'default' as const };
      case 'partner':
        return { label: 'Partner', variant: 'secondary' as const };
      case 'client':
        return { label: 'Klient', variant: 'outline' as const };
      default:
        return { label: 'Użytkownik', variant: 'outline' as const };
    }
  };

  const roleBadge = getRoleBadge();
  // Rank from profile (editable by admin) - cast profile to access rank field
  const rank = (profile as any)?.rank;

  if (isCollapsed) {
    return (
      <div className="flex justify-center py-4">
        <Avatar className="h-10 w-10 ring-2 ring-primary/20">
          <AvatarImage src={undefined} alt={getFullName()} />
          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-semibold text-sm">
            {getInitials()}
          </AvatarFallback>
        </Avatar>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6 px-4">
      {/* Avatar */}
      <Avatar className="h-20 w-20 ring-4 ring-primary/20 shadow-lg">
        <AvatarImage src={undefined} alt={getFullName()} />
        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground font-bold text-xl">
          {getInitials()}
        </AvatarFallback>
      </Avatar>

      {/* Name */}
      <div className="text-center space-y-1">
        <h3 className="font-semibold text-sidebar-foreground text-base leading-tight">
          {getFullName()}
        </h3>
        
        {/* Role Badge */}
        <Badge 
          variant={roleBadge.variant}
          className="text-xs font-medium"
        >
          {roleBadge.label}
        </Badge>

        {/* Rank (if set by admin) */}
        {rank && (
          <p className="text-xs text-muted-foreground mt-1 font-medium">
            {rank}
          </p>
        )}
      </div>
    </div>
  );
};
