import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Users, ChevronDown, ChevronRight } from 'lucide-react';
import type { TeamContact, TeamMapNode } from './types';

interface TeamMapProps {
  contacts: TeamContact[];
}

const getRoleColor = (role: string) => {
  switch (role) {
    case 'partner': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'specjalista': return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'client': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-muted text-muted-foreground';
  }
};

const getRoleLabel = (role: string) => {
  switch (role) {
    case 'partner': return 'Partner';
    case 'specjalista': return 'Specjalista';
    case 'client': return 'Klient';
    default: return role;
  }
};

const TeamMapNode: React.FC<{ node: TeamMapNode; level: number }> = ({ node, level }) => {
  const [expanded, setExpanded] = React.useState(true);
  const hasChildren = node.children.length > 0;
  
  return (
    <div className="relative">
      {/* Connector line */}
      {level > 0 && (
        <div className="absolute left-0 top-0 w-4 h-6 border-l-2 border-b-2 border-border rounded-bl-lg" 
             style={{ marginLeft: `${(level - 1) * 24 + 8}px` }} />
      )}
      
      <div 
        className="flex items-center gap-2 py-2 px-2 hover:bg-muted/50 rounded-md cursor-pointer transition-colors"
        style={{ marginLeft: `${level * 24}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <div className="w-4 h-4" />
        )}
        
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-4 h-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{node.name}</span>
            {node.eq_id && (
              <span className="text-xs text-muted-foreground">({node.eq_id})</span>
            )}
          </div>
        </div>
        
        <Badge variant="outline" className={getRoleColor(node.role)}>
          {getRoleLabel(node.role)}
        </Badge>
        
        {hasChildren && (
          <Badge variant="secondary" className="text-xs">
            {node.children.length}
          </Badge>
        )}
      </div>
      
      {expanded && hasChildren && (
        <div className="relative">
          {node.children.map((child) => (
            <TeamMapNode key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export const TeamMap: React.FC<TeamMapProps> = ({ contacts }) => {
  // Build tree structure from contacts
  const treeData = useMemo(() => {
    // Create a map of contacts by eq_id
    const contactsByEqId = new Map<string, TeamMapNode>();
    const allNodes: TeamMapNode[] = [];
    
    // Create nodes for all contacts
    contacts.forEach((contact) => {
      const node: TeamMapNode = {
        id: contact.id,
        name: `${contact.first_name} ${contact.last_name}`,
        eq_id: contact.eq_id,
        role: contact.role,
        upline_eq_id: contact.contact_upline_eq_id,
        children: [],
      };
      allNodes.push(node);
      if (contact.eq_id) {
        contactsByEqId.set(contact.eq_id, node);
      }
    });
    
    // Build parent-child relationships
    const rootNodes: TeamMapNode[] = [];
    
    allNodes.forEach((node) => {
      if (node.upline_eq_id && contactsByEqId.has(node.upline_eq_id)) {
        const parent = contactsByEqId.get(node.upline_eq_id);
        parent?.children.push(node);
      } else {
        rootNodes.push(node);
      }
    });
    
    // Sort children by role priority
    const sortByRole = (a: TeamMapNode, b: TeamMapNode) => {
      const priority: Record<string, number> = { partner: 1, specjalista: 2, client: 3 };
      return (priority[a.role] || 99) - (priority[b.role] || 99);
    };
    
    const sortTree = (nodes: TeamMapNode[]) => {
      nodes.sort(sortByRole);
      nodes.forEach(node => sortTree(node.children));
    };
    
    sortTree(rootNodes);
    
    return rootNodes;
  }, [contacts]);

  // Stats
  const stats = useMemo(() => {
    const partners = contacts.filter(c => c.role === 'partner').length;
    const specialists = contacts.filter(c => c.role === 'specjalista').length;
    const clients = contacts.filter(c => c.role === 'client').length;
    return { partners, specialists, clients, total: contacts.length };
  }, [contacts]);

  if (contacts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Brak kontaktów do wyświetlenia na mapie</p>
          <p className="text-sm mt-2">Dodaj kontakty z przypisanym Upline, aby zobaczyć strukturę zespołu</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Wizualna mapa zespołu
        </CardTitle>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getRoleColor('partner')}>Partner</Badge>
            <span className="font-medium">{stats.partners}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getRoleColor('specjalista')}>Specjalista</Badge>
            <span className="font-medium">{stats.specialists}</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={getRoleColor('client')}>Klient</Badge>
            <span className="font-medium">{stats.clients}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-muted-foreground">Łącznie:</span>
            <span className="font-medium">{stats.total}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-1">
            {treeData.map((node) => (
              <TeamMapNode key={node.id} node={node} level={0} />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
