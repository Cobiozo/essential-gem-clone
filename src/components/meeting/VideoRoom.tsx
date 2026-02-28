import React, { useEffect, useRef, useState, useCallback } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VideoGrid } from './VideoGrid';
import { MeetingControls } from './MeetingControls';
import { MeetingChat } from './MeetingChat';
import { ParticipantsPanel } from './ParticipantsPanel';
import { MeetingTimer } from './MeetingTimer';
import { useToast } from '@/hooks/use-toast';
import { useVideoBackground } from '@/hooks/useVideoBackground';
import { BackgroundSelector } from './BackgroundSelector';
import type { BackgroundMode } from './VideoBackgroundProcessor';
import type { MeetingSettings } from './MeetingSettingsDialog';

interface RemoteParticipant {
  peerId: string;
  displayName: string;
  stream: MediaStream | null;
  isMuted?: boolean;
  isCameraOff?: boolean;
  avatarUrl?: string;
  userId?: string;
}

interface VideoRoomProps {
  roomId: string;
  displayName: string;
  meetingTitle?: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  onLeave: () => void;
  isHost?: boolean;
  hostUserId?: string;
  endTime?: string | null;
  initialSettings?: MeetingSettings;
  guestMode?: boolean;
  guestTokenId?: string;
  initialStream?: MediaStream | null;
}

const AUDIO_CONSTRAINTS: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

const DEFAULT_SETTINGS: MeetingSettings = {
  allowChat: true,
  allowMicrophone: true,
  allowCamera: true,
  allowScreenShare: 'host_only',
};

