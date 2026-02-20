import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationTreeSettings } from './useOrganizationTreeSettings';

export interface OrganizationMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  eq_id: string | null;
  upline_eq_id: string | null;
  role: string | null;
  avatar_url: string | null;
  email: string | null;
  phone_number: string | null;
  level: number;
}

export interface OrganizationTreeNode extends OrganizationMember {
  children: OrganizationTreeNode[];
  childCount: number; // Total descendants count
}

export const useOrganizationTree = () => {
  const { profile } = useAuth();
  const { settings, loading: settingsLoading, canAccessTree, getMaxDepthForRole } = useOrganizationTreeSettings();
  
  const [treeData, setTreeData] = useState<OrganizationMember[]>([]);
  const [upline, setUpline] = useState<OrganizationMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchTree = useCallback(async () => {
    if (settingsLoading) return;
    
    if (!profile?.eq_id) {
      setLoading(false);
      setError('Brak identyfikatora EQ w profilu');
      return;
    }
    
    if (!canAccessTree()) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const maxDepth = getMaxDepthForRole();
      
      // Fetch downline tree using the recursive function
      const { data: downlineData, error: downlineError } = await supabase
        .rpc('get_organization_tree', {
          p_root_eq_id: profile.eq_id,
          p_max_depth: maxDepth
        });

      if (downlineError) {
        console.error('Error fetching organization tree:', downlineError);
        setError(downlineError.message);
        return;
      }

      setTreeData(downlineData || []);

      // Fetch upline (1 level up) if setting enabled
      if (settings?.show_upline && profile.upline_eq_id) {
        const { data: uplineData, error: uplineError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, eq_id, upline_eq_id, role, avatar_url, email, phone_number')
          .eq('eq_id', profile.upline_eq_id)
          .eq('is_active', true)
          .single();

        if (!uplineError && uplineData) {
          setUpline({
            id: uplineData.user_id,
            first_name: uplineData.first_name,
            last_name: uplineData.last_name,
            eq_id: uplineData.eq_id,
            upline_eq_id: uplineData.upline_eq_id,
            role: uplineData.role,
            avatar_url: uplineData.avatar_url,
            email: uplineData.email,
            phone_number: uplineData.phone_number,
            level: -1, // Above the root
          });
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Nie udało się pobrać struktury organizacji');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.eq_id, profile?.upline_eq_id, settingsLoading, settings]);

  // Build tree structure from flat data
  const buildTree = useCallback((members: OrganizationMember[]): OrganizationTreeNode | null => {
    if (members.length === 0) return null;

    // Create a map for quick lookup
    const nodeMap = new Map<string, OrganizationTreeNode>();
    
    // First pass: create nodes
    members.forEach(member => {
      if (member.eq_id) {
        nodeMap.set(member.eq_id, {
          ...member,
          children: [],
          childCount: 0,
        });
      }
    });

    // Second pass: build parent-child relationships
    let root: OrganizationTreeNode | null = null;
    
    members.forEach(member => {
      if (member.eq_id) {
        const node = nodeMap.get(member.eq_id);
        if (!node) return;

        if (member.level === 0) {
          root = node;
        } else if (member.upline_eq_id) {
          const parent = nodeMap.get(member.upline_eq_id);
          if (parent) {
            parent.children.push(node);
          }
        }
      }
    });

    // Third pass: calculate child counts
    const calculateChildCount = (node: OrganizationTreeNode): number => {
      let count = node.children.length;
      node.children.forEach(child => {
        count += calculateChildCount(child);
      });
      node.childCount = count;
      return count;
    };

    if (root) {
      calculateChildCount(root);
    }

    return root;
  }, []);

  // Memoized tree structure
  const tree = useMemo(() => buildTree(treeData), [treeData, buildTree]);

  // Statistics
  const statistics = useMemo(() => {
    const stats = {
      total: treeData.length,
      partners: 0,
      specjalisci: 0,
      clients: 0,
      byLevel: new Map<number, number>(),
    };

    treeData.forEach(member => {
      if (member.level > 0) { // Exclude self
        if (member.role === 'partner') stats.partners++;
        else if (member.role === 'specjalista') stats.specjalisci++;
        else if (member.role === 'client') stats.clients++;
      }

      const levelCount = stats.byLevel.get(member.level) || 0;
      stats.byLevel.set(member.level, levelCount + 1);
    });

    return stats;
  }, [treeData]);

  useEffect(() => {
    // Fetch only once after settings are loaded
    if (!settingsLoading && profile?.eq_id && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchTree();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsLoading, profile?.eq_id]); // fetchTree celowo pominięte — reagujemy tylko na stabilne prymitywy

  return {
    tree,
    upline,
    treeData,
    statistics,
    loading: loading || settingsLoading,
    error,
    refetch: fetchTree,
    settings,
    canAccessTree,
  };
};
