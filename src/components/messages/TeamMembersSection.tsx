import { useState } from 'react';
import { ChevronDown, Users } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { TeamMemberItem } from './TeamMemberItem';
import type { TeamMemberChannel } from '@/hooks/useUnifiedChat';

interface TeamMembersSectionProps {
  upline: TeamMemberChannel | null;
  members: TeamMemberChannel[];
  selectedUserId: string | null;
  onSelectMember: (userId: string) => void;
  searchQuery: string;
}

export const TeamMembersSection = ({
  upline,
  members,
  selectedUserId,
  onSelectMember,
  searchQuery,
}: TeamMembersSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Filter by search query
  const filteredUpline = upline && 
    `${upline.firstName} ${upline.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
    ? upline 
    : null;

  const filteredMembers = members.filter(m =>
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Don't show section if nothing matches search
  if (!filteredUpline && filteredMembers.length === 0) {
    return null;
  }

  const totalCount = (upline ? 1 : 0) + members.length;

  return (
    <div className="mb-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Członkowie zespołu
            </span>
            <span className="text-xs text-muted-foreground">
              ({totalCount})
            </span>
          </div>
          <ChevronDown 
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-200',
              isExpanded && 'rotate-180'
            )} 
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          {/* Upline (guardian) - highlighted */}
          {filteredUpline && (
            <>
              <TeamMemberItem
                member={filteredUpline}
                isSelected={selectedUserId === filteredUpline.userId}
                onClick={() => onSelectMember(filteredUpline.userId)}
                badge="Opiekun"
              />
              {filteredMembers.length > 0 && (
                <Separator className="my-1 mx-4" />
              )}
            </>
          )}

          {/* Downline members */}
          {filteredMembers.map(member => (
            <TeamMemberItem
              key={member.userId}
              member={member}
              isSelected={selectedUserId === member.userId}
              onClick={() => onSelectMember(member.userId)}
            />
          ))}

          {/* Empty state when search has no results but section should show */}
          {!filteredUpline && filteredMembers.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted-foreground text-center">
              Brak wyników dla "{searchQuery}"
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