export const VideoRoom: React.FC<VideoRoomProps> = ({
  roomId,
  displayName,
  meetingTitle,
  audioEnabled: initialAudio,
  videoEnabled: initialVideo,
  onLeave,
  isHost = false,
  hostUserId = '',
  endTime = null,
  initialSettings,
  guestMode = false,
  guestTokenId,
  initialStream = null,
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const connectionsRef = useRef<Map<string, MediaConnection>>(new Map());
  const activeVideoRef = useRef<HTMLVideoElement | null>(null);
  const cleanupDoneRef = useRef(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const screenSharePendingRef = useRef(false);
  const cachedAuthTokenRef = useRef<string | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(!initialAudio);
  const [isCameraOff, setIsCameraOff] = useState(!initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [viewMode, setViewMode] = useState<import('./VideoGrid').ViewMode>('speaker');
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | undefined>();
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const iceDisconnectTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const channelReconnectAttemptsRef = useRef(0);
  const channelReconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const channelReconnectHandlerRef = useRef<(() => void) | null>(null);
  const dbParticipantChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Background blur/virtual background
  const {
    mode: bgMode,
    selectedImage: bgSelectedImage,
    isLoading: bgIsLoading,
    isSupported: bgIsSupported,
    applyBackground,
    stopBackground,
    updateRawStream,
    backgroundImages,
  } = useVideoBackground();

  // === Zmiana A: participantsRef synced with state ===
  const participantsRef = useRef<RemoteParticipant[]>([]);
  useEffect(() => { participantsRef.current = participants; }, [participants]);

  // === Zmiana C: isScreenSharingRef synced with state ===
  const isScreenSharingRef = useRef(false);
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);

  // Refs for other state used in restoreCamera closure
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  // Meeting settings & co-host state
  const [meetingSettings, setMeetingSettings] = useState<MeetingSettings>(initialSettings || DEFAULT_SETTINGS);
  const [coHostUserIds, setCoHostUserIds] = useState<string[]>([]);

  // Zmiana 2: coHostUserIdsRef synced with state for use in closures
  const coHostUserIdsRef = useRef<string[]>([]);
  useEffect(() => { coHostUserIdsRef.current = coHostUserIds; }, [coHostUserIds]);

  // Zmiana 6: localAvatarUrl ref for stable callPeer closure
  const localAvatarUrlRef = useRef<string | undefined>();
  useEffect(() => { localAvatarUrlRef.current = localAvatarUrl; }, [localAvatarUrl]);

  // Zmiana 4: cache auth token for beforeunload (can't use async there)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      cachedAuthTokenRef.current = data?.session?.access_token || null;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      cachedAuthTokenRef.current = session?.access_token || null;
    });
    return () => subscription.unsubscribe();
  }, []);

  // Emit video-activity every 60s and meeting-active/meeting-ended to prevent inactivity logout
  useEffect(() => {
    window.dispatchEvent(new Event('meeting-active'));
    window.dispatchEvent(new Event('video-activity'));
    const interval = setInterval(() => {
      window.dispatchEvent(new Event('video-activity'));
    }, 60000);
    return () => {
      clearInterval(interval);
      window.dispatchEvent(new Event('meeting-ended'));
    };
  }, []);

  // Audio unlock on first user gesture (mobile autoplay policy)
  useEffect(() => {
    let unlocked = false;
    const unlockAudio = () => {
      if (unlocked) return;
      unlocked = true;
      try {
        const ctx = new AudioContext();
        ctx.resume().then(() => ctx.close()).catch(() => {});
      } catch {}
      // Try to unmute any force-muted remote videos
      document.querySelectorAll('video').forEach((v) => {
        const video = v as HTMLVideoElement;
        if (video.muted && !video.dataset.localVideo) {
          video.muted = false;
          video.play().catch(() => {});
        }
      });
      setAudioBlocked(false);
    };
    document.addEventListener('touchstart', unlockAudio, { once: true });
    document.addEventListener('click', unlockAudio, { once: true });
    return () => {
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
  }, []);
  const isCoHost = user ? coHostUserIds.includes(user.id) : false;
  const canManage = isHost || isCoHost;

  // Permission checks for current user - guests have limited permissions
  const canChat = guestMode ? meetingSettings.allowChat : (canManage || meetingSettings.allowChat);
  const canMicrophone = guestMode ? meetingSettings.allowMicrophone : (canManage || meetingSettings.allowMicrophone);
  const canCamera = guestMode ? meetingSettings.allowCamera : (canManage || meetingSettings.allowCamera);
  const canScreenShare = guestMode ? false : (canManage || meetingSettings.allowScreenShare === 'all');

  // Fetch local user's avatar (skip for guests)
  useEffect(() => {
    if (!user || guestMode) return;
    supabase.from('profiles').select('avatar_url').eq('user_id', user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setLocalAvatarUrl(data.avatar_url); });
  }, [user, guestMode]);

  const isPiPSupported = typeof document !== 'undefined'
    && 'pictureInPictureEnabled' in document
    && document.pictureInPictureEnabled
    && !/iPad|iPhone|iPod/.test(navigator.userAgent);

  const isScreenShareSupported = typeof navigator.mediaDevices?.getDisplayMedia === 'function';

  // Save/load meeting settings from DB
  useEffect(() => {
    if (!isHost || !user || !roomId || guestMode) return;
    // Upsert initial settings when host joins
    const saveSettings = async () => {
      await supabase.from('meeting_room_settings').upsert({
        room_id: roomId,
        host_user_id: user.id,
        allow_chat: meetingSettings.allowChat,
        allow_microphone: meetingSettings.allowMicrophone,
        allow_camera: meetingSettings.allowCamera,
        allow_screen_share: meetingSettings.allowScreenShare,
        co_host_user_ids: coHostUserIds,
      }, { onConflict: 'room_id' });
    };
    saveSettings();
  }, [isHost, user, roomId, guestMode]); // Only on mount for host

  // Non-host: load settings from DB on join
  useEffect(() => {
    if (isHost || !roomId) return;
    const loadSettings = async () => {
      const { data } = await supabase
        .from('meeting_room_settings')
        .select('*')
        .eq('room_id', roomId)
        .maybeSingle();
      if (data) {
        setMeetingSettings({
          allowChat: data.allow_chat,
          allowMicrophone: data.allow_microphone,
          allowCamera: data.allow_camera,
          allowScreenShare: data.allow_screen_share as 'host_only' | 'all',
        });
        setCoHostUserIds((data.co_host_user_ids as string[]) || []);
      }
    };
    loadSettings();
  }, [isHost, roomId]);

  // Handle settings change (host/co-host broadcasts)
  const handleMeetingSettingsChange = useCallback(async (newSettings: MeetingSettings) => {
    setMeetingSettings(newSettings);
    // Save to DB
    if (roomId) {
      await supabase.from('meeting_room_settings').update({
        allow_chat: newSettings.allowChat,
        allow_microphone: newSettings.allowMicrophone,
        allow_camera: newSettings.allowCamera,
        allow_screen_share: newSettings.allowScreenShare,
      }).eq('room_id', roomId);
    }
    // Broadcast to all
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'settings-changed',
        payload: { settings: newSettings },
      });
    }
    toast({ title: 'Ustawienia zaktualizowane' });
  }, [roomId, toast]);

  // Handle co-host toggle
  const handleToggleCoHost = useCallback(async (userId: string) => {
    const newIds = coHostUserIds.includes(userId)
      ? coHostUserIds.filter(id => id !== userId)
      : [...coHostUserIds, userId];
    setCoHostUserIds(newIds);
    // Save to DB
    if (roomId) {
      await supabase.from('meeting_room_settings').update({
        co_host_user_ids: newIds,
      }).eq('room_id', roomId);
    }
    // Broadcast
    if (channelRef.current) {
      if (coHostUserIds.includes(userId)) {
        channelRef.current.send({ type: 'broadcast', event: 'co-host-removed', payload: { userId } });
      } else {
        channelRef.current.send({ type: 'broadcast', event: 'co-host-assigned', payload: { userId } });
      }
    }
  }, [coHostUserIds, roomId]);

  // Fetch TURN credentials
  const getTurnCredentials = useCallback(async () => {
    try {
      if (guestMode && guestTokenId) {
        // Guest mode: call with guest token header
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL || 'https://xzlhssqqbajqhnsmbucf.supabase.co'}/functions/v1/get-turn-credentials`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA',
              'X-Guest-Token': guestTokenId,
            },
            body: JSON.stringify({}),
          }
        );
        const data = await response.json();
        return data?.iceServers || [];
      }
      const { data, error } = await supabase.functions.invoke('get-turn-credentials');
      if (error) throw error;
      return data?.iceServers || [];
    } catch (err) {
      console.error('[VideoRoom] Failed to get TURN credentials:', err);
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];
    }
  }, [guestMode, guestTokenId]);

  // Cleanup function with guard
  const cleanup = useCallback(async () => {
    if (cleanupDoneRef.current) return;
    cleanupDoneRef.current = true;
    console.log('[VideoRoom] Cleanup starting...');

    const peerId = peerRef.current?.id;
    if (peerId && channelRef.current) {
      try { await channelRef.current.send({ type: 'broadcast', event: 'peer-left', payload: { peerId } }); } catch (e) { console.warn('[VideoRoom] Failed to broadcast peer-left:', e); }
    }
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }

    // Update participant record
    if (guestMode && guestTokenId) {
      try {
        await supabase.from('meeting_room_participants')
          .update({ is_active: false, left_at: new Date().toISOString() })
          .eq('room_id', roomId).eq('guest_token_id', guestTokenId);
        await supabase.from('meeting_guest_analytics')
          .update({ left_at: new Date().toISOString() })
          .eq('guest_token_id', guestTokenId)
          .is('left_at', null);
        const { data: analyticsData } = await supabase
          .from('meeting_guest_analytics')
          .select('id, joined_at, left_at')
          .eq('guest_token_id', guestTokenId)
          .maybeSingle();
        if (analyticsData?.joined_at && analyticsData?.left_at) {
          const duration = Math.round((new Date(analyticsData.left_at).getTime() - new Date(analyticsData.joined_at).getTime()) / 1000);
          await supabase.from('meeting_guest_analytics').update({ duration_seconds: duration }).eq('id', analyticsData.id);
          if (duration >= 30) {
            supabase.functions.invoke('send-guest-thank-you-email', {
              body: { guest_token_id: guestTokenId },
            }).catch(e => console.warn('[VideoRoom] Thank you email error:', e));
          }
        }
      } catch (e) { console.warn('[VideoRoom] Failed to update guest status:', e); }
    } else if (user) {
      try {
        await supabase.from('meeting_room_participants')
          .update({ is_active: false, left_at: new Date().toISOString() })
          .eq('room_id', roomId).eq('user_id', user.id);
      } catch (e) { console.warn('[VideoRoom] Failed to update participant status:', e); }
    }

    connectionsRef.current.forEach((conn) => { try { conn.close(); } catch {} });
    connectionsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => { try { t.stop(); } catch {} });
    localStreamRef.current = null;
    if (peerRef.current) { try { peerRef.current.destroy(); } catch {} peerRef.current = null; }

    // Zmiana 5: cleanup iceDisconnectTimers to prevent memory leaks
    iceDisconnectTimersRef.current.forEach((timer) => { clearTimeout(timer); });
    iceDisconnectTimersRef.current.clear();

    // Cleanup channel reconnect timer
    if (channelReconnectTimerRef.current) {
      clearTimeout(channelReconnectTimerRef.current);
      channelReconnectTimerRef.current = null;
    }

    // Cleanup DB participant channel
    if (dbParticipantChannelRef.current) {
      try { supabase.removeChannel(dbParticipantChannelRef.current); } catch {}
      dbParticipantChannelRef.current = null;
    }

    // Cleanup background processor
    stopBackground();

    console.log('[VideoRoom] Cleanup complete');
  }, [roomId, user, guestMode, guestTokenId]);

  // beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cleanupDoneRef.current) return;
      cleanupDoneRef.current = true;
      localStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
      connectionsRef.current.forEach(conn => { try { conn.close(); } catch {} });
      if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xzlhssqqbajqhnsmbucf.supabase.co';
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA';
      // Zmiana 4: removed sendBeacon (doesn't support PATCH), added Authorization header
      // Note: can't use await in beforeunload, so we cache the session token via ref
      const authToken = cachedAuthTokenRef.current;
      const authHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Prefer': 'return=minimal',
      };
      if (authToken) authHeaders['Authorization'] = `Bearer ${authToken}`;

      if (user) {
        const url = `${supabaseUrl}/rest/v1/meeting_room_participants?room_id=eq.${roomId}&user_id=eq.${user.id}`;
        const body = JSON.stringify({ is_active: false, left_at: new Date().toISOString() });
        try {
          fetch(url, { method: 'PATCH', headers: authHeaders, body, keepalive: true }).catch(() => {});
        } catch {}
      } else if (guestTokenId) {
        const url = `${supabaseUrl}/rest/v1/meeting_room_participants?room_id=eq.${roomId}&guest_token_id=eq.${guestTokenId}`;
        const body = JSON.stringify({ is_active: false, left_at: new Date().toISOString() });
        try {
          fetch(url, { method: 'PATCH', headers: authHeaders, body, keepalive: true }).catch(() => {});
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, user, guestTokenId]);

  // === Local miss counter for graceful pruning ===
  const peerMissCountRef = useRef<Map<string, number>>(new Map());

  // === Zmiana E: Self-healing heartbeat + graceful local pruning (NO global deactivation) ===
  useEffect(() => {
    if (!user && !guestTokenId) return;
    const heartbeat = async () => {
      if (cleanupDoneRef.current) return;
      try {
        // 1. Self-healing heartbeat: always set is_active=true, left_at=null (no .eq('is_active', true) condition)
        const now = new Date().toISOString();
        const peerIdValue = peerRef.current?.id || null;
        if (guestTokenId) {
          await supabase.from('meeting_room_participants')
            .update({ updated_at: now, is_active: true, left_at: null, ...(peerIdValue ? { peer_id: peerIdValue } : {}) })
            .eq('room_id', roomId).eq('guest_token_id', guestTokenId);
        } else if (user) {
          await supabase.from('meeting_room_participants')
            .update({ updated_at: now, is_active: true, left_at: null, ...(peerIdValue ? { peer_id: peerIdValue } : {}) })
            .eq('room_id', roomId).eq('user_id', user.id);
        }

        // 2. Sync participants from DB - graceful local pruning (NO deactivation of others in DB)
        const { data: activeParticipants } = await supabase
          .from('meeting_room_participants')
          .select('peer_id, display_name, user_id, guest_token_id, updated_at')
          .eq('room_id', roomId).eq('is_active', true);

        if (activeParticipants) {
          const activePeerIds = new Set<string>();

          for (const p of activeParticipants) {
            if (!p.peer_id) continue;
            if (user && p.user_id === user.id) continue;
            if (guestTokenId && p.guest_token_id === guestTokenId) continue;
            activePeerIds.add(p.peer_id);
          }

          // Graceful local pruning: only remove after 3 consecutive misses AND no live WebRTC connection
          const currentParticipants = participantsRef.current;
          const toRemove: string[] = [];

          for (const p of currentParticipants) {
            if (activePeerIds.has(p.peerId)) {
              // Present in DB - reset miss counter
              peerMissCountRef.current.delete(p.peerId);
            } else {
              // Not in DB active list - check if WebRTC connection is still alive
              const conn = connectionsRef.current.get(p.peerId);
              const pc = conn ? (conn as any).peerConnection as RTCPeerConnection | undefined : undefined;
              const iceState = pc?.iceConnectionState;
              const connState = pc?.connectionState;
              const hasLiveConnection = iceState && iceState !== 'failed' && iceState !== 'closed' && iceState !== 'disconnected'
                && connState !== 'failed' && connState !== 'closed';

              if (hasLiveConnection) {
                // Live WebRTC connection exists - don't remove, reset counter
                peerMissCountRef.current.delete(p.peerId);
                continue;
              }

              const missCount = (peerMissCountRef.current.get(p.peerId) || 0) + 1;
              peerMissCountRef.current.set(p.peerId, missCount);

              if (missCount >= 3) {
                // 3 consecutive misses + no live connection -> remove locally
                toRemove.push(p.peerId);
                peerMissCountRef.current.delete(p.peerId);
              }
            }
          }

          // Also reset counters for peers no longer in our local list
          peerMissCountRef.current.forEach((_, key) => {
            if (!currentParticipants.some(p => p.peerId === key)) {
              peerMissCountRef.current.delete(key);
            }
          });

          if (toRemove.length > 0) {
            console.log('[VideoRoom] Removing ghost participants after 3 misses:', toRemove);
            toRemove.forEach(peerId => {
              const conn = connectionsRef.current.get(peerId);
              if (conn) { try { conn.close(); } catch {} }
              connectionsRef.current.delete(peerId);
            });
            setParticipants(prev => prev.filter(p => !toRemove.includes(p.peerId)));
          }
        }

        // 3. Channel health check - verify signaling channel is alive
        const channelState = (channelRef.current as any)?.state;
        if (channelRef.current && channelState !== 'joined' && channelState !== 'joining') {
          console.warn(`[VideoRoom] Heartbeat: signaling channel dead ("${channelState}"), triggering reconnect`);
          try { supabase.removeChannel(channelRef.current); } catch {}
          channelRef.current = null;
          // Trigger reconnect immediately if no timer is pending
          if (!channelReconnectTimerRef.current) {
            channelReconnectTimerRef.current = setTimeout(() => {
              channelReconnectTimerRef.current = null;
              // setupSignalingChannel will be available in init scope - dispatch event
              window.dispatchEvent(new CustomEvent('meeting-channel-reconnect'));
            }, 1000);
          }
        }
      } catch (e) { console.warn('[VideoRoom] Heartbeat/sync failed:', e); }
    };
    const interval = setInterval(heartbeat, 15000);
    // Run first heartbeat immediately to self-heal on mount
    heartbeat();
    return () => clearInterval(interval);
  }, [roomId, user, guestTokenId]);

  // === Postgres Realtime subscription for immediate participant detection ===
  useEffect(() => {
    if (!user && !guestTokenId) return;
    const myPeerId = () => peerRef.current?.id;

    const channel = supabase
      .channel(`participants-db:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meeting_room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newRow = payload.new as any;
          if (!newRow?.peer_id || !newRow?.is_active) return;
          const localPeerId = myPeerId();
          if (!localPeerId || newRow.peer_id === localPeerId) return;
          // Skip if it's our own user
          if (user && newRow.user_id === user.id) return;
          if (guestTokenId && newRow.guest_token_id === guestTokenId) return;
          // Only call if not already connected
          if (!connectionsRef.current.has(newRow.peer_id) && localStreamRef.current) {
            console.log(`[VideoRoom] DB INSERT detected new peer: ${newRow.peer_id}, calling...`);
            callPeer(newRow.peer_id, newRow.display_name || 'Uczestnik', localStreamRef.current!, undefined, newRow.user_id || undefined);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meeting_room_participants',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const updated = payload.new as any;
          if (!updated?.peer_id || !updated?.is_active) return;
          const localPeerId = myPeerId();
          if (!localPeerId || updated.peer_id === localPeerId) return;
          if (user && updated.user_id === user.id) return;
          if (guestTokenId && updated.guest_token_id === guestTokenId) return;
          // Reconnect if peer updated (e.g. re-joined) but we don't have connection
          if (!connectionsRef.current.has(updated.peer_id) && localStreamRef.current) {
            console.log(`[VideoRoom] DB UPDATE detected peer: ${updated.peer_id}, calling...`);
            callPeer(updated.peer_id, updated.display_name || 'Uczestnik', localStreamRef.current!, undefined, updated.user_id || undefined);
          }
        }
      )
      .subscribe();

    dbParticipantChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      dbParticipantChannelRef.current = null;
    };
  }, [roomId, user, guestTokenId]);

  // Visibility change: reconnect peer and sync participants
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden || cleanupDoneRef.current) return;
      console.log('[VideoRoom] Tab became visible, checking connections...');
      
      const peer = peerRef.current;
      if (peer && peer.disconnected && !peer.destroyed) {
        console.log('[VideoRoom] Peer disconnected, reconnecting...');
        try { peer.reconnect(); } catch (e) { console.warn('[VideoRoom] Peer reconnect failed:', e); }
      }

      let stream = localStreamRef.current;
      const tracksAlive = stream?.getTracks().some(t => t.readyState === 'live');
      if (!stream || !tracksAlive) {
        console.log('[VideoRoom] Stream dead after visibility change, re-acquiring...');
        const freshStream = await reacquireLocalStream();
        if (!freshStream) return;
        stream = freshStream;
      }
      
      connectionsRef.current.forEach((conn, peerId) => {
        try {
          const pc = (conn as any).peerConnection as RTCPeerConnection | undefined;
          if (!pc || pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
            console.log(`[VideoRoom] Stale connection to ${peerId}, will reconnect`);
            try { conn.close(); } catch {}
            connectionsRef.current.delete(peerId);
          }
        } catch {}
      });

      try {
        const { data: activeParticipants } = await supabase
          .from('meeting_room_participants')
          .select('peer_id, display_name, user_id, guest_token_id')
          .eq('room_id', roomId).eq('is_active', true);

        if (!activeParticipants) return;

        for (const p of activeParticipants) {
          if (!p.peer_id) continue;
          if (user && p.user_id === user.id) continue;
          if (guestTokenId && p.guest_token_id === guestTokenId) continue;

          if (!connectionsRef.current.has(p.peer_id)) {
            console.log(`[VideoRoom] Reconnecting to missing peer: ${p.peer_id}`);
            callPeer(p.peer_id, p.display_name || 'Uczestnik', stream, undefined, p.user_id || undefined);
          }
        }
        // Don't prune participants here - let heartbeat handle graceful pruning
      } catch (e) { console.warn('[VideoRoom] Visibility sync failed:', e); }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [roomId, user, guestTokenId]);

  // Initialize peer and media
  useEffect(() => {
    if (!user && !guestMode) return;
    let cancelled = false;
    cleanupDoneRef.current = false;

    const init = async () => {
      try {
        let stream: MediaStream;
        // Try to reuse the lobby stream (preserves user gesture context)
        const lobbyStreamAlive = initialStream?.getTracks().some(t => t.readyState === 'live');
        if (initialStream && lobbyStreamAlive) {
          console.log('[VideoRoom] Reusing lobby stream');
          stream = initialStream;
        } else {
          try {
            const isMob = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
            const videoConstraints: MediaTrackConstraints = isMob
              ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 20 } }
              : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } };
            stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: videoConstraints });
          } catch {
            try {
              stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
            } catch {
              const isMob2 = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
              const videoConstraints2: MediaTrackConstraints = isMob2
                ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 20 } }
                : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } };
              stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints2 });
            }
          }
        }
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        stream.getAudioTracks().forEach(t => (t.enabled = initialAudio));
        stream.getVideoTracks().forEach(t => (t.enabled = initialVideo));
        localStreamRef.current = stream;
        setLocalStream(stream);

        // Track ended listeners for auto re-acquire on mobile
        stream.getTracks().forEach(track => {
          track.addEventListener('ended', () => {
            if (!cleanupDoneRef.current) {
              console.warn('[VideoRoom] Local track ended unexpectedly:', track.kind);
              reacquireLocalStream();
            }
          });
        });

        const iceServers = await getTurnCredentials();
        const peer = new Peer({ config: { iceServers, iceTransportPolicy: 'all' as RTCIceTransportPolicy }, debug: 1 });
        peerRef.current = peer;

        peer.on('open', async (peerId) => {
          if (cancelled) return;
          console.log('[VideoRoom] Peer opened:', peerId);
          setIsConnected(true);

          // Register participant
          if (guestMode && guestTokenId) {
            const joinedAt = new Date().toISOString();
            await supabase.from('meeting_room_participants').insert({
              room_id: roomId,
              guest_token_id: guestTokenId,
              peer_id: peerId,
              display_name: displayName,
              is_active: true,
              joined_at: joinedAt,
            });
            await supabase.from('meeting_guest_analytics')
              .update({
                joined_at: joinedAt,
                join_source: document.referrer || 'direct',
                device_info: navigator.userAgent,
              })
              .eq('guest_token_id', guestTokenId)
              .is('joined_at', null);
          } else if (user) {
            const { error: participantError } = await supabase
              .from('meeting_room_participants')
              .upsert(
                { room_id: roomId, user_id: user.id, peer_id: peerId, display_name: displayName, is_active: true, left_at: null, joined_at: new Date().toISOString() },
                { onConflict: 'room_id,user_id' }
              );
            if (participantError) {
              console.error('[VideoRoom] Failed to register participant (upsert):', participantError);
              // Retry upsert once
              const { error: retryError } = await supabase.from('meeting_room_participants').upsert(
                { room_id: roomId, user_id: user.id, peer_id: peerId, display_name: displayName, is_active: true, left_at: null, joined_at: new Date().toISOString() },
                { onConflict: 'room_id,user_id' }
              );
              if (retryError) {
                console.error('[VideoRoom] Retry upsert also failed:', retryError);
              }
            }

            // Verify participant record exists
            const { data: verifyParticipant } = await supabase
              .from('meeting_room_participants')
              .select('id')
              .eq('room_id', roomId)
              .eq('user_id', user.id)
              .maybeSingle();

            if (!verifyParticipant) {
              console.warn('[VideoRoom] Participant record missing after upsert, trying plain insert...');
              const { error: insertError } = await supabase.from('meeting_room_participants').insert({
                room_id: roomId,
                user_id: user.id,
                peer_id: peerId,
                display_name: displayName,
                is_active: true,
                joined_at: new Date().toISOString(),
              });
              if (insertError) {
                console.error('[VideoRoom] Plain insert also failed:', insertError);
                toast({ title: 'Błąd dołączania', description: 'Nie udało się zarejestrować w spotkaniu. Spróbuj odświeżyć stronę.', variant: 'destructive' });
              }
            }
          }

          // === Signaling channel setup with reconnect logic ===
          const setupSignalingChannel = () => {
            if (cancelled || cleanupDoneRef.current) return;
            
            // Clean up old channel
            if (channelRef.current) {
              try { supabase.removeChannel(channelRef.current); } catch {}
              channelRef.current = null;
            }

            const channel = supabase.channel(`meeting:${roomId}`);
            channelRef.current = channel;

            channel.on('broadcast', { event: 'peer-joined' }, ({ payload }) => {
              if (payload.peerId !== peerId && !cancelled) {
                callPeer(payload.peerId, payload.displayName, stream, undefined, payload.userId);
              }
            });
            channel.on('broadcast', { event: 'peer-left' }, ({ payload }) => {
              if (!cancelled) removePeer(payload.peerId);
            });
            channel.on('broadcast', { event: 'meeting-ended' }, () => {
              if (!cancelled) {
                toast({ title: 'Spotkanie zakończone', description: 'Prowadzący zakończył spotkanie.' });
                handleLeave();
              }
            });
            channel.on('broadcast', { event: 'mute-all' }, ({ payload }) => {
              if (!cancelled && payload?.senderPeerId !== peerId) {
                localStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = false));
                setIsMuted(true);
                toast({ title: 'Zostałeś wyciszony', description: 'Prowadzący wyciszył wszystkich uczestników.' });
              }
            });
            channel.on('broadcast', { event: 'mute-peer' }, ({ payload }) => {
              if (!cancelled && payload?.targetPeerId === peerId) {
                localStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = false));
                setIsMuted(true);
                toast({ title: 'Zostałeś wyciszony', description: 'Prowadzący wyciszył Twój mikrofon.' });
              }
            });
            channel.on('broadcast', { event: 'unmute-request' }, ({ payload }) => {
              if (!cancelled && payload?.targetPeerId === peerId) {
                toast({ title: 'Prośba o odciszenie', description: 'Prowadzący prosi o włączenie mikrofonu.' });
              }
            });
            channel.on('broadcast', { event: 'settings-changed' }, ({ payload }) => {
              if (!cancelled && payload?.settings) {
                const newSettings = payload.settings as MeetingSettings;
                setMeetingSettings(newSettings);
                const isManager = !guestMode && (isHost || (user && coHostUserIdsRef.current.includes(user.id)));
                if (!isManager) {
                  if (!newSettings.allowMicrophone) {
                    localStreamRef.current?.getAudioTracks().forEach(t => (t.enabled = false));
                    setIsMuted(true);
                  }
                  if (!newSettings.allowCamera) {
                    localStreamRef.current?.getVideoTracks().forEach(t => (t.enabled = false));
                    setIsCameraOff(true);
                  }
                }
                toast({ title: 'Ustawienia spotkania zmienione', description: 'Prowadzący zmienił ustawienia.' });
              }
            });
            if (!guestMode && user) {
              channel.on('broadcast', { event: 'co-host-assigned' }, ({ payload }) => {
                if (!cancelled && payload?.userId) {
                  setCoHostUserIds(prev => prev.includes(payload.userId) ? prev : [...prev, payload.userId]);
                  if (payload.userId === user.id) {
                    toast({ title: 'Nadano Ci rolę współprowadzącego!' });
                  }
                }
              });
              channel.on('broadcast', { event: 'co-host-removed' }, ({ payload }) => {
                if (!cancelled && payload?.userId) {
                  setCoHostUserIds(prev => prev.filter(id => id !== payload.userId));
                  if (payload.userId === user.id) {
                    toast({ title: 'Odebrano Ci rolę współprowadzącego' });
                  }
                }
              });
            }
            channel.on('broadcast', { event: 'media-state-changed' }, ({ payload }) => {
              if (!cancelled && payload?.peerId) {
                setParticipants(prev => prev.map(p => 
                  p.peerId === payload.peerId 
                    ? { ...p, isMuted: payload.isMuted, isCameraOff: payload.isCameraOff } 
                    : p
                ));
              }
            });

            channel.subscribe(async (status) => {
              if (cancelled || cleanupDoneRef.current) return;
              
              if (status === 'SUBSCRIBED') {
                // Reset reconnect counter on success
                channelReconnectAttemptsRef.current = 0;
                console.log('[VideoRoom] Signaling channel subscribed (re-announcing peer)');
                
                // Always re-announce on subscribe (handles both initial + reconnect)
                await channel.send({ type: 'broadcast', event: 'peer-joined', payload: { peerId, displayName, userId: user?.id, isGuest: guestMode } });
                
                // After reconnect: sync missing peers from DB
                try {
                  const { data: activeParticipants } = await supabase
                    .from('meeting_room_participants')
                    .select('peer_id, display_name, user_id, guest_token_id')
                    .eq('room_id', roomId).eq('is_active', true);
                  if (activeParticipants) {
                    for (const p of activeParticipants) {
                      if (!p.peer_id || p.peer_id === peerId) continue;
                      if (user && p.user_id === user.id) continue;
                      if (guestTokenId && p.guest_token_id === guestTokenId) continue;
                      if (!connectionsRef.current.has(p.peer_id)) {
                        console.log(`[VideoRoom] Reconnect: calling missing peer ${p.peer_id}`);
                        callPeer(p.peer_id, p.display_name || 'Uczestnik', stream, undefined, p.user_id || undefined);
                      }
                    }
                  }
                } catch (e) { console.warn('[VideoRoom] Post-reconnect sync failed:', e); }
              } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                const attempts = channelReconnectAttemptsRef.current;
                if (attempts >= 5) {
                  console.error('[VideoRoom] Signaling channel failed after 5 attempts');
                  toast({ 
                    title: 'Utracono połączenie z kanałem', 
                    description: 'Odśwież stronę, aby ponownie dołączyć.', 
                    variant: 'destructive' 
                  });
                  return;
                }
                const delay = Math.min(Math.pow(2, attempts + 1) * 1000, 32000); // 2s, 4s, 8s, 16s, 32s
                channelReconnectAttemptsRef.current = attempts + 1;
                console.warn(`[VideoRoom] Signaling channel ${status}, reconnecting in ${delay}ms (attempt ${attempts + 1}/5)`);
                if (channelReconnectTimerRef.current) clearTimeout(channelReconnectTimerRef.current);
                channelReconnectTimerRef.current = setTimeout(setupSignalingChannel, delay);
              }
            });
          };

          setupSignalingChannel();

          // Listen for heartbeat-triggered reconnects
          const handleChannelReconnect = () => {
            if (!cancelled && !cleanupDoneRef.current) {
              console.log('[VideoRoom] Channel reconnect triggered by heartbeat watchdog');
              setupSignalingChannel();
            }
          };
          // Store ref for cleanup
          if (channelReconnectHandlerRef.current) {
            window.removeEventListener('meeting-channel-reconnect', channelReconnectHandlerRef.current);
          }
          channelReconnectHandlerRef.current = handleChannelReconnect;
          window.addEventListener('meeting-channel-reconnect', handleChannelReconnect);

          // Fetch existing participants
          const { data: existing } = await supabase
            .from('meeting_room_participants')
            .select('peer_id, display_name, user_id, guest_token_id')
            .eq('room_id', roomId).eq('is_active', true);

          if (existing && !cancelled) {
            for (const p of existing) {
              if (user && p.user_id === user.id) continue;
              if (guestTokenId && p.guest_token_id === guestTokenId) continue;
              if (p.peer_id) {
                let avatarUrl: string | undefined;
                if (p.user_id) {
                  const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('user_id', p.user_id).single();
                  avatarUrl = profile?.avatar_url || undefined;
                }
                callPeer(p.peer_id, p.display_name || 'Uczestnik', stream, avatarUrl, p.user_id || undefined);
              }
            }
          }
        });

        peer.on('call', async (call) => {
          if (cancelled) return;
          const meta = call.metadata || {};
          let name = meta.displayName || 'Uczestnik';
          let callerUserId: string | undefined = meta.userId;
          let callerAvatar: string | undefined = meta.avatarUrl;

          if (!callerUserId) {
            const { data } = await supabase
              .from('meeting_room_participants')
              .select('display_name, user_id')
              .eq('room_id', roomId)
              .eq('peer_id', call.peer)
              .maybeSingle();
            if (data) {
              name = data.display_name || name;
              callerUserId = data.user_id || undefined;
            }
          }
          if (callerUserId && !callerAvatar) {
            const { data: prof } = await supabase.from('profiles')
              .select('avatar_url').eq('user_id', callerUserId).single();
            callerAvatar = prof?.avatar_url || undefined;
          }

          call.answer(stream);
          handleCall(call, name, callerAvatar, callerUserId);
        });

        peer.on('error', (err) => {
          console.error('[VideoRoom] Peer error:', err);
          if (err.type === 'peer-unavailable') {
            const failedPeerId = (err as any).message?.match(/peer\s+(\S+)/)?.[1];
            if (failedPeerId) removePeer(failedPeerId);
          } else if (err.type === 'disconnected') {
            try { peer.reconnect(); } catch {}
          } else {
            toast({ title: 'Błąd połączenia', description: 'Wystąpił problem z połączeniem video.', variant: 'destructive' });
          }
        });

        peer.on('disconnected', () => {
          if (!cancelled && !cleanupDoneRef.current) {
            setTimeout(() => {
              if (!cancelled && !cleanupDoneRef.current) { try { peer.reconnect(); } catch {} }
            }, 2000);
          }
        });

      } catch (err) {
        console.error('[VideoRoom] Init error:', err);
        toast({ title: 'Brak dostępu do kamery/mikrofonu', description: 'Upewnij się, że przeglądarka ma uprawnienia.', variant: 'destructive' });
      }
    };

    init();
    return () => { 
      cancelled = true; 
      if (channelReconnectHandlerRef.current) {
        window.removeEventListener('meeting-channel-reconnect', channelReconnectHandlerRef.current);
        channelReconnectHandlerRef.current = null;
      }
      cleanup(); 
    };
  }, [user, roomId, guestMode, guestTokenId]);

  // Zmiana 6: callPeer uses ref for localAvatarUrl to avoid stale closure
  const callPeer = useCallback((remotePeerId: string, name: string, stream: MediaStream, avatarUrl?: string, userId?: string) => {
    if (!peerRef.current || connectionsRef.current.has(remotePeerId)) return;
    const call = peerRef.current.call(remotePeerId, stream, {
      metadata: { displayName, userId: user?.id, avatarUrl: localAvatarUrlRef.current },
    });
    if (call) handleCall(call, name, avatarUrl, userId);
  }, [displayName, user?.id]);

  const handleCall = (call: MediaConnection, name: string, avatarUrl?: string, userId?: string) => {
    connectionsRef.current.set(call.peer, call);
    const timeout = setTimeout(() => {
      if (!connectionsRef.current.has(call.peer)) return;
      console.warn('[VideoRoom] Connection timeout for peer:', call.peer);
      connectionsRef.current.delete(call.peer);
    }, 15000);

    call.on('stream', (remoteStream) => {
      clearTimeout(timeout);
      setParticipants((prev) => {
        const exists = prev.find((p) => p.peerId === call.peer);
        if (exists) return prev.map((p) => p.peerId === call.peer ? { ...p, stream: remoteStream } : p);
        return [...prev, { peerId: call.peer, displayName: name, stream: remoteStream, avatarUrl, userId }];
      });

      // === Zmiana B (part): Track ended listeners for remote stream reconnect ===
      remoteStream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          console.log(`[VideoRoom] Remote track ended for ${call.peer}, kind: ${track.kind}`);
          // If all tracks ended, trigger reconnect
          const allEnded = remoteStream.getTracks().every(t => t.readyState === 'ended');
          if (allEnded) {
            console.log(`[VideoRoom] All remote tracks ended for ${call.peer}, reconnecting...`);
            reconnectToPeer(call.peer);
          }
        });
      });
    });

    call.on('close', () => { clearTimeout(timeout); removePeer(call.peer); });
    call.on('error', (err) => { clearTimeout(timeout); console.error('[VideoRoom] Call error:', call.peer, err); removePeer(call.peer); });

    // Monitor ICE connection state with reconnection logic
    try {
      const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
      if (pc) {
        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState;
          console.log(`[VideoRoom] ICE state for ${call.peer}: ${state}`);

          const existingTimer = iceDisconnectTimersRef.current.get(call.peer);
          if (existingTimer) {
            clearTimeout(existingTimer);
            iceDisconnectTimersRef.current.delete(call.peer);
          }

          if (state === 'connected' || state === 'completed') {
            reconnectAttemptsRef.current.delete(call.peer);
          } else if (state === 'disconnected') {
            const timer = setTimeout(() => {
              iceDisconnectTimersRef.current.delete(call.peer);
              if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'failed') {
                console.warn(`[VideoRoom] ICE still disconnected after 10s for ${call.peer}, reconnecting...`);
                reconnectToPeer(call.peer);
              }
            }, 10000);
            iceDisconnectTimersRef.current.set(call.peer, timer);
          } else if (state === 'failed') {
            console.warn('[VideoRoom] ICE failed for peer:', call.peer);
            reconnectToPeer(call.peer);
          }
        };
      }
    } catch (e) { /* ignore */ }
  };

  // === Zmiana B: reconnectToPeer uses participantsRef instead of participants ===
  const reconnectToPeer = useCallback(async (peerId: string) => {
    const attempts = reconnectAttemptsRef.current.get(peerId) || 0;
    if (attempts >= 3) {
      console.warn(`[VideoRoom] Max reconnect attempts (3) reached for ${peerId}, marking locally unreachable`);
      reconnectAttemptsRef.current.delete(peerId);
      // Only remove locally - do NOT update DB for remote peer
      removePeer(peerId);
      return;
    }
    reconnectAttemptsRef.current.set(peerId, attempts + 1);
    console.log(`[VideoRoom] Reconnect attempt ${attempts + 1}/3 for ${peerId}`);

    // Close old connection
    const oldConn = connectionsRef.current.get(peerId);
    if (oldConn) { try { oldConn.close(); } catch {} }
    connectionsRef.current.delete(peerId);

    // Use ref for fresh participant data
    const participant = participantsRef.current.find(p => p.peerId === peerId);

    // Re-call after delay
    setTimeout(() => {
      if (cleanupDoneRef.current || !peerRef.current || !localStreamRef.current) return;
      callPeer(peerId, participant?.displayName || 'Uczestnik', localStreamRef.current!, participant?.avatarUrl, participant?.userId);
    }, 2000);
  }, [roomId]); // removed 'participants' dependency

  const removePeer = (peerId: string) => {
    connectionsRef.current.delete(peerId);
    setParticipants((prev) => prev.filter((p) => p.peerId !== peerId));
  };

  // === Zmiana C: restoreCamera function using refs ===
  const restoreCamera = useCallback(async () => {
    console.log('[VideoRoom] restoreCamera called, isScreenSharingRef:', isScreenSharingRef.current);
    try {
      const isMob = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      const videoConstraints: MediaTrackConstraints = isMob
        ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 20 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } };
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints, audio: AUDIO_CONSTRAINTS });
      stream.getAudioTracks().forEach(t => (t.enabled = !isMutedRef.current));
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = stream;
      setLocalStream(stream);
      setIsScreenSharing(false);

      // Close PiP if active
      if (document.pictureInPictureElement) {
        try { await document.exitPictureInPicture(); } catch {}
        setIsPiPActive(false);
      }

      const videoTrack = stream.getVideoTracks()[0];
      connectionsRef.current.forEach((conn) => {
        const sender = (conn as any).peerConnection?.getSenders()?.find((s: RTCRtpSender) => s.track?.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      });
    } catch (err) {
      console.error('[VideoRoom] Failed to restore camera:', err);
      // Zmiana 3: fallback to audio-only if camera unavailable
      try {
        const audioOnlyStream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
        audioOnlyStream.getAudioTracks().forEach(t => (t.enabled = !isMutedRef.current));
        localStreamRef.current = audioOnlyStream;
        setLocalStream(audioOnlyStream);
        console.log('[VideoRoom] restoreCamera fallback: audio-only stream');
      } catch (audioErr) {
        console.error('[VideoRoom] restoreCamera fallback also failed:', audioErr);
      }
    } finally {
      // Always clear screen sharing state even if getUserMedia fails
      setIsScreenSharing(false);
    }
  }, []);

  // === reacquireLocalStream: re-acquire media when stream is lost (mobile bg, etc.) ===
  const reacquireLocalStream = useCallback(async (): Promise<MediaStream | null> => {
    console.log('[VideoRoom] Attempting to re-acquire local stream...');
    try {
      let stream: MediaStream;
      try {
        const isMob = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
        const videoConstraints: MediaTrackConstraints = isMob
          ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 20 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } };
        stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS, video: videoConstraints });
      } catch {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch {
            console.error('[VideoRoom] reacquireLocalStream: all getUserMedia attempts failed');
            toast({ title: 'Brak dostępu do multimediów', description: 'Sprawdź uprawnienia przeglądarki lub odśwież stronę.', variant: 'destructive' });
            return null;
          }
        }
      }

      localStreamRef.current = stream;
      setLocalStream(stream);
      updateRawStream(stream);

      // Add track ended listeners to new stream
      stream.getTracks().forEach(track => {
        track.addEventListener('ended', () => {
          if (!cleanupDoneRef.current) {
            console.warn('[VideoRoom] Re-acquired track ended:', track.kind);
            reacquireLocalStream();
          }
        });
      });

      // Replace tracks in existing peer connections
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      connectionsRef.current.forEach((conn) => {
        try {
          const senders = (conn as any).peerConnection?.getSenders() as RTCRtpSender[] | undefined;
          if (senders) {
            senders.forEach(sender => {
              if (sender.track?.kind === 'video' && videoTrack) sender.replaceTrack(videoTrack);
              if (sender.track?.kind === 'audio' && audioTrack) sender.replaceTrack(audioTrack);
            });
          }
        } catch (e) { console.warn('[VideoRoom] replaceTrack failed:', e); }
      });

      // Re-apply background effect if active
      if (bgMode !== 'none') {
        try {
          const processedStream = await applyBackground(stream, bgMode, bgSelectedImage);
          if (processedStream !== stream) {
            localStreamRef.current = processedStream;
            setLocalStream(processedStream);
            const processedVideoTrack = processedStream.getVideoTracks()[0];
            if (processedVideoTrack) {
              connectionsRef.current.forEach((conn) => {
                try {
                  const senders = (conn as any).peerConnection?.getSenders() as RTCRtpSender[] | undefined;
                  if (senders) {
                    const videoSender = senders.find(s => s.track?.kind === 'video');
                    if (videoSender) videoSender.replaceTrack(processedVideoTrack);
                  }
                } catch (e) { console.warn('[VideoRoom] replaceTrack bg failed:', e); }
              });
            }
          }
        } catch (e) {
          console.warn('[VideoRoom] Failed to re-apply background after reacquire:', e);
        }
      }

      console.log('[VideoRoom] Stream re-acquired successfully');
      toast({ title: 'Multimedia przywrócone' });
      // Return the final active stream (processed if background was applied)
      return localStreamRef.current || stream;
    } catch (err) {
      console.error('[VideoRoom] reacquireLocalStream failed:', err);
      return null;
    }
  }, [toast, bgMode, bgSelectedImage, applyBackground, updateRawStream]);

  // Controls
  const handleToggleMute = async () => {
    let stream = localStreamRef.current;
    // Re-acquire if null or all audio tracks ended
    if (!stream || stream.getAudioTracks().length === 0 || stream.getAudioTracks().every(t => t.readyState === 'ended')) {
      stream = await reacquireLocalStream();
      if (!stream) return;
    }
    if (isMuted && !canMicrophone) {
      toast({ title: 'Mikrofon wyłączony', description: 'Prowadzący wyłączył możliwość używania mikrofonu.' });
      return;
    }
    stream.getAudioTracks().forEach((t) => (t.enabled = isMuted));
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    if (channelRef.current && peerRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'media-state-changed', payload: { peerId: peerRef.current.id, isMuted: newMuted, isCameraOff } });
    }
  };

  const handleToggleCamera = async () => {
    let stream = localStreamRef.current;
    // Re-acquire if null or all video tracks ended
    if (!stream || stream.getVideoTracks().length === 0 || stream.getVideoTracks().every(t => t.readyState === 'ended')) {
      stream = await reacquireLocalStream();
      if (!stream) return;
    }
    if (isCameraOff && !canCamera) {
      toast({ title: 'Kamera wyłączona', description: 'Prowadzący wyłączył możliwość używania kamery.' });
      return;
    }
    const newEnabled = isCameraOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = newEnabled));
    const newCameraOff = !isCameraOff;
    setIsCameraOff(newCameraOff);
    setLocalStream(new MediaStream(stream.getTracks()));
    if (channelRef.current && peerRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'media-state-changed', payload: { peerId: peerRef.current.id, isMuted, isCameraOff: newCameraOff } });
    }
  };

  // === Zmiana C + D: handleToggleScreenShare with restoreCamera and auto-PiP ===
  const handleToggleScreenShare = async () => {
    if (document.pictureInPictureElement) {
      try { await document.exitPictureInPicture(); } catch {}
      setIsPiPActive(false);
    }
    screenSharePendingRef.current = true;

    if (isScreenSharing) {
      // Turning off screen share - restore camera
      try {
        await restoreCamera();
      } catch (err) { console.error('[VideoRoom] Failed to restore camera:', err); }
      finally { screenSharePendingRef.current = false; }
    } else {
      // Starting screen share
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const audioTrack = localStreamRef.current?.getAudioTracks()[0];
        if (audioTrack) screenStream.addTrack(audioTrack);
        localStreamRef.current?.getVideoTracks().forEach(t => t.stop());
        localStreamRef.current = screenStream;
        setLocalStream(screenStream);
        setIsScreenSharing(true);
        const videoTrack = screenStream.getVideoTracks()[0];
        connectionsRef.current.forEach((conn) => {
          const sender = (conn as any).peerConnection?.getSenders()?.find((s: RTCRtpSender) => s.track?.kind === 'video');
          if (sender && videoTrack) sender.replaceTrack(videoTrack);
        });

        // === Zmiana C: onended uses ref + restoreCamera ===
        videoTrack.onended = () => {
          if (isScreenSharingRef.current) {
            restoreCamera();
          }
        };

        // === Zmiana D: Auto-PiP on desktop when screen sharing starts ===
        if (isPiPSupported && participantsRef.current.length > 0) {
          setTimeout(async () => {
            const videos = document.querySelectorAll('video');
            const remoteVideo = Array.from(videos).find(
              v => v.srcObject && v.videoWidth > 0 && !v.muted
            );
            if (remoteVideo && !document.pictureInPictureElement) {
              try {
                await remoteVideo.requestPictureInPicture();
                setIsPiPActive(true);
                remoteVideo.addEventListener('leavepictureinpicture', () => setIsPiPActive(false), { once: true });
              } catch (e) { console.warn('[VideoRoom] Auto-PiP on screen share failed:', e); }
            }
          }, 500);
        }
      } catch (err) { console.log('[VideoRoom] Screen sharing cancelled:', err); }
      finally { screenSharePendingRef.current = false; }
    }
  };

  // PiP
  const autoPiPRef = useRef(false);

  const handleTogglePiP = async () => {
    if (!isPiPSupported) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
        autoPiPRef.current = false;
      } else {
        // Fallback: find active video if activeVideoRef is stale
        let pipVideo: HTMLVideoElement | null = activeVideoRef.current;
        if (!pipVideo?.srcObject || !pipVideo.videoWidth) {
          const allVideos = document.querySelectorAll('video');
          pipVideo = Array.from(allVideos).find(v => v.srcObject && (v as HTMLVideoElement).videoWidth > 0 && !v.paused) as HTMLVideoElement || null;
        }
        if (pipVideo) {
          await pipVideo.requestPictureInPicture();
          setIsPiPActive(true);
        }
      }
    } catch (err) { console.error('[VideoRoom] PiP error:', err); }
  };

  // Auto PiP on tab switch
  useEffect(() => {
    if (!isPiPSupported) return;

    // Global leavepictureinpicture listener to always reset state
    const handleLeavePiP = () => {
      autoPiPRef.current = false;
      setIsPiPActive(false);
    };
    document.addEventListener('leavepictureinpicture', handleLeavePiP);

    const handleVisibility = async () => {
      if (screenSharePendingRef.current) return;
      try {
        if (document.hidden) {
          if (document.pictureInPictureElement) return;
          let pipVideo: HTMLVideoElement | null = activeVideoRef.current;
          if (!pipVideo?.srcObject || !pipVideo.videoWidth) {
            const allVideos = document.querySelectorAll('video');
            pipVideo = Array.from(allVideos).find(v => v.srcObject && (v as HTMLVideoElement).videoWidth > 0 && !v.paused) as HTMLVideoElement || null;
          }
          if (pipVideo) {
            try {
              await pipVideo.requestPictureInPicture();
              autoPiPRef.current = true;
              setIsPiPActive(true);
            } catch {
              await new Promise(r => setTimeout(r, 150));
              try {
                if (!document.pictureInPictureElement && document.hidden) {
                  await pipVideo.requestPictureInPicture();
                  autoPiPRef.current = true;
                  setIsPiPActive(true);
                }
              } catch (retryErr) { console.warn('[VideoRoom] Auto PiP retry failed:', retryErr); }
            }
          }
        } else {
          if (document.pictureInPictureElement && autoPiPRef.current) {
            await document.exitPictureInPicture();
            autoPiPRef.current = false;
            setIsPiPActive(false);
          }
        }
      } catch (err) { console.warn('[VideoRoom] Auto PiP error:', err); }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('leavepictureinpicture', handleLeavePiP);
    };
  }, [isPiPSupported]);

  // Chat / Participants toggles
  const handleToggleChat = () => {
    setIsChatOpen(prev => !prev);
    if (!isChatOpen) { setIsParticipantsOpen(false); setUnreadChatCount(0); }
  };

  const handleToggleParticipants = () => {
    setIsParticipantsOpen(prev => !prev);
    if (!isParticipantsOpen) setIsChatOpen(false);
  };

  const handleNewChatMessage = useCallback(() => {
    if (!isChatOpen) setUnreadChatCount(prev => prev + 1);
  }, [isChatOpen]);

  // Background change handler
  const handleBackgroundChange = useCallback(async (newMode: BackgroundMode, imageSrc?: string) => {
    const stream = localStreamRef.current;
    if (!stream) return;
    try {
      const processedStream = await applyBackground(stream, newMode, imageSrc);
      // Always update local stream and tracks at peers
      localStreamRef.current = processedStream;
      setLocalStream(processedStream);
      const videoTrack = processedStream.getVideoTracks()[0];
      if (videoTrack) {
        connectionsRef.current.forEach((conn) => {
          const sender = (conn as any).peerConnection?.getSenders()?.find((s: RTCRtpSender) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });
      }
    } catch (err) {
      console.error('[VideoRoom] Background change failed:', err);
    }
  }, [applyBackground]);

  const handleLeave = async () => {
    try {
      await Promise.race([cleanup(), new Promise((resolve) => setTimeout(resolve, 3000))]);
    } catch (e) { console.warn('[VideoRoom] Cleanup error on leave:', e); }
    finally { onLeave(); }
  };

  const handleEndMeeting = async () => {
    // 1. Broadcast meeting-ended
    if (channelRef.current) {
      try { await channelRef.current.send({ type: 'broadcast', event: 'meeting-ended', payload: {} }); } catch (e) { console.warn('[VideoRoom] Failed to broadcast meeting-ended:', e); }
    }

    // 2. Deactivate ALL participants in this room
    try {
      await supabase.from('meeting_room_participants')
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .eq('is_active', true);
    } catch (e) { console.warn('[VideoRoom] Failed to deactivate all participants:', e); }

    // 3. Expire guest tokens for this room's event
    try {
      const { data: event } = await supabase
        .from('events')
        .select('id')
        .eq('meeting_room_id', roomId)
        .maybeSingle();
      if (event) {
        await supabase.from('meeting_guest_tokens')
          .update({ used_at: new Date().toISOString() })
          .eq('event_id', event.id)
          .is('used_at', null);
      }
    } catch (e) { console.warn('[VideoRoom] Failed to expire guest tokens:', e); }

    // 4. Fill missing left_at in guest analytics
    try {
      await supabase.from('meeting_guest_analytics')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .is('left_at', null);
    } catch (e) { console.warn('[VideoRoom] Failed to update guest analytics:', e); }

    await handleLeave();
  };

  const handleMuteAll = useCallback(() => {
    if (channelRef.current && peerRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'mute-all', payload: { senderPeerId: peerRef.current.id } });
      toast({ title: 'Wyciszono wszystkich', description: 'Wysłano żądanie wyciszenia do wszystkich uczestników.' });
    }
  }, [toast]);

  const handleMuteParticipant = useCallback((peerId: string) => {
    if (!channelRef.current) return;
    const participant = participantsRef.current.find(p => p.peerId === peerId);
    if (participant?.isMuted) {
      channelRef.current.send({ type: 'broadcast', event: 'unmute-request', payload: { targetPeerId: peerId } });
      toast({ title: 'Wysłano prośbę', description: 'Poproszono uczestnika o włączenie mikrofonu.' });
    } else {
      channelRef.current.send({ type: 'broadcast', event: 'mute-peer', payload: { targetPeerId: peerId } });
    }
  }, [toast]);

  // Handle audio blocked by mobile autoplay policy
  const handleAudioBlocked = useCallback(() => {
    setAudioBlocked(true);
  }, []);

  const handleUnmuteAll = useCallback(() => {
    document.querySelectorAll('video').forEach((v) => {
      const video = v as HTMLVideoElement;
      if (video.muted && !video.dataset.localVideo) {
        video.muted = false;
        video.play().catch(() => {});
      }
    });
    setAudioBlocked(false);
  }, []);

  const sidebarOpen = isChatOpen || isParticipantsOpen;

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 backdrop-blur-sm">
        <h2 className="text-sm font-medium text-white truncate">{meetingTitle || 'Spotkanie'}</h2>
        <div className="flex items-center gap-3">
          <MeetingTimer
            endTime={endTime || null}
            hostUserId={hostUserId}
            currentUserId={user?.id || ''}
            isHost={isHost}
            isCoHost={isCoHost}
          />
          {!isConnected && <span className="text-xs text-zinc-400 animate-pulse">Łączenie...</span>}
          <span className="text-xs text-zinc-400">{participants.length + 1} uczestników</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Audio blocked banner for mobile */}
        {audioBlocked && (
          <button
            onClick={handleUnmuteAll}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-full animate-pulse shadow-lg text-sm font-medium"
          >
            🔇 Dotknij aby włączyć dźwięk
          </button>
        )}

        <VideoGrid
          participants={participants}
          localStream={localStream}
          localDisplayName={displayName}
          localAvatarUrl={localAvatarUrl}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          viewMode={viewMode}
          isScreenSharing={isScreenSharing}
          onActiveVideoRef={(el) => { activeVideoRef.current = el; }}
          onAudioBlocked={handleAudioBlocked}
        />

        {sidebarOpen && (
          <div className="w-80 max-md:absolute max-md:inset-0 max-md:w-full max-md:z-50">
            {isChatOpen && (user || guestMode) && (
              <MeetingChat
                roomId={roomId}
                userId={user?.id || guestTokenId || ''}
                displayName={displayName}
                onClose={() => setIsChatOpen(false)}
                onNewMessage={handleNewChatMessage}
                chatDisabled={!canChat}
                participants={participants}
                guestTokenId={guestMode ? guestTokenId : undefined}
              />
            )}
            {isParticipantsOpen && (
              <ParticipantsPanel
                participants={participants}
                localDisplayName={displayName}
                localIsMuted={isMuted}
                localIsCameraOff={isCameraOff}
                localAvatarUrl={localAvatarUrl}
                onClose={() => setIsParticipantsOpen(false)}
                onMuteAll={canManage ? handleMuteAll : undefined}
                onMuteParticipant={canManage ? handleMuteParticipant : undefined}
                isHost={isHost}
                isCoHost={isCoHost}
                hostUserId={hostUserId}
                coHostUserIds={coHostUserIds}
                currentUserId={user?.id}
                onToggleCoHost={isHost ? handleToggleCoHost : undefined}
                guestMode={guestMode}
              />
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <MeetingControls
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isScreenSharing={isScreenSharing}
        participantCount={participants.length + 1}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsOpen}
        isPiPActive={isPiPActive}
        isPiPSupported={!!isPiPSupported}
        unreadChatCount={unreadChatCount}
        viewMode={viewMode}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={handleToggleChat}
        onToggleParticipants={handleToggleParticipants}
        onTogglePiP={handleTogglePiP}
        onLeave={handleLeave}
        onEndMeeting={canManage ? handleEndMeeting : undefined}
        onViewModeChange={setViewMode}
        isHost={isHost}
        isCoHost={isCoHost}
        meetingSettings={meetingSettings}
        onMeetingSettingsChange={canManage ? handleMeetingSettingsChange : undefined}
        canChat={canChat}
        canMicrophone={canMicrophone}
        canCamera={canCamera}
        canScreenShare={canScreenShare}
        isScreenShareSupported={isScreenShareSupported}
        guestMode={guestMode}
        bgMode={bgMode}
        bgSelectedImage={bgSelectedImage}
        bgIsLoading={bgIsLoading}
        bgIsSupported={bgIsSupported}
        backgroundImages={backgroundImages}
        onBackgroundChange={handleBackgroundChange}
      />
    </div>
  );
};
