import { useState } from 'react';
import { ChevronDown, Users, CheckSquare } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { TeamMemberItem } from './TeamMemberItem';
import type { TeamMemberChannel } from '@/hooks/useUnifiedChat';

interface TeamMembersSectionProps {
  upline: TeamMemberChannel | null;
  members: TeamMemberChannel[];
  selectedUserId: string | null;
  onSelectMember: (userId: string) => void;
  searchQuery: string;
  // Group chat selection
  selectionMode?: boolean;
  onToggleSelectionMode?: () => void;
  selectedMembers?: Set<string>;
  onToggleSelection?: (userId: string) => void;
  onCreateGroupChat?: () => void;
  canCreateGroups?: boolean;
}

export const TeamMembersSection = ({
  upline,
  members,
  selectedUserId,
  onSelectMember,
  searchQuery,
  selectionMode = false,
  onToggleSelectionMode,
  selectedMembers = new Set(),
  onToggleSelection,
  onCreateGroupChat,
  canCreateGroups = false,
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
  const selectedCount = selectedMembers.size;

  return (
    <div className="mb-4">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center justify-between px-4 py-2">
          <CollapsibleTrigger className="flex items-center gap-2 hover:bg-muted/30 transition-colors rounded px-2 py-1 -ml-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Członkowie zespołu
            </span>
            <span className="text-xs text-muted-foreground">
              ({totalCount})
            </span>
            <ChevronDown 
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                isExpanded && 'rotate-180'
              )} 
            />
          </CollapsibleTrigger>

          {/* Group chat button - only for team leaders */}
          {canCreateGroups && members.length > 1 && onToggleSelectionMode && (
            <Button
              size="sm"
              variant={selectionMode ? "secondary" : "ghost"}
              className="h-7 text-xs gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelectionMode();
              }}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              {selectionMode ? 'Anuluj' : 'Wybierz'}
            </Button>
          )}
        </div>

        <CollapsibleContent>
          {/* Upline (guardian) - not selectable for groups */}
          {filteredUpline && (
            <>
              <TeamMemberItem
                member={filteredUpline}
                isSelected={selectedUserId === filteredUpline.userId && !selectionMode}
                onClick={() => !selectionMode && onSelectMember(filteredUpline.userId)}
                badge="Opiekun"
              />
              {filteredMembers.length > 0 && (
                <Separator className="my-1 mx-4" />
              )}
            </>
          )}

          {/* Downline members - selectable in selection mode */}
          {filteredMembers.map(member => (
            <div 
              key={member.userId}
              className={cn(
                "flex items-center",
                selectionMode && "cursor-pointer"
              )}
              onClick={() => {
                if (selectionMode && onToggleSelection) {
                  onToggleSelection(member.userId);
                }
              }}
            >
              {selectionMode && onToggleSelection && (
                <div className="pl-4 pr-2">
                  <Checkbox
                    checked={selectedMembers.has(member.userId)}
                    onCheckedChange={() => onToggleSelection(member.userId)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
              <div className={cn("flex-1", selectionMode && "-ml-2")}>
                <TeamMemberItem
                  member={member}
                  isSelected={selectedUserId === member.userId && !selectionMode}
                  onClick={() => {
                    if (selectionMode && onToggleSelection) {
                      onToggleSelection(member.userId);
                    } else {
                      onSelectMember(member.userId);
                    }
                  }}
                />
              </div>
            </div>
          ))}

          {/* Create group button when selection active */}
          {selectionMode && selectedCount >= 2 && onCreateGroupChat && (
            <div className="px-4 pt-2 pb-1">
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={onCreateGroupChat}
              >
                <Users className="h-4 w-4" />
                Utwórz czat grupowy ({selectedCount})
              </Button>
            </div>
          )}

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
