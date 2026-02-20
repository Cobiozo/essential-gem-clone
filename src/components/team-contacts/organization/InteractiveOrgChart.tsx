import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Users, ChevronDown } from 'lucide-react';
import { OrganizationTreeNode } from '@/hooks/useOrganizationTree';
import { OrganizationTreeSettings } from '@/hooks/useOrganizationTreeSettings';

interface InteractiveOrgChartProps {
  tree: OrganizationTreeNode | null;
  upline?: any;
  settings: OrganizationTreeSettings;
  statistics: any;
}

type NodeState = 'normal' | 'active' | 'dimmed';

// ─── helper: build rows (level-by-level) ───────────────────────────────────

interface Row {
  nodes: OrganizationTreeNode[];
  parentId: string | null;
  level: number;
}

function buildRows(
  root: OrganizationTreeNode,
  selectedPath: (string | null)[]
): Row[] {
  const rows: Row[] = [];

  // Row 0: always the root
  rows.push({ nodes: [root], parentId: null, level: 0 });

  // Row 1: always show root's children (first sponsoring line)
  if (root.children.length > 0) {
    rows.push({ nodes: root.children, parentId: root.id, level: 1 });
  }

  // Row 2+: only when a node from row 1 (or deeper) is selected
  let currentNode: OrganizationTreeNode = root;
  for (let i = 0; i < selectedPath.length; i++) {
    const selectedId = selectedPath[i];
    if (!selectedId) break;

    const found = currentNode.children.find(c => c.id === selectedId) ?? null;
    if (!found || found.children.length === 0) break;

    rows.push({ nodes: found.children, parentId: found.id, level: i + 2 });
    currentNode = found;
  }

  return rows;
}

// ─── helper: role styles ───────────────────────────────────────────────────

const getRoleConfig = (role: string | null) => {
  switch (role) {
    case 'partner':
      return {
        label: 'Partner',
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        border: 'border-blue-200 dark:border-blue-700',
        badge: 'bg-blue-500',
        avatarBg: 'bg-blue-100 dark:bg-blue-900',
        text: 'text-blue-700 dark:text-blue-300',
        activeBg: 'bg-blue-100 dark:bg-blue-900/60',
      };
    case 'specjalista':
      return {
        label: 'Specjalista',
        bg: 'bg-purple-50 dark:bg-purple-950/30',
        border: 'border-purple-200 dark:border-purple-700',
        badge: 'bg-purple-500',
        avatarBg: 'bg-purple-100 dark:bg-purple-900',
        text: 'text-purple-700 dark:text-purple-300',
        activeBg: 'bg-purple-100 dark:bg-purple-900/60',
      };
    case 'client':
      return {
        label: 'Klient',
        bg: 'bg-green-50 dark:bg-green-950/30',
        border: 'border-green-200 dark:border-green-700',
        badge: 'bg-green-500',
        avatarBg: 'bg-green-100 dark:bg-green-900',
        text: 'text-green-700 dark:text-green-300',
        activeBg: 'bg-green-100 dark:bg-green-900/60',
      };
    default:
      return {
        label: 'Użytkownik',
        bg: 'bg-muted/40',
        border: 'border-border',
        badge: 'bg-muted-foreground',
        avatarBg: 'bg-muted',
        text: 'text-muted-foreground',
        activeBg: 'bg-muted/80',
      };
  }
};

const getInitials = (firstName: string | null, lastName: string | null) =>
  ((firstName?.charAt(0) ?? '') + (lastName?.charAt(0) ?? '')).toUpperCase() || '?';

// ─── OrgNode card ──────────────────────────────────────────────────────────

interface OrgNodeCardProps {
  node: OrganizationTreeNode;
  state: NodeState;
  isRoot?: boolean;
  settings: OrganizationTreeSettings;
  onClick?: () => void;
  nodeRef?: React.RefObject<HTMLDivElement>;
}

