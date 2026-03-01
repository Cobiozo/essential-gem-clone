import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronDown, ChevronRight, Users, ArrowUp, Star, Mail, Phone, Ban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { OrganizationTreeNode, OrganizationMember } from '@/hooks/useOrganizationTree';
import { OrganizationTreeSettings } from '@/hooks/useOrganizationTreeSettings';

interface OrganizationListProps {
  tree: OrganizationTreeNode | null;
  upline: OrganizationMember | null;
  settings: OrganizationTreeSettings;
  statistics: {
    total: number;
    partners: number;
    specjalisci: number;
    clients: number;
  };
  onBlockUser?: (userId: string, reason?: string) => void;
  blockingInProgress?: boolean;
}

const getRoleConfig = (role: string | null) => {
  switch (role) {
    case 'partner':
      return { label: 'Partner', color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-300' };
    case 'specjalista':
      return { label: 'Specjalista', color: 'bg-purple-500', textColor: 'text-purple-700 dark:text-purple-300' };
    case 'client':
      return { label: 'Klient', color: 'bg-green-500', textColor: 'text-green-700 dark:text-green-300' };
    case 'admin':
      return { label: 'Admin', color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300' };
    default:
      return { label: 'Użytkownik', color: 'bg-muted-foreground', textColor: 'text-muted-foreground' };
  }
};

const getInitials = (firstName: string | null, lastName: string | null): string => {
  const first = firstName?.charAt(0)?.toUpperCase() || '';
  const last = lastName?.charAt(0)?.toUpperCase() || '';
  return first + last || '?';
};

interface ListNodeProps {
  node: OrganizationTreeNode;
  settings: OrganizationTreeSettings;
  level: number;
  isRoot?: boolean;
  onBlockUser?: (userId: string, reason?: string) => void;
  blockingInProgress?: boolean;
}

const ListNode: React.FC<ListNodeProps> = ({ node, settings, level, isRoot = false, onBlockUser, blockingInProgress }) => {
  const [isOpen, setIsOpen] = useState(level < 2);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const roleConfig = getRoleConfig(node.role);
  const hasChildren = node.children.length > 0;
  const initials = getInitials(node.first_name, node.last_name);

  return (
    <div className={cn('relative', level > 0 && 'ml-6')}>
      {/* Connector line */}
      {level > 0 && (
        <div className="absolute left-0 top-0 w-4 h-6 border-l-2 border-b-2 border-border rounded-bl-md -ml-4" />
      )}
      
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div
          className={cn(
            'flex items-center gap-3 p-3 rounded-lg transition-colors',
            isRoot ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/50 hover:bg-muted',
          )}
        >
          {/* Expand/collapse */}
          {hasChildren && settings.graph_expandable ? (
            <CollapsibleTrigger asChild>
              <button className="p-1 hover:bg-muted rounded">
                {isOpen ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6" />
          )}

          {/* Avatar */}
          {settings.show_avatar && (
            <Avatar className="w-10 h-10">
              {node.avatar_url && <AvatarImage src={node.avatar_url} />}
              <AvatarFallback className={cn(roleConfig.textColor, 'bg-muted font-semibold')}>
                {initials}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isRoot && <Star className="w-4 h-4 text-primary" />}
              <span className="font-medium truncate">
                {node.first_name} {node.last_name}
              </span>
              {settings.show_role_badge && (
                <Badge className={cn('text-white', roleConfig.color)}>
                  {roleConfig.label}
                </Badge>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-0.5">
              {settings.show_eq_id && node.eq_id && (
                <span>ID: {node.eq_id}</span>
              )}
              {settings.show_email && node.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {node.email}
                </span>
              )}
              {settings.show_phone && node.phone_number && (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {node.phone_number}
                </span>
              )}
            </div>
          </div>

          {/* Child count */}
          {settings.show_statistics && node.childCount > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {node.childCount}
            </Badge>
          )}

          {/* Block button - only for non-root, non-partner/admin */}
          {!isRoot && onBlockUser && node.role !== 'partner' && node.role !== 'admin' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => {
                e.stopPropagation();
                setBlockDialogOpen(true);
              }}
            >
              <Ban className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Block confirmation dialog */}
        {onBlockUser && (
          <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Zablokuj dostęp</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground">
                Czy na pewno chcesz zablokować dostęp użytkownikowi <strong>{node.first_name} {node.last_name}</strong>?
              </p>
              <Textarea
                placeholder="Powód blokady (opcjonalnie)"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => { setBlockDialogOpen(false); setBlockReason(''); }}>
                  Anuluj
                </Button>
                <Button
                  variant="destructive"
                  disabled={blockingInProgress}
                  onClick={() => {
                    onBlockUser(node.id, blockReason || undefined);
                    setBlockDialogOpen(false);
                    setBlockReason('');
                  }}
                >
                  Zablokuj
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Children */}
        {hasChildren && (
          <CollapsibleContent>
            <div className="mt-2 space-y-2">
              {node.children.map((child) => (
                <ListNode
                  key={child.id}
                  node={child}
                  settings={settings}
                  level={level + 1}
                  onBlockUser={onBlockUser}
                  blockingInProgress={blockingInProgress}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
};

const UplineNode: React.FC<{ member: OrganizationMember; settings: OrganizationTreeSettings }> = ({ member, settings }) => {
  const roleConfig = getRoleConfig(member.role);
  const initials = getInitials(member.first_name, member.last_name);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-dashed">
      {settings.show_avatar && (
        <Avatar className="w-10 h-10">
          {member.avatar_url && <AvatarImage src={member.avatar_url} />}
          <AvatarFallback className={cn(roleConfig.textColor, 'bg-muted font-semibold')}>
            {initials}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {member.first_name} {member.last_name}
          </span>
          {settings.show_role_badge && (
            <Badge className={cn('text-white', roleConfig.color)}>
              {roleConfig.label}
            </Badge>
          )}
        </div>
        
        {settings.show_eq_id && member.eq_id && (
          <div className="text-sm text-muted-foreground">
            ID: {member.eq_id}
          </div>
        )}
      </div>
    </div>
  );
};

export const OrganizationList: React.FC<OrganizationListProps> = ({
  tree,
  upline,
  settings,
  statistics,
  onBlockUser,
  blockingInProgress,
}) => {
  if (!tree) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Brak danych do wyświetlenia</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Struktura organizacji
        </CardTitle>
        
        {/* Statistics */}
        {settings.show_statistics && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              Partnerzy: {statistics.partners}
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
              Specjaliści: {statistics.specjalisci}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300">
              Klienci: {statistics.clients}
            </Badge>
            <Badge variant="outline">
              Łącznie: {statistics.total - 1} osób
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          {/* Upline section */}
          {settings.show_upline && upline && (
            <>
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <ArrowUp className="w-4 h-4" />
                  <span>Twój opiekun</span>
                </div>
                <UplineNode member={upline} settings={settings} />
              </div>
              <Separator className="my-6" />
            </>
          )}

          {/* Current user label */}
          <div className="flex items-center gap-2 text-sm font-medium text-primary mb-4">
            <Star className="w-4 h-4" />
            <span>TY I TWOJA ORGANIZACJA</span>
          </div>

          {/* Main tree */}
          <div className="space-y-2">
            <ListNode
              node={tree}
              settings={settings}
              level={0}
              isRoot
              onBlockUser={onBlockUser}
              blockingInProgress={blockingInProgress}
            />
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default OrganizationList;
