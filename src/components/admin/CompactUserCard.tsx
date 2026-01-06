import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  CheckCircle, 
  Clock, 
  Mail, 
  MoreHorizontal, 
  Pencil, 
  Key, 
  Trash2, 
  Users, 
  Power,
  AlertCircle
} from 'lucide-react';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  role: string;
  first_name?: string;
  last_name?: string;
  eq_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email_confirmed_at?: string | null;
  guardian_approved?: boolean;
  guardian_approved_at?: string | null;
  admin_approved?: boolean;
  admin_approved_at?: string | null;
  upline_eq_id?: string | null;
  guardian_name?: string | null;
  email_activated?: boolean;
  email_activated_at?: string | null;
}

interface CompactUserCardProps {
  userProfile: UserProfile;
  currentUserId?: string;
  onConfirmEmail: (userId: string) => void;
  onEditUser: (userProfile: UserProfile) => void;
  onResetPassword: (email: string) => void;
  onToggleStatus: (userId: string, currentStatus: boolean) => void;
  onDeleteUser: (userId: string, email: string) => void;
  onAdminApprove: (userId: string, bypassGuardian?: boolean) => void;
  onUpdateRole: (userId: string, role: 'user' | 'client' | 'admin' | 'partner' | 'specjalista') => void;
  isDeleting?: boolean;
  isResettingPassword?: boolean;
}

const getRoleDisplayName = (role: string): string => {
  switch (role?.toLowerCase()) {
    case 'admin': return 'Admin';
    case 'partner': return 'Partner';
    case 'specjalista': return 'Specjalista';
    case 'client': return 'Klient';
    case 'user': return 'Użytkownik';
    default: return role || 'Nieznana';
  }
};

const getRoleBadgeVariant = (role: string): 'default' | 'secondary' | 'outline' => {
  switch (role?.toLowerCase()) {
    case 'admin': return 'default';
    case 'partner': 
    case 'specjalista': return 'outline';
    default: return 'secondary';
  }
};

type UserStatus = 'fully_approved' | 'awaiting_admin' | 'awaiting_guardian' | 'email_pending' | 'inactive';

const getUserStatus = (userProfile: UserProfile): UserStatus => {
  if (!userProfile.is_active) return 'inactive';
  if (!userProfile.email_activated) return 'email_pending';
  if (!userProfile.guardian_approved) return 'awaiting_guardian';
  if (!userProfile.admin_approved) return 'awaiting_admin';
  return 'fully_approved';
};

const StatusDot: React.FC<{ status: UserStatus }> = ({ status }) => {
  const config: Record<UserStatus, { color: string; tooltip: string }> = {
    fully_approved: { color: 'bg-green-500', tooltip: 'W pełni zatwierdzony' },
    awaiting_admin: { color: 'bg-amber-500', tooltip: 'Oczekuje na admina' },
    awaiting_guardian: { color: 'bg-red-500', tooltip: 'Oczekuje na opiekuna' },
    email_pending: { color: 'bg-gray-400', tooltip: 'Email niepotwierdzony' },
    inactive: { color: 'bg-gray-300', tooltip: 'Nieaktywny' },
  };

  const { color, tooltip } = config[status];

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${color} flex-shrink-0`} />
        </TooltipTrigger>
        <TooltipContent>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const CompactUserCard: React.FC<CompactUserCardProps> = ({
  userProfile,
  currentUserId,
  onConfirmEmail,
  onEditUser,
  onResetPassword,
  onToggleStatus,
  onDeleteUser,
  onAdminApprove,
  onUpdateRole,
  isDeleting,
  isResettingPassword,
}) => {
  const status = getUserStatus(userProfile);
  const isCurrentUser = userProfile.user_id === currentUserId;
  const needsEmailConfirm = !userProfile.email_activated;
  const needsApproval = userProfile.admin_approved === false;
  const needsGuardianFirst = userProfile.guardian_approved === false;

  return (
    <div className="flex items-center gap-3 p-3 bg-card border rounded-lg hover:shadow-sm transition-shadow">
      {/* Status dot */}
      <StatusDot status={status} />

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{userProfile.email}</span>
          <Badge variant={getRoleBadgeVariant(userProfile.role)} className="text-xs h-5">
            {getRoleDisplayName(userProfile.role)}
          </Badge>
          {!userProfile.is_active && (
            <Badge variant="destructive" className="text-xs h-5">
              Nieaktywny
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
          {userProfile.first_name && userProfile.last_name && (
            <span>{userProfile.first_name} {userProfile.last_name}</span>
          )}
          {userProfile.eq_id && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span>EQ: {userProfile.eq_id}</span>
            </>
          )}
          <span className="text-muted-foreground/50">•</span>
          <span>{new Date(userProfile.created_at).toLocaleDateString('pl-PL')}</span>
        </div>
      </div>

      {/* Quick action buttons */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {/* Approve button - most important action for pending users */}
        {needsApproval && (
          needsGuardianFirst ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onAdminApprove(userProfile.user_id, true)}
                    className="h-8 text-xs bg-amber-600 hover:bg-amber-700"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1" />
                    Zatwierdź
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Zatwierdź z pominięciem opiekuna</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="default"
              size="sm"
              onClick={() => onAdminApprove(userProfile.user_id)}
              className="h-8 text-xs bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              Zatwierdź
            </Button>
          )
        )}

        {/* Confirm email button */}
        {needsEmailConfirm && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onConfirmEmail(userProfile.user_id)}
                  className="h-8 text-xs border-green-200 text-green-700 hover:bg-green-50"
                >
                  <Mail className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Potwierdź email</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Edit button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEditUser(userProfile)}
                className="h-8 text-xs"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edytuj dane</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onResetPassword(userProfile.email)} disabled={isResettingPassword}>
              <Key className="w-4 h-4 mr-2" />
              Resetuj hasło
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            {/* Role change submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Users className="w-4 h-4 mr-2" />
                Zmień rolę
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {userProfile.role !== 'admin' && (
                  <DropdownMenuItem onClick={() => onUpdateRole(userProfile.user_id, 'admin')}>
                    Administrator
                  </DropdownMenuItem>
                )}
                {userProfile.role !== 'partner' && (
                  <DropdownMenuItem onClick={() => onUpdateRole(userProfile.user_id, 'partner')}>
                    Partner
                  </DropdownMenuItem>
                )}
                {userProfile.role !== 'specjalista' && (
                  <DropdownMenuItem onClick={() => onUpdateRole(userProfile.user_id, 'specjalista')}>
                    Specjalista
                  </DropdownMenuItem>
                )}
                {userProfile.role !== 'client' && userProfile.role !== 'user' && (
                  <DropdownMenuItem onClick={() => onUpdateRole(userProfile.user_id, 'client')}>
                    Klient
                  </DropdownMenuItem>
                )}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {!isCurrentUser && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onToggleStatus(userProfile.user_id, userProfile.is_active)}>
                  <Power className="w-4 h-4 mr-2" />
                  {userProfile.is_active ? 'Dezaktywuj' : 'Aktywuj'}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onDeleteUser(userProfile.user_id, userProfile.email)}
                  disabled={isDeleting}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Usuń użytkownika
                </DropdownMenuItem>
              </>
            )}

            {isCurrentUser && (
              <DropdownMenuItem disabled>
                <AlertCircle className="w-4 h-4 mr-2" />
                To Twoje konto
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