const OrgNodeCard: React.FC<OrgNodeCardProps> = ({
  node,
  state,
  isRoot = false,
  settings,
  onClick,
  nodeRef,
}) => {
  const role = getRoleConfig(node.role);
  const initials = getInitials(node.first_name, node.last_name);
  const fullName = `${node.first_name ?? 'Brak'} ${node.last_name ?? 'danych'}`.trim();
  const hasChildren = node.children.length > 0;

  return (
    <div
      ref={nodeRef}
      data-node-id={node.id}
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-1.5 rounded-xl border-2 p-3 select-none touch-manipulation',
        'min-w-[140px] max-w-[190px]',
        'transition-all duration-300 ease-in-out',
        role.border,
        state === 'normal' && [role.bg, onClick && 'cursor-pointer hover:shadow-md hover:scale-[1.03]'],
        state === 'active' && [
          role.activeBg,
          'ring-2 ring-primary ring-offset-2 shadow-lg scale-[1.08]',
          'cursor-pointer',
        ],
        state === 'dimmed' && [
          role.bg,
          'opacity-40 scale-95 grayscale cursor-pointer',
        ],
        isRoot && 'ring-2 ring-primary ring-offset-2',
      )}
    >
      {/* Avatar + name row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-shrink-0">
          <Avatar className="w-10 h-10 border border-current/20">
            {node.avatar_url && <AvatarImage src={node.avatar_url} alt={fullName} />}
            <AvatarFallback className={cn(role.avatarBg, role.text, 'text-[10px] font-bold')}>
              {initials}
            </AvatarFallback>
          </Avatar>
          {isRoot && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
              <Star className="w-2.5 h-2.5" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate leading-tight">{fullName}</p>
          {settings.show_role_badge && (
            <span
              className={cn(
                'inline-block mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-medium text-white leading-none',
                role.badge
              )}
            >
              {role.label}
            </span>
          )}
        </div>
      </div>

      {/* EQID */}
      {settings.show_eq_id && node.eq_id && (
        <p className="text-[9px] text-muted-foreground font-mono">EQID: {node.eq_id}</p>
      )}

      {/* Child count + expand indicator */}
      {settings.show_statistics && hasChildren && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
            <Users className="w-2.5 h-2.5" />
            <span>+{node.childCount}</span>
          </div>
          {state === 'active' && (
            <ChevronDown className="w-3 h-3 text-primary animate-bounce" />
          )}
        </div>
      )}
    </div>
  );
};

// ─── SVG connector layer ───────────────────────────────────────────────────

interface ConnectorLayerProps {
  parentRef: React.RefObject<HTMLDivElement>;
  childRefs: React.RefObject<HTMLDivElement>[];
  containerRef: React.RefObject<HTMLDivElement>;
}

const ConnectorLayer: React.FC<ConnectorLayerProps> = ({ parentRef, childRefs, containerRef }) => {
  const [paths, setPaths] = useState<string[]>([]);

  const recalculate = useCallback(() => {
    if (!parentRef.current || !containerRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const parentRect = parentRef.current.getBoundingClientRect();

    const fromX = parentRect.left + parentRect.width / 2 - containerRect.left;
    const fromY = parentRect.bottom - containerRect.top;

    const newPaths: string[] = [];

    childRefs.forEach(ref => {
      if (!ref.current) return;
      const childRect = ref.current.getBoundingClientRect();
      const toX = childRect.left + childRect.width / 2 - containerRect.left;
      const toY = childRect.top - containerRect.top;

      const midY = (fromY + toY) / 2;
      newPaths.push(`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`);
    });

    setPaths(newPaths);
  }, [parentRef, childRefs, containerRef]);

  useEffect(() => {
    const t = setTimeout(recalculate, 50);
    window.addEventListener('resize', recalculate);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', recalculate);
    };
  }, [recalculate]);

  if (paths.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ width: '100%', height: '100%' }}
    >
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
          strokeOpacity="0.4"
          strokeDasharray="4 3"
        />
      ))}
    </svg>
  );
};

// ─── Main component ────────────────────────────────────────────────────────

