import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
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
  Mail, 
  MoreHorizontal, 
  Pencil, 
  Key, 
  Trash2, 
  Users, 
  Power,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
  Clock
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
  last_sign_in_at?: string | null;
  // Extended profile data
  phone_number?: string | null;
  street_address?: string | null;
  postal_code?: string | null;
  city?: string | null;
  country?: string | null;
  specialization?: string | null;
  profile_description?: string | null;
  upline_first_name?: string | null;
  upline_last_name?: string | null;
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
  isSelected?: boolean;
  onSelectionChange?: (userId: string, selected: boolean) => void;
  showCheckbox?: boolean;
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

// Colored role badges
const getRoleBadgeClasses = (role: string): string => {
  switch (role?.toLowerCase()) {
    case 'admin': 
      return 'bg-red-500 text-white hover:bg-red-600 border-red-500';
    case 'partner': 
      return 'bg-green-500 text-white hover:bg-green-600 border-green-500';
    case 'specjalista': 
      return 'bg-blue-500 text-white hover:bg-blue-600 border-blue-500';
    case 'client': 
      return 'bg-purple-500 text-white hover:bg-purple-600 border-purple-500';
    case 'user': 
      return 'bg-gray-500 text-white hover:bg-gray-600 border-gray-500';
    default: 
      return 'bg-gray-400 text-white hover:bg-gray-500 border-gray-400';
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
    inactive: { color: 'bg-gray-300', tooltip: 'Zablokowany' },
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
  isSelected = false,
  onSelectionChange,
  showCheckbox = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = getUserStatus(userProfile);
  const isCurrentUser = userProfile.user_id === currentUserId;
  const needsEmailConfirm = !userProfile.email_activated;
  const needsApproval = userProfile.admin_approved === false;
  const needsGuardianFirst = userProfile.guardian_approved === false;

  // Display name - bold name or email as fallback
  const displayName = userProfile.first_name && userProfile.last_name
    ? `${userProfile.first_name} ${userProfile.last_name}`
    : userProfile.email;

  const hasName = userProfile.first_name && userProfile.last_name;

  // Check if there's expandable data
  const hasProfileData = userProfile.specialization || userProfile.profile_description || 
    userProfile.upline_first_name || userProfile.upline_eq_id;
  const hasAddressData = userProfile.street_address || userProfile.city || 
    userProfile.postal_code || userProfile.country;
  const hasExpandableContent = hasProfileData || hasAddressData;

  // Build upline display name
  const uplineName = userProfile.upline_first_name && userProfile.upline_last_name
    ? `${userProfile.upline_first_name} ${userProfile.upline_last_name}`
    : null;

  // Build address string
  const addressParts = [
    userProfile.street_address,
    [userProfile.postal_code, userProfile.city].filter(Boolean).join(' '),
    userProfile.country
  ].filter(Boolean);
  const fullAddress = addressParts.join(', ');

  return (
    <div className={`bg-card border rounded-lg transition-shadow ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''} ${isCurrentUser ? 'border-primary/30' : ''}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        {/* Main card content */}
        <div className="flex items-center gap-3 p-3">
          {/* Selection checkbox */}
          {showCheckbox && (
            <Checkbox
              checked={isSelected}
              onCheckedChange={(checked) => onSelectionChange?.(userProfile.user_id, !!checked)}
              className="flex-shrink-0"
            />
          )}

          {/* Status dot */}
          <StatusDot status={status} />

          {/* Main info */}
          <div className="flex-1 min-w-0">
            {/* First line: Bold name + role badge */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm truncate">{displayName}</span>
              <Badge className={`text-xs h-5 ${getRoleBadgeClasses(userProfile.role)}`}>
                {getRoleDisplayName(userProfile.role)}
              </Badge>
              {/* Email status badge */}
              {userProfile.email_activated ? (
                <Badge variant="outline" className="text-xs h-5 border-green-300 text-green-700 bg-green-50 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
                  ✓ Email
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs h-5 border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
                  ✗ Email
                </Badge>
              )}
              {!userProfile.is_active && (
                <Badge variant="destructive" className="text-xs h-5">
                  Zablokowany
                </Badge>
              )}
            </div>
            
            {/* Second line: EQ ID, email, date, phone */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
              {userProfile.eq_id && (
                <>
                  <span className="font-medium">EQ: {userProfile.eq_id}</span>
                  <span className="text-muted-foreground/50">•</span>
                </>
              )}
              {hasName && (
                <>
                  <span className="truncate">{userProfile.email}</span>
                  <span className="text-muted-foreground/50">•</span>
                </>
              )}
              <span>{new Date(userProfile.created_at).toLocaleDateString('pl-PL')}</span>
              {userProfile.phone_number && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{userProfile.phone_number}</span>
                </>
              )}
              {/* Last sign in */}
              {userProfile.last_sign_in_at && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Ostatnio: {new Date(userProfile.last_sign_in_at).toLocaleString('pl-PL', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: 'numeric', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}</span>
                </>
              )}
            </div>
          </div>

          {/* Expand button - only if there's content to show */}
          {hasExpandableContent && (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">
                {isExpanded ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5 mr-1" />
                    Mniej
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5 mr-1" />
                    Więcej
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          )}

          {/* Quick action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Approve button */}
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
                        <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
                        Administrator
                      </DropdownMenuItem>
                    )}
                    {userProfile.role !== 'partner' && (
                      <DropdownMenuItem onClick={() => onUpdateRole(userProfile.user_id, 'partner')}>
                        <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
                        Partner
                      </DropdownMenuItem>
                    )}
                    {userProfile.role !== 'specjalista' && (
                      <DropdownMenuItem onClick={() => onUpdateRole(userProfile.user_id, 'specjalista')}>
                        <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
                        Specjalista
                      </DropdownMenuItem>
                    )}
                    {userProfile.role !== 'client' && userProfile.role !== 'user' && (
                      <DropdownMenuItem onClick={() => onUpdateRole(userProfile.user_id, 'client')}>
                        <span className="w-2 h-2 rounded-full bg-purple-500 mr-2" />
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
                      {userProfile.is_active ? 'Zablokuj' : 'Odblokuj'}
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

        {/* Expandable content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-0 border-t border-border/50 mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
              {/* Profile data */}
              {hasProfileData && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                    <User className="w-3.5 h-3.5" />
                    Dane profilowe
                  </div>
                  {userProfile.specialization && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Specjalizacja:</span>{' '}
                      <span>{userProfile.specialization}</span>
                    </div>
                  )}
                  {uplineName && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Opiekun:</span>{' '}
                      <span>{uplineName}</span>
                    </div>
                  )}
                  {userProfile.upline_eq_id && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">EQ Opiekuna:</span>{' '}
                      <span>{userProfile.upline_eq_id}</span>
                    </div>
                  )}
                  {userProfile.profile_description && (
                    <div className="text-xs">
                      <span className="text-muted-foreground">Opis:</span>{' '}
                      <span className="line-clamp-2">{userProfile.profile_description}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Account activity section */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                  <Clock className="w-3.5 h-3.5" />
                  Aktywność konta
                </div>
                {userProfile.last_sign_in_at && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Ostatnie logowanie:</span>{' '}
                    <span>{new Date(userProfile.last_sign_in_at).toLocaleString('pl-PL')}</span>
                  </div>
                )}
                {userProfile.email_activated_at && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Email potwierdzony:</span>{' '}
                    <span>{new Date(userProfile.email_activated_at).toLocaleString('pl-PL')}</span>
                  </div>
                )}
                {userProfile.guardian_approved_at && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Zatwierdzony przez opiekuna:</span>{' '}
                    <span>{new Date(userProfile.guardian_approved_at).toLocaleString('pl-PL')}</span>
                  </div>
                )}
                {userProfile.admin_approved_at && (
                  <div className="text-xs">
                    <span className="text-muted-foreground">Zatwierdzony przez admina:</span>{' '}
                    <span>{new Date(userProfile.admin_approved_at).toLocaleString('pl-PL')}</span>
                  </div>
                )}
                <div className="text-xs">
                  <span className="text-muted-foreground">Data rejestracji:</span>{' '}
                  <span>{new Date(userProfile.created_at).toLocaleString('pl-PL')}</span>
                </div>
              </div>

              {/* Address data */}
              {hasAddressData && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Dane adresowe
                  </div>
                  {fullAddress && (
                    <div className="text-xs">
                      <span>{fullAddress}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
