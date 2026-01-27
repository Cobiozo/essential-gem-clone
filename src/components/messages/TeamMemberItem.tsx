import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TeamMemberChannel } from '@/hooks/useUnifiedChat';

const ROLE_LABELS: Record<string, string> = {
  partner: 'Partner',
  specjalista: 'Specjalista',
  client: 'Klient',
  admin: 'Administrator',
};

interface TeamMemberItemProps {
  member: TeamMemberChannel;
  isSelected: boolean;
  onClick: () => void;
  badge?: string;
}

export const TeamMemberItem = ({ member, isSelected, onClick, badge }: TeamMemberItemProps) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
      isSelected 
        ? 'bg-primary/10 border-l-2 border-primary' 
        : 'hover:bg-muted/50'
    )}
  >
    <Avatar className="h-9 w-9 shrink-0">
      <AvatarImage src={member.avatarUrl || undefined} />
      <AvatarFallback className="bg-primary/10 text-primary text-sm">
        {member.firstName?.charAt(0)}{member.lastName?.charAt(0)}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="font-medium truncate text-foreground">
          {member.firstName} {member.lastName}
        </span>
        {badge && (
          <Badge variant="secondary" className="text-xs shrink-0 bg-primary/10 text-primary border-0">
            {badge}
          </Badge>
        )}
      </div>
      <span className="text-xs text-muted-foreground">
        {ROLE_LABELS[member.role] || member.role}
        {member.eqId && ` • ${member.eqId}`}
      </span>
    </div>
  </button>
);
