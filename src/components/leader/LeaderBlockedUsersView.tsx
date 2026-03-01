import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ShieldX, UserCheck, Clock } from 'lucide-react';
import { useLeaderBlocks } from '@/hooks/useLeaderBlocks';
import { format } from 'date-fns';
import { pl } from 'date-fns/locale';

const LeaderBlockedUsersView: React.FC = () => {
  const { blocks, loading, unblockUser } = useLeaderBlocks();

  if (loading) {
    return (
      <div className="flex justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-40 gap-2">
          <ShieldX className="h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Brak zablokowanych użytkowników</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {blocks.map((block) => {
        const initials = `${block.blocked_first_name?.charAt(0) || ''}${block.blocked_last_name?.charAt(0) || ''}` || '?';
        
        return (
          <div key={block.id} className="flex items-start gap-3 p-4 rounded-lg border bg-muted/30">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarFallback className="bg-destructive/10 text-destructive font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {block.blocked_first_name} {block.blocked_last_name}
                </span>
                {block.blocked_eq_id && (
                  <Badge variant="outline" className="text-xs">
                    ID: {block.blocked_eq_id}
                  </Badge>
                )}
              </div>

              <div className="text-xs text-muted-foreground space-y-0.5">
                <p className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {format(new Date(block.blocked_at), 'dd MMM yyyy, HH:mm', { locale: pl })}
                </p>
                <p>
                  Zablokował: <span className="font-medium text-foreground">{block.blocked_by_first_name} {block.blocked_by_last_name}</span>
                </p>
                {block.reason && (
                  <p>Powód: <span className="text-foreground">{block.reason}</span></p>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => unblockUser.mutate(block.id)}
              disabled={unblockUser.isPending}
              className="shrink-0"
            >
              <UserCheck className="h-4 w-4 mr-1" />
              Przywróć
            </Button>
          </div>
        );
      })}
    </div>
  );
};

export default LeaderBlockedUsersView;
