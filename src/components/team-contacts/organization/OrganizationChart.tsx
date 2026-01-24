import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, Users, ArrowUp, Star, ZoomIn, ZoomOut, Move } from 'lucide-react';
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
  highlightedPath: string[];
  selectedNodeId: string | null;
  onNodeClick: (nodeId: string) => void;
}

// Helper function to create smooth curved SVG path
const createCurvePath = (
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  curveRadius: number = 12
): string => {
  const midY = startY + (endY - startY) / 2;
  const direction = Math.sign(endX - startX) || 0;
  
  if (direction === 0) {
    // Straight vertical line
    return `M ${startX} ${startY} L ${endX} ${endY}`;
  }
  
  // Curved path with rounded corners
  return `
    M ${startX} ${startY}
    V ${midY - curveRadius}
    Q ${startX} ${midY}, ${startX + direction * curveRadius} ${midY}
    H ${endX - direction * curveRadius}
    Q ${endX} ${midY}, ${endX} ${midY + curveRadius}
    V ${endY}
  `.trim().replace(/\s+/g, ' ');
};

const TreeBranch: React.FC<TreeBranchProps> = ({ 
  node, 
  settings, 
  level, 
  isRoot = false,
  highlightedPath,
  selectedNodeId,
  onNodeClick,
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasChildren = node.children.length > 0;
  const containerRef = useRef<HTMLDivElement>(null);
  
  const isOnPath = highlightedPath.includes(node.id);
  const isSelected = selectedNodeId === node.id;
  const hasFocus = highlightedPath.length > 0;

  const handleNodeClick = () => {
    onNodeClick(node.id);
  };

  const handleExpandClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // Calculate SVG paths for children connectors
  const childCount = node.children.length;
  const nodeWidth = settings.graph_node_size === 'small' ? 160 : settings.graph_node_size === 'medium' ? 180 : 200;
  const gap = 16;
  const totalWidth = childCount * nodeWidth + (childCount - 1) * gap;
  const centerX = totalWidth / 2;

  return (
    <div className="flex flex-col items-center" ref={containerRef}>
      {/* Node */}
      <div className="relative">
        <OrganizationNode
          node={node}
          settings={settings}
          isRoot={isRoot}
          size={settings.graph_node_size}
          onClick={handleNodeClick}
          isOnPath={isOnPath}
          isSelected={isSelected}
          hasFocus={hasFocus}
        />
        
        {/* Expand/collapse button */}
        {hasChildren && settings.graph_expandable && (
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute -bottom-2.5 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-background border shadow-sm z-10",
              isOnPath && hasFocus && "border-primary"
            )}
            onClick={handleExpandClick}
          >
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {/* Children with SVG connectors */}
      {hasChildren && isExpanded && (
        <div className="relative mt-8">
          {/* SVG Connectors overlay */}
          {settings.graph_show_lines && (
            <svg 
              className="absolute pointer-events-none overflow-visible"
              style={{ 
                width: totalWidth,
                height: 48,
                left: '50%',
                transform: 'translateX(-50%)',
                top: -24,
              }}
            >
              {node.children.map((child, index) => {
                const childIsOnPath = highlightedPath.includes(child.id);
                const childX = index * (nodeWidth + gap) + nodeWidth / 2;
                const isHighlighted = (isOnPath || childIsOnPath) && hasFocus;
                
                return (
                  <path
                    key={child.id}
                    d={createCurvePath(centerX, 0, childX, 48, 14)}
                    className={cn(
                      "tree-connector fill-none transition-all duration-300",
                      isHighlighted 
                        ? "stroke-primary" 
                        : hasFocus 
                          ? "stroke-border/40" 
                          : "stroke-border"
                    )}
                    strokeWidth={isHighlighted ? 3 : 2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      animationDelay: `${index * 0.08}s`
                    }}
                  />
                );
              })}
            </svg>
          )}
          
          {/* Children nodes */}
          <div className="flex gap-4 justify-center">
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <TreeBranch
                  node={child}
                  settings={settings}
                  level={level + 1}
                  highlightedPath={highlightedPath}
                  selectedNodeId={selectedNodeId}
                  onNodeClick={onNodeClick}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to find path from root to target node
const findPathToNode = (root: OrganizationTreeNode, targetId: string, path: string[] = []): string[] | null => {
  const currentPath = [...path, root.id];
  if (root.id === targetId) return currentPath;
  for (const child of root.children) {
    const result = findPathToNode(child, targetId, currentPath);
    if (result) return result;
  }
  return null;
};

export const OrganizationChart: React.FC<OrganizationChartProps> = ({
  tree,
  upline,
  settings,
  statistics,
}) => {
  const [zoom, setZoom] = useState(100);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 10, 150));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 10, 30));

  const handleNodeClick = useCallback((nodeId: string) => {
    if (!tree) return;
    
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
      setHighlightedPath([]);
    } else {
      setSelectedNodeId(nodeId);
      const path = findPathToNode(tree, nodeId);
      setHighlightedPath(path || []);
    }
  }, [tree, selectedNodeId]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Reset only if clicked on background, not on a node
    if (!target.closest('[data-org-node]')) {
      setSelectedNodeId(null);
      setHighlightedPath([]);
    }
  }, []);

  // Auto-fit zoom based on first level children
  useEffect(() => {
    if (tree && tree.children.length > 0) {
      const childCount = tree.children.length;
      const nodeWidth = 180; // approximate node width
      const gap = 12; // gap between nodes
      const estimatedWidth = childCount * nodeWidth + (childCount - 1) * gap;
      const viewportWidth = window.innerWidth - 100;
      const autoZoom = Math.min(100, Math.floor((viewportWidth / estimatedWidth) * 100));
      setZoom(Math.max(30, autoZoom));
    }
  }, [tree]);

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX + scrollContainerRef.current.scrollLeft,
      y: e.clientY + scrollContainerRef.current.scrollTop,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    scrollContainerRef.current.scrollLeft = dragStart.x - e.clientX;
    scrollContainerRef.current.scrollTop = dragStart.y - e.clientY;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

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
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="w-4 h-4" />
            Struktura organizacji
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleZoomOut}
              disabled={zoom <= 30}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs font-medium min-w-[2.5rem] text-center">{zoom}%</span>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={handleZoomIn}
              disabled={zoom >= 150}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <div className="ml-2 flex items-center gap-1 text-xs text-muted-foreground">
              <Move className="w-3 h-3" />
              <span className="hidden sm:inline">Przeciągnij</span>
            </div>
          </div>
        </div>
        
        {/* Statistics */}
        {settings.show_statistics && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 text-[10px] px-1.5 py-0">
              Partnerzy: {statistics.partners}
            </Badge>
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-[10px] px-1.5 py-0">
              Specjaliści: {statistics.specjalisci}
            </Badge>
            <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1.5 py-0">
              Klienci: {statistics.clients}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Łącznie: {statistics.total - 1}
            </Badge>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <div 
          ref={scrollContainerRef}
          className={cn(
            "w-full overflow-auto p-4",
            isDragging ? "cursor-grabbing" : "cursor-grab"
          )}
          style={{ maxHeight: 'calc(100vh - 280px)' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          <div 
            className="min-w-max origin-top-left transition-transform duration-200"
            style={{ transform: `scale(${zoom / 100})` }}
            onClick={handleContainerClick}
          >
            {/* Upline section */}
            {settings.show_upline && upline && (
              <>
                <div className="flex flex-col items-center mb-6">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
                    <ArrowUp className="w-3 h-3" />
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
                    <div className="w-0.5 h-6 bg-border mt-2 rounded-full" />
                  )}
                </div>
                <Separator className="mb-6" />
              </>
            )}

            {/* Current user label */}
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary mb-3">
              <Star className="w-3 h-3" />
              <span>TY</span>
            </div>

            {/* Main tree */}
            <div className="flex justify-center">
              <TreeBranch
                node={tree}
                settings={settings}
                level={0}
                isRoot
                highlightedPath={highlightedPath}
                selectedNodeId={selectedNodeId}
                onNodeClick={handleNodeClick}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrganizationChart;
