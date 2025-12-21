import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { EmitEventParams } from '@/types/notifications';

export const useEventSystem = () => {
  const { user, profile } = useAuth();

  const emitEvent = useCallback(async ({
    eventKey,
    payload = {},
    relatedEntityType,
    relatedEntityId,
  }: EmitEventParams): Promise<boolean> => {
    if (!user) {
      console.warn('Cannot emit event: user not authenticated');
      return false;
    }

    try {
      // Get event type id
      const { data: eventType } = await supabase
        .from('notification_event_types')
        .select('id')
        .eq('event_key', eventKey)
        .eq('is_active', true)
        .single();

      if (!eventType) {
        console.warn(`Event type not found or inactive: ${eventKey}`);
        return false;
      }

      // Insert event
      const { error } = await supabase
        .from('notification_events')
        .insert({
          event_type_id: eventType.id,
          event_key: eventKey,
          sender_id: user.id,
          sender_role: profile?.role || 'client',
          payload,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
        });

      if (error) {
        console.error('Error emitting event:', error);
        return false;
      }

      // Process event and create notifications
      await processEvent(eventType.id, user.id, payload, relatedEntityType, relatedEntityId);

      return true;
    } catch (error) {
      console.error('Error in emitEvent:', error);
      return false;
    }
  }, [user, profile]);

  return { emitEvent };
};

async function processEvent(
  eventTypeId: string,
  senderId: string,
  payload: Record<string, any>,
  relatedEntityType?: string,
  relatedEntityId?: string
) {
  try {
    // Get event type info
    const { data: eventType } = await supabase
      .from('notification_event_types')
      .select('*')
      .eq('id', eventTypeId)
      .single();

    if (!eventType) return;

    // Get sender role
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', senderId)
      .single();

    const senderRole = senderProfile?.role || 'client';

    // Get routing rules
    const { data: routes } = await supabase
      .from('notification_role_routes')
      .select('*')
      .eq('event_type_id', eventTypeId)
      .eq('source_role', senderRole)
      .eq('is_enabled', true);

    if (!routes || routes.length === 0) return;

    // Get rate limits
    const { data: limits } = await supabase
      .from('notification_limits')
      .select('*')
      .eq('event_type_id', eventTypeId)
      .eq('is_active', true)
      .single();

    // Get target users based on roles
    const targetRoles = routes.map(r => r.target_role) as ('admin' | 'client' | 'partner' | 'specjalista' | 'user')[];
    
    const { data: targetUsers } = await supabase
      .from('user_roles')
      .select('user_id, role')
      .in('role', targetRoles);

    if (!targetUsers) return;

    // Filter out sender and check cooldowns
    const now = new Date();
    const cooldownMinutes = limits?.cooldown_minutes || 5;
    const cooldownTime = new Date(now.getTime() - cooldownMinutes * 60 * 1000);

    for (const targetUser of targetUsers) {
      if (targetUser.user_id === senderId) continue;

      // Check user preferences
      const { data: preference } = await supabase
        .from('user_notification_preferences')
        .select('is_enabled')
        .eq('user_id', targetUser.user_id)
        .eq('event_type_id', eventTypeId)
        .single();

      if (preference && !preference.is_enabled) continue;

      // Check cooldown
      const { data: recentDelivery } = await supabase
        .from('notification_delivery_log')
        .select('id')
        .eq('user_id', targetUser.user_id)
        .eq('event_type_id', eventTypeId)
        .gte('delivered_at', cooldownTime.toISOString())
        .limit(1);

      if (recentDelivery && recentDelivery.length > 0) continue;

      // Check hourly limit
      if (limits) {
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const { count: hourlyCount } = await supabase
          .from('notification_delivery_log')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetUser.user_id)
          .eq('event_type_id', eventTypeId)
          .gte('delivered_at', hourAgo.toISOString());

        if ((hourlyCount || 0) >= limits.max_per_hour) continue;

        // Check daily limit
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const { count: dailyCount } = await supabase
          .from('notification_delivery_log')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', targetUser.user_id)
          .eq('event_type_id', eventTypeId)
          .gte('delivered_at', dayAgo.toISOString());

        if ((dailyCount || 0) >= limits.max_per_day) continue;
      }

      // Create notification
      await supabase.from('user_notifications').insert({
        user_id: targetUser.user_id,
        sender_id: senderId,
        notification_type: eventType.event_key,
        source_module: eventType.source_module,
        title: eventType.name,
        message: payload.message || eventType.description || '',
        link: payload.link,
        metadata: {
          ...payload,
          event_type_id: eventTypeId,
          related_entity_type: relatedEntityType,
          related_entity_id: relatedEntityId,
        },
      });

      // Log delivery
      await supabase.from('notification_delivery_log').insert({
        user_id: targetUser.user_id,
        event_type_id: eventTypeId,
      });
    }
  } catch (error) {
    console.error('Error processing event:', error);
  }
}
