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
import type { MeetingSettings } from './MeetingSettingsDialog';

interface RemoteParticipant {
  peerId: string;
  displayName: string;
  stream: MediaStream | null;
  isMuted?: boolean;
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
}

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
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | undefined>();
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const iceDisconnectTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Meeting settings & co-host state
  const [meetingSettings, setMeetingSettings] = useState<MeetingSettings>(initialSettings || DEFAULT_SETTINGS);
  const [coHostUserIds, setCoHostUserIds] = useState<string[]>([]);

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
        // Update analytics
        await supabase.from('meeting_guest_analytics')
          .update({ left_at: new Date().toISOString() })
          .eq('guest_token_id', guestTokenId)
          .is('left_at', null);
        // Calculate duration and send thank you email
        const { data: analyticsData } = await supabase
          .from('meeting_guest_analytics')
          .select('id, joined_at, left_at')
          .eq('guest_token_id', guestTokenId)
          .maybeSingle();
        if (analyticsData?.joined_at && analyticsData?.left_at) {
          const duration = Math.round((new Date(analyticsData.left_at).getTime() - new Date(analyticsData.joined_at).getTime()) / 1000);
          await supabase.from('meeting_guest_analytics').update({ duration_seconds: duration }).eq('id', analyticsData.id);
          // Trigger thank you email
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
    console.log('[VideoRoom] Cleanup complete');
  }, [roomId, user, guestMode, guestTokenId]);

  // beforeunload handler - fixed sendBeacon with proper Supabase headers
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (cleanupDoneRef.current) return;
      cleanupDoneRef.current = true;
      localStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
      connectionsRef.current.forEach(conn => { try { conn.close(); } catch {} });
      if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xzlhssqqbajqhnsmbucf.supabase.co';
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh6bGhzc3FxYmFqcWhuc21idWNmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMDI2MDksImV4cCI6MjA3Mzg3ODYwOX0.8eHStZeSprUJ6YNQy45hEQe1cpudDxCFvk6sihWKLhA';
      if (user) {
        const url = `${supabaseUrl}/rest/v1/meeting_room_participants?room_id=eq.${roomId}&user_id=eq.${user.id}`;
        const body = JSON.stringify({ is_active: false, left_at: new Date().toISOString() });
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json; charset=utf-8' }));
        // Also try with fetch keepalive as a more reliable fallback
        try {
          fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Prefer': 'return=minimal' },
            body,
            keepalive: true,
          }).catch(() => {});
        } catch {}
      } else if (guestTokenId) {
        const url = `${supabaseUrl}/rest/v1/meeting_room_participants?room_id=eq.${roomId}&guest_token_id=eq.${guestTokenId}`;
        const body = JSON.stringify({ is_active: false, left_at: new Date().toISOString() });
        try {
          fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'apikey': anonKey, 'Prefer': 'return=minimal' },
            body,
            keepalive: true,
          }).catch(() => {});
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, user, guestTokenId]);

  // Heartbeat: update last_seen_at every 30s
  useEffect(() => {
    if (!user && !guestTokenId) return;
    const heartbeat = async () => {
      if (document.hidden || cleanupDoneRef.current) return;
      try {
        if (guestTokenId) {
          await supabase.from('meeting_room_participants')
            .update({ updated_at: new Date().toISOString() })
            .eq('room_id', roomId).eq('guest_token_id', guestTokenId).eq('is_active', true);
        } else if (user) {
          await supabase.from('meeting_room_participants')
            .update({ updated_at: new Date().toISOString() })
            .eq('room_id', roomId).eq('user_id', user.id).eq('is_active', true);
        }
      } catch (e) { console.warn('[VideoRoom] Heartbeat failed:', e); }
    };
    const interval = setInterval(heartbeat, 30000);
    return () => clearInterval(interval);
  }, [roomId, user, guestTokenId]);

  // Visibility change: reconnect peer and sync participants
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden || cleanupDoneRef.current) return;
      console.log('[VideoRoom] Tab became visible, checking connections...');
      
      // 1. Reconnect PeerJS if disconnected
      const peer = peerRef.current;
      if (peer && peer.disconnected && !peer.destroyed) {
        console.log('[VideoRoom] Peer disconnected, reconnecting...');
        try { peer.reconnect(); } catch (e) { console.warn('[VideoRoom] Peer reconnect failed:', e); }
      }

      // 2. Check all existing connections for failed/closed ICE states
      const stream = localStreamRef.current;
      if (!stream) return;
      
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

      // 3. Sync participant list from DB and connect to missing peers
      try {
        const { data: activeParticipants } = await supabase
          .from('meeting_room_participants')
          .select('peer_id, display_name, user_id, guest_token_id, updated_at')
          .eq('room_id', roomId).eq('is_active', true);

        if (!activeParticipants) return;

        const now = Date.now();
        const staleThreshold = 90000; // 90s without heartbeat = stale

        // Remove ghosts from local list
        const activePeerIds = new Set<string>();
        for (const p of activeParticipants) {
          if (!p.peer_id) continue;
          // Skip self
          if (user && p.user_id === user.id) continue;
          if (guestTokenId && p.guest_token_id === guestTokenId) continue;
          
          const lastSeen = p.updated_at ? new Date(p.updated_at).getTime() : 0;
          if (now - lastSeen > staleThreshold) {
            // Mark stale participant as inactive in DB
            if (p.user_id) {
              supabase.from('meeting_room_participants').update({ is_active: false }).eq('room_id', roomId).eq('user_id', p.user_id).then(() => {});
            } else if (p.guest_token_id) {
              supabase.from('meeting_room_participants').update({ is_active: false }).eq('room_id', roomId).eq('guest_token_id', p.guest_token_id).then(() => {});
            }
            continue;
          }
          activePeerIds.add(p.peer_id);

          // Connect to peers we don't have a connection to
          if (!connectionsRef.current.has(p.peer_id)) {
            console.log(`[VideoRoom] Reconnecting to missing peer: ${p.peer_id}`);
            callPeer(p.peer_id, p.display_name || 'Uczestnik', stream, undefined, p.user_id || undefined);
          }
        }

        // Remove local participants not in active DB list
        setParticipants(prev => prev.filter(p => activePeerIds.has(p.peerId)));
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
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        } catch {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          } catch {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
        }
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        stream.getAudioTracks().forEach(t => (t.enabled = initialAudio));
        stream.getVideoTracks().forEach(t => (t.enabled = initialVideo));
        localStreamRef.current = stream;
        setLocalStream(stream);

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
            // Update analytics with join info
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
              console.error('[VideoRoom] Failed to register participant:', participantError);
              await supabase.from('meeting_room_participants').upsert(
                { room_id: roomId, user_id: user.id, peer_id: peerId, display_name: displayName, is_active: true, left_at: null, joined_at: new Date().toISOString() },
                { onConflict: 'room_id,user_id' }
              );
            }
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
          // Settings changed broadcast
          channel.on('broadcast', { event: 'settings-changed' }, ({ payload }) => {
            if (!cancelled && payload?.settings) {
              const newSettings = payload.settings as MeetingSettings;
              setMeetingSettings(newSettings);
              // Force disable mic/camera when permissions revoked (guests always affected)
              const isManager = !guestMode && (isHost || (user && coHostUserIds.includes(user.id)));
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
          // Co-host broadcasts (only for authenticated users)
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
          // Media state sync: listen for mute/camera changes from other participants
          channel.on('broadcast', { event: 'media-state-changed' }, ({ payload }) => {
            if (!cancelled && payload?.peerId) {
              setParticipants(prev => prev.map(p => 
                p.peerId === payload.peerId 
                  ? { ...p, isMuted: payload.isMuted } 
                  : p
              ));
            }
          });

          channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && !cancelled) {
              await channel.send({ type: 'broadcast', event: 'peer-joined', payload: { peerId, displayName, userId: user?.id, isGuest: guestMode } });
            }
          });

          // Fetch existing participants
          const { data: existing } = await supabase
            .from('meeting_room_participants')
            .select('peer_id, display_name, user_id, guest_token_id')
            .eq('room_id', roomId).eq('is_active', true);

          if (existing && !cancelled) {
            for (const p of existing) {
              // Skip self
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

          // Fallback: lookup from DB if metadata missing
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
    return () => { cancelled = true; cleanup(); };
  }, [user, roomId, guestMode, guestTokenId]);

  const callPeer = (remotePeerId: string, name: string, stream: MediaStream, avatarUrl?: string, userId?: string) => {
    if (!peerRef.current || connectionsRef.current.has(remotePeerId)) return;
    const call = peerRef.current.call(remotePeerId, stream, {
      metadata: { displayName, userId: user?.id, avatarUrl: localAvatarUrl },
    });
    if (call) handleCall(call, name, avatarUrl, userId);
  };

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

          // Clear any existing disconnect timer for this peer
          const existingTimer = iceDisconnectTimersRef.current.get(call.peer);
          if (existingTimer) {
            clearTimeout(existingTimer);
            iceDisconnectTimersRef.current.delete(call.peer);
          }

          if (state === 'connected' || state === 'completed') {
            reconnectAttemptsRef.current.delete(call.peer);
          } else if (state === 'disconnected') {
            // Start 10s timer - if still disconnected, treat as failed
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

  const reconnectToPeer = useCallback(async (peerId: string) => {
    const attempts = reconnectAttemptsRef.current.get(peerId) || 0;
    if (attempts >= 3) {
      console.warn(`[VideoRoom] Max reconnect attempts (3) reached for ${peerId}, giving up`);
      reconnectAttemptsRef.current.delete(peerId);
      removePeer(peerId);
      // Mark as inactive in DB
      supabase.from('meeting_room_participants')
        .update({ is_active: false })
        .eq('room_id', roomId).eq('peer_id', peerId).then(() => {});
      return;
    }
    reconnectAttemptsRef.current.set(peerId, attempts + 1);
    console.log(`[VideoRoom] Reconnect attempt ${attempts + 1}/3 for ${peerId}`);

    // Close old connection
    const oldConn = connectionsRef.current.get(peerId);
    if (oldConn) { try { oldConn.close(); } catch {} }
    connectionsRef.current.delete(peerId);

    // Get participant info before removing from state
    const participant = participants.find(p => p.peerId === peerId);

    // Re-call after delay
    setTimeout(() => {
      if (cleanupDoneRef.current || !peerRef.current || !localStreamRef.current) return;
      callPeer(peerId, participant?.displayName || 'Uczestnik', localStreamRef.current!, participant?.avatarUrl, participant?.userId);
    }, 2000);
  }, [roomId, participants]);

  const removePeer = (peerId: string) => {
    connectionsRef.current.delete(peerId);
    setParticipants((prev) => prev.filter((p) => p.peerId !== peerId));
  };

  // Controls
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      if (isMuted && !canMicrophone) {
        toast({ title: 'Mikrofon wyłączony', description: 'Prowadzący wyłączył możliwość używania mikrofonu.' });
        return;
      }
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = isMuted));
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      // Broadcast media state
      if (channelRef.current && peerRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'media-state-changed', payload: { peerId: peerRef.current.id, isMuted: newMuted, isCameraOff } });
      }
    }
  };

  const handleToggleCamera = () => {
    if (localStreamRef.current) {
      if (isCameraOff && !canCamera) {
        toast({ title: 'Kamera wyłączona', description: 'Prowadzący wyłączył możliwość używania kamery.' });
        return;
      }
      const newEnabled = isCameraOff;
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = newEnabled));
      const newCameraOff = !isCameraOff;
      setIsCameraOff(newCameraOff);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      // Broadcast media state
      if (channelRef.current && peerRef.current) {
        channelRef.current.send({ type: 'broadcast', event: 'media-state-changed', payload: { peerId: peerRef.current.id, isMuted, isCameraOff: newCameraOff } });
      }
    }
  };

  const handleToggleScreenShare = async () => {
    if (document.pictureInPictureElement) {
      try { await document.exitPictureInPicture(); } catch {}
      setIsPiPActive(false);
    }
    screenSharePendingRef.current = true;

    if (isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        stream.getAudioTracks().forEach(t => (t.enabled = !isMuted));
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsScreenSharing(false);
        const videoTrack = stream.getVideoTracks()[0];
        connectionsRef.current.forEach((conn) => {
          const sender = (conn as any).peerConnection?.getSenders()?.find((s: RTCRtpSender) => s.track?.kind === 'video');
          if (sender && videoTrack) sender.replaceTrack(videoTrack);
        });
      } catch (err) { console.error('[VideoRoom] Failed to restore camera:', err); }
      finally { screenSharePendingRef.current = false; }
    } else {
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
        videoTrack.onended = () => { handleToggleScreenShare(); };
      } catch (err) { console.log('[VideoRoom] Screen sharing cancelled:', err); }
      finally { screenSharePendingRef.current = false; }
    }
  };

  // PiP
  const handleTogglePiP = async () => {
    if (!isPiPSupported) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setIsPiPActive(false);
      } else if (activeVideoRef.current) {
        await activeVideoRef.current.requestPictureInPicture();
        setIsPiPActive(true);
        activeVideoRef.current.addEventListener('leavepictureinpicture', () => setIsPiPActive(false), { once: true });
      }
    } catch (err) { console.error('[VideoRoom] PiP error:', err); }
  };

  // Auto PiP on tab switch
  useEffect(() => {
    if (!isPiPSupported) return;
    const autoPiPRef = { current: false };

    const handleVisibility = async () => {
      if (screenSharePendingRef.current) return;
      try {
        if (document.hidden) {
          if (document.pictureInPictureElement) return;
          let pipVideo: HTMLVideoElement | null = activeVideoRef.current;
          if (!pipVideo?.srcObject || !pipVideo.videoWidth) {
            const allVideos = document.querySelectorAll('video');
            pipVideo = Array.from(allVideos).find(v => v.srcObject && v.videoWidth > 0 && !v.paused) || null;
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
    return () => document.removeEventListener('visibilitychange', handleVisibility);
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

  const handleLeave = async () => {
    try {
      await Promise.race([cleanup(), new Promise((resolve) => setTimeout(resolve, 3000))]);
    } catch (e) { console.warn('[VideoRoom] Cleanup error on leave:', e); }
    finally { onLeave(); }
  };

  const handleEndMeeting = async () => {
    if (channelRef.current) {
      try { await channelRef.current.send({ type: 'broadcast', event: 'meeting-ended', payload: {} }); } catch (e) { console.warn('[VideoRoom] Failed to broadcast meeting-ended:', e); }
    }
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
    const participant = participants.find(p => p.peerId === peerId);
    if (participant?.isMuted) {
      channelRef.current.send({ type: 'broadcast', event: 'unmute-request', payload: { targetPeerId: peerId } });
      toast({ title: 'Wysłano prośbę', description: 'Poproszono uczestnika o włączenie mikrofonu.' });
    } else {
      channelRef.current.send({ type: 'broadcast', event: 'mute-peer', payload: { targetPeerId: peerId } });
    }
  }, [participants, toast]);

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
        canScreenShare={canScreenShare && isScreenShareSupported}
        guestMode={guestMode}
      />
    </div>
  );
};