export const InteractiveOrgChart: React.FC<InteractiveOrgChartProps> = ({
  tree,
  settings,
}) => {
  // selectedPath[0] = which root-child is selected (null = none)
  // selectedPath[1] = which grandchild is selected, etc.
  const [selectedPath, setSelectedPath] = useState<(string | null)[]>([]);

  // Reset when tree changes
  useEffect(() => {
    setSelectedPath([]);
  }, [tree?.id]);

  const containerRef = useRef<HTMLDivElement>(null);

  // Map: `${level}-${nodeId}` → ref
  const nodeRefsMap = useRef<Map<string, React.RefObject<HTMLDivElement>>>(new Map());

  const getNodeRef = (level: number, nodeId: string): React.RefObject<HTMLDivElement> => {
    const key = `${level}-${nodeId}`;
    if (!nodeRefsMap.current.has(key)) {
      nodeRefsMap.current.set(key, React.createRef<HTMLDivElement>());
    }
    return nodeRefsMap.current.get(key)!;
  };

  // rowIndex = index of the row in rows[]
  // row 1 → selectedPath[0], row 2 → selectedPath[1], etc.
  const handleNodeClick = (node: OrganizationTreeNode, rowIndex: number) => {
    const pathIndex = rowIndex - 1; // row 1 → index 0
    setSelectedPath(prev => {
      const newPath = prev.slice(0, pathIndex + 1);
      newPath[pathIndex] = newPath[pathIndex] === node.id ? null : node.id;
      return newPath;
    });
  };

  if (!tree) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        Brak danych struktury
      </div>
    );
  }

  const rows = buildRows(tree, selectedPath);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-x-auto pb-6"
      style={{ minHeight: '200px' }}
    >
      <div className="flex flex-col items-center gap-0 min-w-max mx-auto px-4">
        {rows.map((row, rowIndex) => {
          const isRootRow = rowIndex === 0;

          // For row 1: selectedPath[0], for row 2: selectedPath[1], etc.
          const pathIndex = rowIndex - 1;
          const selectedInRow: string | null =
            pathIndex >= 0 && pathIndex < selectedPath.length
              ? selectedPath[pathIndex]
              : null;

          // Parent ref for SVG connectors:
          // row 1 → parent is always root (level 0)
          // row 2 → parent is selectedPath[0] (level 1)
          // row N → parent is selectedPath[N-2] (level N-1)
          let parentRef: React.RefObject<HTMLDivElement> | null = null;
          if (rowIndex === 1) {
            parentRef = getNodeRef(0, tree.id);
          } else if (rowIndex > 1) {
            const parentId = selectedPath[rowIndex - 2];
            if (parentId) {
              parentRef = getNodeRef(rowIndex - 1, parentId);
            }
          }

          const childRefs = row.nodes.map(n => getNodeRef(rowIndex, n.id));

          return (
            <div key={`row-${rowIndex}`} className="flex flex-col items-center w-full">
              {/* Connector SVG between parent and this row */}
              {rowIndex > 0 && parentRef && (
                <div className="relative w-full" style={{ height: 0 }}>
                  <ConnectorLayer
                    parentRef={parentRef}
                    childRefs={childRefs}
                    containerRef={containerRef}
                  />
                </div>
              )}

              {/* Spacing between rows */}
              {rowIndex > 0 && <div className="h-10" />}

              {/* Row of nodes */}
              <div
                className={cn(
                  'flex flex-row flex-wrap justify-center gap-3',
                  rowIndex > 0 && 'animate-in fade-in slide-in-from-top-3 duration-300'
                )}
              >
                {row.nodes.map(node => {
                  let state: NodeState = 'normal';
                  if (!isRootRow) {
                    if (selectedInRow === null) {
                      state = 'normal'; // nothing selected → all normal
                    } else {
                      state = node.id === selectedInRow ? 'active' : 'dimmed';
                    }
                  }

                  const nodeRef = getNodeRef(rowIndex, node.id);

                  return (
                    <OrgNodeCard
                      key={node.id}
                      node={node}
                      state={state}
                      isRoot={isRootRow}
                      settings={settings}
                      nodeRef={nodeRef}
                      onClick={
                        isRootRow
                          ? undefined // root is not clickable
                          : () => handleNodeClick(node, rowIndex)
                      }
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InteractiveOrgChart;
