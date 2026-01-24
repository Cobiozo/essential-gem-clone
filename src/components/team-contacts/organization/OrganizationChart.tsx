import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, Users, ArrowUp, Star, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrganizationTreeNode, OrganizationMember } from '@/hooks/useOrganizationTree';
import { OrganizationTreeSettings } from '@/hooks/useOrganizationTreeSettings';
import { OrganizationNode } from './OrganizationNode';

interface OrganizationChartProps {
  tree: OrganizationTreeNode | null;
  upline: OrganizationMember | null;
  settings: OrganizationTreeSettings;
  statistics: {
    total: number;
    partners: number;
    specjalisci: number;
    clients: number;
  };
}

interface TreeBranchProps {
  node: OrganizationTreeNode;
  settings: OrganizationTreeSettings;
  level: number;
  isRoot?: boolean;
}

const TreeBranch: React.FC<TreeBranchProps> = ({ node, settings, level, isRoot = false }) => {
  const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = node.children.length > 0;

  return (
    <div className="flex flex-col items-center">
      {/* Node */}
      <div className="relative">
        <OrganizationNode
          node={node}
          settings={settings}
          isRoot={isRoot}
          size={settings.graph_node_size}
          onClick={hasChildren && settings.graph_expandable ? () => setIsExpanded(!isExpanded) : undefined}
        />
        
        {/* Expand/collapse button */}
        {hasChildren && settings.graph_expandable && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 w-6 rounded-full bg-background border shadow-sm z-10"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div className="relative mt-8">
          {/* Vertical line from parent */}
          {settings.graph_show_lines && (
            <div className="absolute left-1/2 -top-6 w-0.5 h-6 bg-border" />
          )}
          
          {/* Horizontal line connecting children */}
          {settings.graph_show_lines && node.children.length > 1 && (
            <div 
              className="absolute -top-0 h-0.5 bg-border"
              style={{
                left: `calc(50% / ${node.children.length})`,
                right: `calc(50% / ${node.children.length})`,
              }}
            />
          )}
          
          {/* Children nodes */}
          <div className="flex gap-4 justify-center">
            {node.children.map((child, index) => (
              <div key={child.id} className="relative flex flex-col items-center">
                {/* Vertical line to child */}
                {settings.graph_show_lines && (
                  <div className="absolute left-1/2 -top-2 w-0.5 h-2 bg-border" />
                )}
                <TreeBranch
                  node={child}
                  settings={settings}
                  level={level + 1}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const OrganizationChart: React.FC<OrganizationChartProps> = ({
  tree,
  upline,
  settings,
  statistics,
}) => {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 50));

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
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Struktura organizacji
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={zoom <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[3rem] text-center">{zoom}%</span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomIn}
              disabled={zoom >= 150}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
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
        <ScrollArea className="w-full">
          <div 
            className="min-w-max p-6 origin-top-left transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})` }}
          >
            {/* Upline section */}
            {settings.show_upline && upline && (
              <>
                <div className="flex flex-col items-center mb-8">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <ArrowUp className="w-4 h-4" />
                    <span>Twój opiekun</span>
                  </div>
                  <OrganizationNode
                    node={{
                      ...upline,
                      children: [],
                      childCount: 0,
                    }}
                    settings={settings}
                    isUpline
                    size={settings.graph_node_size}
                  />
                  {/* Connector line */}
                  {settings.graph_show_lines && (
                    <div className="w-0.5 h-8 bg-border mt-2" />
                  )}
                </div>
                <Separator className="mb-8" />
              </>
            )}

            {/* Current user label */}
            <div className="flex items-center justify-center gap-2 text-sm font-medium text-primary mb-4">
              <Star className="w-4 h-4" />
              <span>TY</span>
            </div>

            {/* Main tree */}
            <div className="flex justify-center">
              <TreeBranch
                node={tree}
                settings={settings}
                level={0}
                isRoot
              />
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default OrganizationChart;
