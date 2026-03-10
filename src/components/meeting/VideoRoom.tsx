import React, { useEffect, useRef, useState, useCallback } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VideoGrid, setUserHasInteracted, getUserHasInteracted } from './VideoGrid';
import { MeetingControls } from './MeetingControls';
import { MeetingChat } from './MeetingChat';
import { ParticipantsPanel } from './ParticipantsPanel';
import { MeetingTimer } from './MeetingTimer';
import { useToast } from '@/hooks/use-toast';
import { useVideoBackground } from '@/hooks/useVideoBackground';
import { useCustomBackgrounds } from '@/hooks/useCustomBackgrounds';
import { useZoomBackgrounds } from '@/hooks/useZoomBackgrounds';
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
  const screenShareConnectionsRef = useRef<Map<string, MediaConnection>>(new Map());
  const screenShareStreamRef = useRef<MediaStream | null>(null);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(!initialAudio);
  const [isCameraOff, setIsCameraOff] = useState(!initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [remoteScreenShare, setRemoteScreenShare] = useState<{ peerId: string; displayName: string; stream: MediaStream } | null>(null);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const isChatOpenRef = useRef(isChatOpen);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [viewMode, setViewMode] = useState<import('./VideoGrid').ViewMode>(() => {
    if (roomId) {
      const saved = sessionStorage.getItem(`meeting_viewmode_${roomId}`);
      if (saved === 'gallery' || saved === 'multi-speaker' || saved === 'speaker') return saved;
    }
    return 'speaker';
  });
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | undefined>();
  const reconnectAttemptsRef = useRef<Map<string, number>>(new Map());
  const iceDisconnectTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const reconnectingPeersRef = useRef<Set<string>>(new Set());
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
    lastError: bgLastError,
    applyBackground,
    stopBackground,
    updateRawStream,
    getRawStream,
    setParticipantCount: setBgParticipantCount,
    getSavedBackground,
  } = useVideoBackground();

  // Lock to prevent concurrent background apply operations
  const isApplyingBackgroundRef = useRef(false);
  const stallCooldownRef = useRef(0);

  const { zoomBackgrounds } = useZoomBackgrounds();

  const {
    customImages: customBackgroundImages,
    isUploading: isUploadingBackground,
    uploadImage: uploadBackgroundImage,
    deleteImage: deleteBackgroundImage,
    refetch: refetchBackgrounds,
    maxBackgrounds: maxCustomBackgrounds,
  } = useCustomBackgrounds();

  // === Zmiana A: participantsRef synced with state ===
  const participantsRef = useRef<RemoteParticipant[]>([]);
  useEffect(() => { participantsRef.current = participants; }, [participants]);

  // Sync participant count to background processor for adaptive quality
  useEffect(() => { setBgParticipantCount(participants.length); }, [participants.length, setBgParticipantCount]);

   // === Local stream freeze detection + background processor stall recovery ===
  useEffect(() => {
    if (!localStreamRef.current) return;
    let frozenChecks = 0;
    let lastVideoTime = -1;

    const isMobilePWA = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Dynamically query the current local video element each interval
    // This prevents false positives when React remounts video elements during layout changes
    const freezeCheckInterval = setInterval(() => {
      if (document.hidden) return;

      // Always query fresh — element may have been remounted by layout change
      const videoEl = document.querySelector('video[data-local-video="true"]') as HTMLVideoElement | null;
      if (!videoEl || !localStreamRef.current) {
        frozenChecks = 0;
        lastVideoTime = -1;
        return;
      }

      const currentTime = videoEl.currentTime;
      if (currentTime === lastVideoTime && currentTime > 0) {
        frozenChecks++;
      } else {
        frozenChecks = 0;
      }
      lastVideoTime = currentTime;

      if (frozenChecks >= 2) { // 2 checks × 3s = 6s frozen
        frozenChecks = 0;
        // Verify the underlying track is actually dead before acting
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (!track || track.readyState === 'ended' || track.muted) {
          // Track is genuinely dead — real freeze
          if (isMobilePWA) {
            console.warn('[VideoRoom] Local video frozen 6s (mobile, track dead) — showing toast');
            toast({ title: 'Kamera się zawiesiła', description: 'Dotknij ikony kamery, aby ją ponownie włączyć.', variant: 'destructive' });
          } else {
            console.warn('[VideoRoom] Local video frozen for 6s (track dead), reacquiring...');
            reacquireLocalStream();
          }
        } else {
          // Track is alive — false alarm from layout remount, ignore
          console.log('[VideoRoom] Freeze check: video.currentTime stale but track alive — layout change, ignoring');
        }
      }
    }, 3000);

    // Listen for background processor stall events (with cooldown + hidden check)
    const handleStall = () => {
      if (document.hidden) {
        console.log('[VideoRoom] Ignoring background-processor-stalled (tab hidden)');
        return;
      }
      const now = Date.now();
      if (now - stallCooldownRef.current < 10000) {
        console.log('[VideoRoom] Stall recovery cooldown active, skipping');
        return;
      }
      stallCooldownRef.current = now;
      if (isMobilePWA) {
        console.warn('[VideoRoom] Background processor stalled (mobile) — showing toast');
        toast({ title: 'Efekt tła zawieszony', description: 'Dotknij ikony kamery, aby ponownie włączyć.', variant: 'destructive' });
      } else {
        console.warn('[VideoRoom] Background processor stalled, reacquiring stream...');
        reacquireLocalStream();
      }
    };
    window.addEventListener('background-processor-stalled', handleStall);

    return () => {
      if (freezeCheckInterval) clearInterval(freezeCheckInterval);
      window.removeEventListener('background-processor-stalled', handleStall);
    };
  }, [localStream]); // re-setup when localStream changes

  // === Adaptive bitrate limiter for peer connections ===
  const applyBitrateLimits = useCallback(async (call: MediaConnection, participantCount: number) => {
    try {
      const pc = (call as any).peerConnection as RTCPeerConnection | undefined;
      if (!pc) return;
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (!sender) return;
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      let maxBitrate: number;
      if (participantCount >= 4) {
        maxBitrate = isMobile ? 300_000 : 500_000;
      } else if (participantCount >= 2) {
        maxBitrate = isMobile ? 500_000 : 1_000_000;
      } else {
        maxBitrate = isMobile ? 800_000 : 1_500_000;
      }
      params.encodings[0].maxBitrate = maxBitrate;
      await sender.setParameters(params);
      console.log(`[VideoRoom] Bitrate limit set to ${maxBitrate / 1000}kbps for ${call.peer} (${participantCount} participants)`);
    } catch (e) {
      console.warn('[VideoRoom] Failed to apply bitrate limits:', e);
    }
  }, []);

  // === Adaptive video quality based on participant count ===
  useEffect(() => {
    // Use raw camera track for applyConstraints (canvas tracks don't support it)
    const rawStream = getRawStream();
    const rawTrack = rawStream?.getVideoTracks()[0];
    // Fallback to localStreamRef only if no raw stream available
    const fallbackStream = localStreamRef.current;
    const fallbackTrack = fallbackStream?.getVideoTracks()[0];
    const videoTrack = (rawTrack && rawTrack.readyState === 'live') ? rawTrack : fallbackTrack;
    if (!videoTrack || videoTrack.readyState !== 'live') return;

    // Skip canvas-captured tracks (they don't support applyConstraints)
    try {
      const caps = videoTrack.getCapabilities?.();
      if (caps && !caps.width) return; // Canvas track has no width capability
    } catch {}

    const count = participants.length;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    let constraints: MediaTrackConstraints;

    if (count >= 4) {
      constraints = { width: { ideal: 480 }, height: { ideal: 360 }, frameRate: { ideal: 15, max: 15 } };
    } else if (count >= 2) {
      constraints = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 20, max: 20 } };
    } else {
      constraints = isMobile
        ? { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 15, max: 20 } }
        : { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 24, max: 30 } };
    }

    videoTrack.applyConstraints(constraints).then(() => {
      console.log(`[VideoRoom] Adaptive quality: ${JSON.stringify(constraints)} for ${count} participants`);
    }).catch(e => console.warn('[VideoRoom] applyConstraints failed:', e));

    // Also update bitrate on existing connections
    connectionsRef.current.forEach((conn) => {
      applyBitrateLimits(conn, count);
    });
  }, [participants.length, applyBitrateLimits, getRawStream]);

  // === Zmiana C: isScreenSharingRef synced with state ===
  const isScreenSharingRef = useRef(false);
  useEffect(() => { isScreenSharingRef.current = isScreenSharing; }, [isScreenSharing]);

  // Refs for state used in reacquire closures
  const isMutedRef = useRef(isMuted);
  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);

  const isCameraOffRef = useRef(isCameraOff);
  useEffect(() => { isCameraOffRef.current = isCameraOff; }, [isCameraOff]);

  const bgModeRef = useRef(bgMode);
  useEffect(() => { bgModeRef.current = bgMode; }, [bgMode]);
  const bgSelectedImageRef = useRef(bgSelectedImage);
  useEffect(() => { bgSelectedImageRef.current = bgSelectedImage; }, [bgSelectedImage]);

  // Guard against reacquireLocalStream infinite loops
  const reacquireCooldownRef = useRef(0);

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

  // Persistent audio/video unlock on user gesture (mobile autoplay policy)
  const audioUnlockedRef = useRef(false);
  useEffect(() => {
    const unlockAudio = () => {
      // Set global interaction flag for all future media elements
      setUserHasInteracted();
      // Unlock iOS audio session with actual media element playback in gesture context
      if (!audioUnlockedRef.current) {
        audioUnlockedRef.current = true;
        try {
          const silence = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
          silence.play().catch(() => {});
        } catch {}
        try {
          const ctx = new AudioContext();
          ctx.resume().then(() => ctx.close()).catch(() => {});
        } catch {}
      }
      // Always: try to unlock paused remote videos on every user gesture
      document.querySelectorAll('video').forEach((v) => {
        const video = v as HTMLVideoElement;
        if (video.srcObject && video.getAttribute('data-local-video') !== 'true') {
          if (video.paused) {
            video.muted = false;
            video.play().catch(() => {});
          } else if (video.muted) {
            // Video gra wyciszone (autoplay fallback) - odblokuj dzwiek
            video.muted = false;
          }
        }
      });
      setAudioBlocked(false);
    };
    document.addEventListener('touchstart', unlockAudio);
    document.addEventListener('click', unlockAudio);
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

  // Test a single TURN server entry for reachability (returns true if relay candidate found within timeout)
  const testTurnServer = useCallback((server: RTCIceServer, timeoutMs = 3000): Promise<boolean> => {
    return new Promise((resolve) => {
      let resolved = false;
      const done = (result: boolean) => { if (!resolved) { resolved = true; resolve(result); } };

      const timer = setTimeout(() => done(false), timeoutMs);

      try {
        const pc = new RTCPeerConnection({ iceServers: [server] });
        pc.createDataChannel('test');
        pc.onicecandidate = (e) => {
          if (e.candidate && e.candidate.type === 'relay') {
            clearTimeout(timer);
            pc.close();
            done(true);
          }
        };
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete' && !resolved) {
            clearTimeout(timer);
            pc.close();
            done(false);
          }
        };
        pc.createOffer().then(offer => pc.setLocalDescription(offer)).catch(() => { clearTimeout(timer); done(false); });
      } catch {
        clearTimeout(timer);
        done(false);
      }
    });
  }, []);

  // Test all TURN servers and filter to only reachable ones
  const filterReachableTurnServers = useCallback(async (iceServers: RTCIceServer[]): Promise<RTCIceServer[]> => {
    const stunServers = iceServers.filter(s => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.every(u => u.startsWith('stun:'));
    });
    const turnServers = iceServers.filter(s => {
      const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
      return urls.some(u => u.startsWith('turn:') || u.startsWith('turns:'));
    });

    if (turnServers.length === 0) return iceServers;

    console.log(`[VideoRoom] Testing ${turnServers.length} TURN server group(s)...`);
    const results = await Promise.all(turnServers.map(async (server) => {
      const reachable = await testTurnServer(server);
      const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
      console.log(`[VideoRoom] TURN ${urls[0]}${urls.length > 1 ? ` (+${urls.length - 1})` : ''}: ${reachable ? '✅ OK' : '❌ unreachable'}`);
      return reachable ? server : null;
    }));

    const reachable = results.filter(Boolean) as RTCIceServer[];
    if (reachable.length === 0) {
      console.warn('[VideoRoom] ⚠️ No TURN servers reachable! Falling back to STUN only.');
      return stunServers;
    }
    console.log(`[VideoRoom] ${reachable.length}/${turnServers.length} TURN group(s) reachable`);
    return [...stunServers, ...reachable];
  }, [testTurnServer]);

  // Fetch TURN credentials
  const getTurnCredentials = useCallback(async () => {
    try {
      let iceServers: RTCIceServer[];
      if (guestMode && guestTokenId) {
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
        iceServers = data?.iceServers || [];
      } else {
        const { data, error } = await supabase.functions.invoke('get-turn-credentials');
        if (error) throw error;
        iceServers = data?.iceServers || [];
      }

      // Health check: filter out unreachable TURN servers
      const filtered = await filterReachableTurnServers(iceServers);
      return filtered;
    } catch (err) {
      console.error('[VideoRoom] Failed to get TURN credentials:', err);
      return [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ];
    }
  }, [guestMode, guestTokenId, filterReachableTurnServers]);

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

    // Update participant record — filter by peer_id to avoid deactivating a new session after refresh
    const cleanupPeerId = peerId; // already cached above (line 603)
    if (guestMode && guestTokenId) {
      try {
        const guestQ = supabase.from('meeting_room_participants')
          .update({ is_active: false, left_at: new Date().toISOString() })
          .eq('room_id', roomId).eq('guest_token_id', guestTokenId);
        if (cleanupPeerId) guestQ.eq('peer_id', cleanupPeerId);
        await guestQ;
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
        const userQ = supabase.from('meeting_room_participants')
          .update({ is_active: false, left_at: new Date().toISOString() })
          .eq('room_id', roomId).eq('user_id', user.id);
        if (cleanupPeerId) userQ.eq('peer_id', cleanupPeerId);
        await userQ;
      } catch (e) { console.warn('[VideoRoom] Failed to update participant status:', e); }
    }

    connectionsRef.current.forEach((conn) => { try { conn.close(); } catch {} });
    connectionsRef.current.clear();
    screenShareConnectionsRef.current.forEach((conn) => { try { conn.close(); } catch {} });
    screenShareConnectionsRef.current.clear();
    screenShareStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
    screenShareStreamRef.current = null;
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

      // Broadcast peer-left synchronicznie (best-effort)
      const peerId = peerRef.current?.id;
      if (peerId && channelRef.current) {
        try {
          channelRef.current.send({
            type: 'broadcast',
            event: 'peer-left',
            payload: { peerId }
          });
        } catch {}
      }

      localStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
      screenShareStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
      connectionsRef.current.forEach(conn => { try { conn.close(); } catch {} });
      screenShareConnectionsRef.current.forEach(conn => { try { conn.close(); } catch {} });
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

      // Fix: include peer_id in the filter so the unload PATCH only deactivates
      // the OLD record and doesn't race with the new session's INSERT after refresh
      const peerIdAtUnload = peerRef.current?.id;
      if (user) {
        let url = `${supabaseUrl}/rest/v1/meeting_room_participants?room_id=eq.${roomId}&user_id=eq.${user.id}`;
        if (peerIdAtUnload) url += `&peer_id=eq.${peerIdAtUnload}`;
        const body = JSON.stringify({ is_active: false, left_at: new Date().toISOString() });
        try {
          fetch(url, { method: 'PATCH', headers: authHeaders, body, keepalive: true }).catch(() => {});
        } catch {}
      } else if (guestTokenId) {
        let url = `${supabaseUrl}/rest/v1/meeting_room_participants?room_id=eq.${roomId}&guest_token_id=eq.${guestTokenId}`;
        if (peerIdAtUnload) url += `&peer_id=eq.${peerIdAtUnload}`;
        const body = JSON.stringify({ is_active: false, left_at: new Date().toISOString() });
        try {
          fetch(url, { method: 'PATCH', headers: authHeaders, body, keepalive: true }).catch(() => {});
        } catch {}
      }
    };
    // pagehide fires reliably on iOS/Android when app is closed or navigated away
    const handlePageHide = (e: PageTransitionEvent) => {
      if (!e.persisted) handleBeforeUnload();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [roomId, user, guestTokenId]);

  // === Local miss counter for graceful pruning ===
  const peerMissCountRef = useRef<Map<string, number>>(new Map());
  // === Retry counter for peer-unavailable errors ===
  const peerRetryCountRef = useRef<Map<string, number>>(new Map());

  // === Zmiana E: Self-healing heartbeat + graceful local pruning (NO global deactivation) ===
  useEffect(() => {
    if (!user && !guestTokenId) return;
    const heartbeat = async () => {
      if (cleanupDoneRef.current) return;
      try {
        // 1. Self-healing heartbeat: always set is_active=true, left_at=null (no .eq('is_active', true) condition)
        const now = new Date().toISOString();
        const peerIdValue = peerRef.current?.id || null;
        // Fix: guard heartbeat with peer_id so it won't resurrect an old/stale record
        if (guestTokenId) {
          const q = supabase.from('meeting_room_participants')
            .update({ updated_at: now, is_active: true, left_at: null, ...(peerIdValue ? { peer_id: peerIdValue } : {}) })
            .eq('room_id', roomId).eq('guest_token_id', guestTokenId);
          if (peerIdValue) q.eq('peer_id', peerIdValue);
          await q;
        } else if (user) {
          const q = supabase.from('meeting_room_participants')
            .update({ updated_at: now, is_active: true, left_at: null, ...(peerIdValue ? { peer_id: peerIdValue } : {}) })
            .eq('room_id', roomId).eq('user_id', user.id);
          if (peerIdValue) q.eq('peer_id', peerIdValue);
          await q;
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
            // Zmiana 4: Skip pruning for peers currently reconnecting
            if (reconnectingPeersRef.current.has(p.peerId)) {
              peerMissCountRef.current.delete(p.peerId);
              continue;
            }
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

              if (missCount >= 2) {
                // 2 consecutive misses + no live connection -> remove locally
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
            console.log('[VideoRoom] Removing ghost participants after 2 misses:', toRemove);
            toRemove.forEach(peerId => {
              const conn = connectionsRef.current.get(peerId);
              if (conn) { try { conn.close(); } catch {} }
              connectionsRef.current.delete(peerId);
            });
            setParticipants(prev => prev.filter(p => !toRemove.includes(p.peerId)));
          }

          // Heartbeat reconnect: call peers active in DB but missing from connectionsRef
          for (const p of activeParticipants) {
            if (!p.peer_id) continue;
            if (user && p.user_id === user.id) continue;
            if (guestTokenId && p.guest_token_id === guestTokenId) continue;
            if (!connectionsRef.current.has(p.peer_id) && localStreamRef.current && peerRef.current) {
              console.log(`[VideoRoom] Heartbeat: reconnecting to missing peer ${p.peer_id}`);
              callPeer(p.peer_id, p.display_name || 'Uczestnik', localStreamRef.current, undefined, p.user_id || undefined);
            }
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
          if (!connectionsRef.current.has(newRow.peer_id)) {
            if (localStreamRef.current) {
              console.log(`[VideoRoom] DB INSERT detected new peer: ${newRow.peer_id}, calling...`);
              callPeer(newRow.peer_id, newRow.display_name || 'Uczestnik', localStreamRef.current!, undefined, newRow.user_id || undefined);
            } else {
              // Stream not ready yet — retry in 2s
              console.log(`[VideoRoom] DB INSERT: localStream not ready for ${newRow.peer_id}, retrying in 2s...`);
              setTimeout(() => {
                if (!connectionsRef.current.has(newRow.peer_id) && localStreamRef.current) {
                  console.log(`[VideoRoom] DB INSERT retry: calling peer ${newRow.peer_id}`);
                  callPeer(newRow.peer_id, newRow.display_name || 'Uczestnik', localStreamRef.current!, undefined, newRow.user_id || undefined);
                }
              }, 2000);
            }
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

      // Debounce on mobile — wait 200ms to confirm tab is truly visible
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      if (isMobile) {
        await new Promise(r => setTimeout(r, 200));
        if (document.hidden) return;
      }

      console.log('[VideoRoom] Tab became visible, checking connections...');
      
      const peer = peerRef.current;
      if (peer && peer.disconnected && !peer.destroyed) {
        console.log('[VideoRoom] Peer disconnected, reconnecting...');
        try { peer.reconnect(); } catch (e) { console.warn('[VideoRoom] Peer reconnect failed:', e); }
      }

      let stream = localStreamRef.current;
      const tracksAlive = stream?.getTracks().some(t => t.readyState === 'live');
      if (!stream || !tracksAlive) {
        console.log('[VideoRoom] Re-acquiring stream (alive=' + tracksAlive + ')');
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

      // Resume any paused remote video elements (iOS autoplay policy)
      document.querySelectorAll('video').forEach(v => {
        if ((v as HTMLVideoElement).paused && (v as HTMLVideoElement).srcObject) {
          (v as HTMLVideoElement).play().catch(() => {});
        }
      });
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
      // Mark interaction for all entry paths (lobby, auto-rejoin, mobile)
      setUserHasInteracted();
      // Try unlocking iOS audio session even without gesture (best-effort)
      try {
        const silence = new Audio("data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=");
        silence.play().catch(() => {});
      } catch {}
      // Show mobile hint for auto-rejoin (no lobby gesture)
      const isMob = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      if (isMob && !audioUnlockedRef.current) {
        toast({ title: 'Dotknij ekranu, aby odblokować dźwięk', description: 'iOS/Android wymaga interakcji użytkownika' });
      }
      try {
        let stream: MediaStream | null = null;
        // Try to reuse the lobby stream (preserves user gesture context)
        const lobbyStreamAlive = initialStream?.getTracks().some(t => t.readyState === 'live');
        if (initialStream && lobbyStreamAlive) {
          console.log('[VideoRoom] Reusing lobby stream');
          stream = initialStream;
        } else {
          stream = await acquireMediaByPreference(initialVideo, initialAudio);
          if (!stream) {
            stream = new MediaStream();
            setIsMuted(true);
            setIsCameraOff(true);
            toast({ title: 'Brak dostępu do kamery/mikrofonu', description: 'Dołączasz bez kamery. Kliknij ikonę kamery, aby spróbować ponownie.', variant: 'destructive' });
          }
        }
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        stream.getAudioTracks().forEach(t => (t.enabled = initialAudio));
        stream.getVideoTracks().forEach(t => (t.enabled = initialVideo));
        localStreamRef.current = stream;
        setLocalStream(stream);
        updateRawStream(stream);

        // Track ended listeners for auto re-acquire (desktop only; mobile needs user gesture)
        const isMob = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        stream.getTracks().forEach(track => {
          track.addEventListener('ended', () => {
            if (!cleanupDoneRef.current) {
              console.warn('[VideoRoom] Local track ended unexpectedly:', track.kind);
              if (isMob) {
                toast({ title: 'Kamera/mikrofon wyłączony', description: 'Dotknij ikony kamery, aby ponownie włączyć.', variant: 'destructive' });
              } else {
                reacquireLocalStream();
              }
            }
          });
        });

        // Non-blocking TURN: start PeerJS immediately with full server list, filter in background
        const iceServersPromise = getTurnCredentials();
        // Use basic STUN to start immediately, upgrade ICE config when TURN test finishes
        const fallbackIce: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
        let iceServers: RTCIceServer[];
        // Race: use TURN if ready within 500ms, otherwise start with STUN
        const raceResult = await Promise.race([
          iceServersPromise.then(s => ({ type: 'turn' as const, servers: s })),
          new Promise<{ type: 'fallback'; servers: RTCIceServer[] }>(r => setTimeout(() => r({ type: 'fallback', servers: fallbackIce }), 500)),
        ]);
        iceServers = raceResult.servers;
        const startedWithFallback = raceResult.type === 'fallback';
        const peer = new Peer({ config: { iceServers, iceTransportPolicy: 'all' as RTCIceTransportPolicy }, debug: 1 });
        // If started with fallback, upgrade config when TURN servers are ready
        if (startedWithFallback) {
          iceServersPromise.then(turnServers => {
            if (cancelled || !peerRef.current || peerRef.current.destroyed) return;
            console.log('[VideoRoom] TURN servers ready, upgrading ICE config for future connections');
            (peerRef.current as any).options.config = { iceServers: turnServers, iceTransportPolicy: 'all' };
          }).catch(() => {});
        }
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
            // Delete + insert instead of upsert (partial index incompatible with onConflict)
            await supabase.from('meeting_room_participants')
              .delete()
              .eq('room_id', roomId)
              .eq('user_id', user.id);

            const { error: insertError } = await supabase.from('meeting_room_participants').insert({
              room_id: roomId,
              user_id: user.id,
              peer_id: peerId,
              display_name: displayName,
              is_active: true,
              joined_at: new Date().toISOString(),
            });
            if (insertError) {
              console.error('[VideoRoom] Failed to register participant:', insertError);
              toast({ title: 'Błąd dołączania', description: 'Nie udało się zarejestrować w spotkaniu. Spróbuj odświeżyć stronę.', variant: 'destructive' });
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
                // Deduplikacja po userId: usun stary wpis tego samego uzytkownika (reconnect z nowym peerId)
                if (payload.userId) {
                  setParticipants(prev => {
                    const oldEntries = prev.filter(p => p.userId === payload.userId && p.peerId !== payload.peerId);
                    oldEntries.forEach(old => {
                      const oldConn = connectionsRef.current.get(old.peerId);
                      if (oldConn) { try { oldConn.close(); } catch {} }
                      connectionsRef.current.delete(old.peerId);
                      reconnectingPeersRef.current.delete(old.peerId);
                    });
                    return prev.filter(p => !(p.userId === payload.userId && p.peerId !== payload.peerId));
                  });
                }
                callPeer(payload.peerId, payload.displayName, localStreamRef.current || stream, undefined, payload.userId);
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
            channel.on('broadcast', { event: 'screen-share-started' }, ({ payload }) => {
              if (!cancelled) {
                console.log('[VideoRoom] Screen share started by', payload?.displayName);
                // UI hint - the actual stream arrives via peer.on('call')
              }
            });
            channel.on('broadcast', { event: 'screen-share-stopped' }, ({ payload }) => {
              if (!cancelled) {
                console.log('[VideoRoom] Screen share stopped by', payload?.peerId);
                setRemoteScreenShare(null);
                // Don't close connections explicitly - let host close them
                // to avoid PeerJS interference with main camera connections
                screenShareConnectionsRef.current.clear();
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
                callPeer(p.peer_id, p.display_name || 'Uczestnik', localStreamRef.current || stream, avatarUrl, p.user_id || undefined);
              }
            }
          }
        });

        peer.on('call', async (call) => {
          if (cancelled) return;

          const meta = call.metadata || {};

          // === Handle screen-share calls separately ===
          if (meta.type === 'screen-share') {
            console.log('[VideoRoom] Incoming screen-share call from', call.peer);
            call.answer(new MediaStream()); // answer with empty stream
            call.on('stream', (screenStream) => {
              console.log('[VideoRoom] Received screen share stream from', call.peer);
              setRemoteScreenShare({
                peerId: meta.sharerPeerId || call.peer,
                displayName: meta.displayName || 'Uczestnik',
                stream: screenStream,
              });
            });
            call.on('close', () => {
              console.log('[VideoRoom] Screen share call closed');
              setRemoteScreenShare(null);
            });
            call.on('error', () => {
              setRemoteScreenShare(null);
            });
            // Store for cleanup
            screenShareConnectionsRef.current.set(call.peer, call);
            return;
          }

          // Deduplikacja: sprawdź czy już mamy żywe połączenie do tego peera
          const existingConn = connectionsRef.current.get(call.peer);
          if (existingConn) {
            const pc = (existingConn as any).peerConnection as RTCPeerConnection | undefined;
            const iceState = pc?.iceConnectionState;
            if (iceState === 'connected' || iceState === 'completed' || iceState === 'checking' || iceState === 'new') {
              console.log(`[VideoRoom] Already have active connection to ${call.peer} (ICE: ${iceState}), skipping incoming call`);
              return;
            }
            // Stare połączenie jest martwe - zamknij i przyjmij nowe
            try { existingConn.close(); } catch {}
            connectionsRef.current.delete(call.peer);
          }

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

          // Deduplikacja po userId: usun stare wpisy tego samego uzytkownika przed przyjęciem nowego połączenia
          if (callerUserId) {
            setParticipants(prev => {
              const oldEntries = prev.filter(p => p.userId === callerUserId && p.peerId !== call.peer);
              oldEntries.forEach(old => {
                const oldConn = connectionsRef.current.get(old.peerId);
                if (oldConn) { try { oldConn.close(); } catch {} }
                connectionsRef.current.delete(old.peerId);
                reconnectingPeersRef.current.delete(old.peerId);
              });
              return prev.filter(p => !(p.userId === callerUserId && p.peerId !== call.peer));
            });
          }

          call.answer(localStreamRef.current || stream);
          handleCall(call, name, callerAvatar, callerUserId);
        });

        peer.on('error', (err) => {
          console.error('[VideoRoom] Peer error:', err);
          if (err.type === 'peer-unavailable') {
            const failedPeerId = (err as any).message?.match(/peer\s+(\S+)/)?.[1];
            if (failedPeerId) {
              // Fix: retry instead of immediately removing — peer may not be registered yet
              const retryCount = (peerRetryCountRef.current.get(failedPeerId) || 0) + 1;
              peerRetryCountRef.current.set(failedPeerId, retryCount);
              if (retryCount <= 3) {
                console.log(`[VideoRoom] peer-unavailable for ${failedPeerId}, retry ${retryCount}/3 in ${retryCount * 3}s`);
                setTimeout(async () => {
                  if (cancelled || cleanupDoneRef.current) return;
                  // Verify peer is still active in DB before retrying
                  const { data } = await supabase
                    .from('meeting_room_participants')
                    .select('peer_id, display_name, user_id, guest_token_id')
                    .eq('room_id', roomId)
                    .eq('peer_id', failedPeerId)
                    .eq('is_active', true)
                    .maybeSingle();
                  if (data && peerRef.current && localStreamRef.current) {
                    console.log(`[VideoRoom] Retrying call to ${failedPeerId}`);
                    callPeer(failedPeerId, data.display_name || 'Uczestnik', localStreamRef.current, undefined, data.user_id || undefined);
                  } else {
                    peerRetryCountRef.current.delete(failedPeerId);
                  }
                }, retryCount * 3000);
              } else {
                console.log(`[VideoRoom] peer-unavailable for ${failedPeerId}, max retries reached — removing`);
                peerRetryCountRef.current.delete(failedPeerId);
                removePeer(failedPeerId);
              }
            }
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
    const activeStream = localStreamRef.current || stream;
    const call = peerRef.current.call(remotePeerId, activeStream, {
      metadata: { displayName, userId: user?.id, avatarUrl: localAvatarUrlRef.current },
    });
    if (call) handleCall(call, name, avatarUrl, userId);
  }, [displayName, user?.id]);

  const handleCall = (call: MediaConnection, name: string, avatarUrl?: string, userId?: string) => {
    connectionsRef.current.set(call.peer, call);
    const timeout = setTimeout(() => {
      // Only act if this is still the active connection for this peer
      if (connectionsRef.current.get(call.peer) !== call) return;
      console.warn('[VideoRoom] Connection timeout for peer:', call.peer);
      connectionsRef.current.delete(call.peer);
      reconnectToPeer(call.peer);
    }, 15000);

    call.on('stream', (remoteStream) => {
      clearTimeout(timeout);
      // Zmiana 5: Clear reconnecting flag on successful stream
      reconnectingPeersRef.current.delete(call.peer);
      reconnectAttemptsRef.current.delete(call.peer);
      // Fix: Reset peer-unavailable retry counter on successful stream
      peerRetryCountRef.current.delete(call.peer);
      // Apply bitrate limits after connection established
      applyBitrateLimits(call, participantsRef.current.length + 1);
      setParticipants((prev) => {
        const exists = prev.find((p) => p.peerId === call.peer);
        if (exists) return prev.map((p) => p.peerId === call.peer ? { ...p, stream: remoteStream } : p);

        // Deduplikacja po userId: usun stare wpisy tego samego uzytkownika z innym peerId
        let cleaned = prev;
        if (userId) {
          const oldEntries = prev.filter(p => p.userId === userId && p.peerId !== call.peer);
          oldEntries.forEach(old => {
            const oldConn = connectionsRef.current.get(old.peerId);
            if (oldConn) { try { oldConn.close(); } catch {} }
            connectionsRef.current.delete(old.peerId);
          });
          cleaned = prev.filter(p => !(p.userId === userId && p.peerId !== call.peer));
        }

        return [...cleaned, { peerId: call.peer, displayName: name, stream: remoteStream, avatarUrl, userId }];
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

      // Auto-unlock muted videos on mobile (gesture was in lobby)
      if (getUserHasInteracted()) {
        setTimeout(() => {
          document.querySelectorAll('video').forEach(v => {
            const video = v as HTMLVideoElement;
            if (video.muted && video.getAttribute('data-local-video') !== 'true' && video.srcObject) {
              video.muted = false;
              video.play().catch(() => {});
            }
          });
          setAudioBlocked(false);
        }, 500);
      }

      // If we're screen sharing, also send screen stream to this new participant
      if (isScreenSharingRef.current && screenShareStreamRef.current && peerRef.current) {
        const myPeerId = peerRef.current.id;
        if (!screenShareConnectionsRef.current.has(call.peer)) {
          const screenCall = peerRef.current.call(call.peer, screenShareStreamRef.current, {
            metadata: {
              displayName,
              type: 'screen-share',
              userId: user?.id,
              sharerPeerId: myPeerId,
            },
          });
          if (screenCall) {
            screenShareConnectionsRef.current.set(call.peer, screenCall);
            screenCall.on('close', () => screenShareConnectionsRef.current.delete(call.peer));
            screenCall.on('error', () => screenShareConnectionsRef.current.delete(call.peer));
          }
        }
      }
    });

    call.on('close', () => {
      clearTimeout(timeout);
      if (connectionsRef.current.get(call.peer) === call) {
        removePeer(call.peer);
      }
    });
    call.on('error', (err) => {
      clearTimeout(timeout);
      console.error('[VideoRoom] Call error:', call.peer, err);
      if (connectionsRef.current.get(call.peer) === call) {
        removePeer(call.peer);
      }
    });

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
            // Verify local tracks are live — fix race when stream re-acquired before ICE connected
            try {
              const senders = pc.getSenders();
              const audioSender = senders.find(s => s.track?.kind === 'audio');
              const currentAudioTrack = localStreamRef.current?.getAudioTracks()[0];
              if (audioSender && currentAudioTrack &&
                  (audioSender.track?.readyState === 'ended' || !audioSender.track)) {
                audioSender.replaceTrack(currentAudioTrack).catch(() => {});
                console.log(`[VideoRoom] Replaced dead audio track for ${call.peer}`);
              }
              const videoSender = senders.find(s => s.track?.kind === 'video');
              const currentVideoTrack = localStreamRef.current?.getVideoTracks()[0];
              if (videoSender && currentVideoTrack &&
                  (videoSender.track?.readyState === 'ended' || !videoSender.track)) {
                videoSender.replaceTrack(currentVideoTrack).catch(() => {});
                console.log(`[VideoRoom] Replaced dead video track for ${call.peer}`);
              }
            } catch (e) { /* ignore */ }
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
      console.warn(`[VideoRoom] Max reconnect attempts (3) reached for ${peerId}, checking DB for new peer_id`);
      // Check if participant reconnected with a new peer_id
      const participant = participantsRef.current.find(p => p.peerId === peerId);
      if (participant?.userId) {
        try {
          const { data } = await supabase
            .from('meeting_room_participants')
            .select('peer_id, display_name')
            .eq('room_id', roomId)
            .eq('user_id', participant.userId)
            .eq('is_active', true)
            .neq('peer_id', peerId)
            .maybeSingle();
          if (data?.peer_id && !connectionsRef.current.has(data.peer_id)) {
            console.log(`[VideoRoom] Found new peer_id ${data.peer_id} for user ${participant.userId}, reconnecting`);
            reconnectingPeersRef.current.delete(peerId);
            reconnectAttemptsRef.current.delete(peerId);
            setParticipants(prev => prev.filter(p => p.peerId !== peerId));
            callPeer(data.peer_id, data.display_name || 'Uczestnik', localStreamRef.current!, undefined, participant.userId);
            return;
          }
        } catch (e) {
          console.warn('[VideoRoom] DB lookup for new peer_id failed:', e);
        }
      }
      reconnectAttemptsRef.current.delete(peerId);
      reconnectingPeersRef.current.delete(peerId);
      removePeer(peerId);
      return;
    }
    reconnectAttemptsRef.current.set(peerId, attempts + 1);
    // Zmiana 2: Mark peer as reconnecting
    reconnectingPeersRef.current.add(peerId);
    console.log(`[VideoRoom] Reconnect attempt ${attempts + 1}/3 for ${peerId}`);

    // Zmiana 1: Delete from map BEFORE closing to prevent close handler from calling removePeer
    const oldConn = connectionsRef.current.get(peerId);
    connectionsRef.current.delete(peerId);
    if (oldConn) { try { oldConn.close(); } catch {} }

    // Use ref for fresh participant data
    const participant = participantsRef.current.find(p => p.peerId === peerId);

    // Re-call after delay
    setTimeout(() => {
      if (cleanupDoneRef.current || !peerRef.current || !localStreamRef.current) return;
      callPeer(peerId, participant?.displayName || 'Uczestnik', localStreamRef.current!, participant?.avatarUrl, participant?.userId);
    }, 2000);
  }, [roomId]);

  const removePeer = (peerId: string) => {
    connectionsRef.current.delete(peerId);
    // Zmiana 3: Don't remove from UI during reconnect - keep with stream=null
    if (reconnectingPeersRef.current.has(peerId)) {
      setParticipants(prev => prev.map(p =>
        p.peerId === peerId ? { ...p, stream: null } : p
      ));
      return;
    }
    setParticipants((prev) => prev.filter((p) => p.peerId !== peerId));
  };

  // === Realtime subscription: detect participant deactivation via DB ===
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase
      .channel(`participant-status-${roomId}`)
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
          if (updated.is_active === false && updated.peer_id) {
            const myPeerId = peerRef.current?.id;
            if (updated.peer_id !== myPeerId) {
              console.log('[VideoRoom] Participant deactivated via DB:', updated.peer_id);
              removePeer(updated.peer_id);
            }
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId]);


  // === reacquireLocalStream: re-acquire media when stream is lost (mobile bg, etc.) ===
  const reacquireLocalStream = useCallback(async (): Promise<MediaStream | null> => {
    // Guard against rapid re-acquisition loops
    const now = Date.now();
    if (now - reacquireCooldownRef.current < 3000) {
      console.warn('[VideoRoom] reacquireLocalStream: cooldown active, skipping');
      return localStreamRef.current;
    }
    reacquireCooldownRef.current = now;
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

      // Preserve user's mute/camera state on fresh tracks
      stream.getAudioTracks().forEach(t => t.enabled = !isMutedRef.current);
      stream.getVideoTracks().forEach(t => t.enabled = !isCameraOffRef.current);

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

      // Re-apply background effect if active (from state or localStorage)
      let effectiveMode = bgModeRef.current;
      let effectiveImage = bgSelectedImageRef.current;
      if (effectiveMode === 'none') {
        const saved = getSavedBackground();
        effectiveMode = saved.mode;
        effectiveImage = saved.image;
      }
      if (effectiveMode !== 'none') {
        try {
          const processedStream = await applyBackground(stream, effectiveMode, effectiveImage);
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
      return localStreamRef.current || stream;
    } catch (err) {
      console.error('[VideoRoom] reacquireLocalStream failed:', err);
      return null;
    }
  }, [toast, applyBackground, updateRawStream, getSavedBackground]);

  // (Visibility change media re-acquire is handled in the main visibilitychange handler above)

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
    // Persist to sessionStorage for auto-rejoin
    if (roomId) {
      try {
        const raw = sessionStorage.getItem(`meeting_session_${roomId}`);
        if (raw) { const s = JSON.parse(raw); s.audioEnabled = !newMuted; sessionStorage.setItem(`meeting_session_${roomId}`, JSON.stringify(s)); }
      } catch {}
    }
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
    // Persist to sessionStorage for auto-rejoin
    if (roomId) {
      try {
        const raw = sessionStorage.getItem(`meeting_session_${roomId}`);
        if (raw) { const s = JSON.parse(raw); s.videoEnabled = !newCameraOff; sessionStorage.setItem(`meeting_session_${roomId}`, JSON.stringify(s)); }
      } catch {}
    }
    if (channelRef.current && peerRef.current) {
      channelRef.current.send({ type: 'broadcast', event: 'media-state-changed', payload: { peerId: peerRef.current.id, isMuted, isCameraOff: newCameraOff } });
    }
  };

  // === Dual-stream screen share: separate PeerJS calls for screen ===
  const stopScreenShare = useCallback(() => {
    // Stop screen stream tracks
    screenShareStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
    screenShareStreamRef.current = null;
    // Close all screen share connections
    screenShareConnectionsRef.current.forEach((conn) => { try { conn.close(); } catch {} });
    screenShareConnectionsRef.current.clear();
    setIsScreenSharing(false);
    // Broadcast stop
    if (channelRef.current && peerRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'screen-share-stopped',
        payload: { peerId: peerRef.current.id },
      });
    }
  }, []);

  const handleToggleScreenShare = async () => {
    if (document.pictureInPictureElement) {
      try { await document.exitPictureInPicture(); } catch {}
      setIsPiPActive(false);
    }
    screenSharePendingRef.current = true;

    if (isScreenSharing) {
      // Turning off screen share
      try {
        stopScreenShare();
      } catch (err) { console.error('[VideoRoom] Failed to stop screen share:', err); }
      finally { screenSharePendingRef.current = false; }
    } else {
      // Starting screen share — do NOT replace camera track
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenShareStreamRef.current = screenStream;
        setIsScreenSharing(true);

        const myPeerId = peerRef.current?.id;

        // Send screen stream as second call to each participant
        participantsRef.current.forEach(p => {
          if (!peerRef.current) return;
          const call = peerRef.current.call(p.peerId, screenStream, {
            metadata: {
              displayName,
              type: 'screen-share',
              userId: user?.id,
              sharerPeerId: myPeerId,
            },
          });
          if (call) {
            screenShareConnectionsRef.current.set(p.peerId, call);
            call.on('close', () => screenShareConnectionsRef.current.delete(p.peerId));
            call.on('error', () => screenShareConnectionsRef.current.delete(p.peerId));
          }
        });

        // Broadcast screen-share-started
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'screen-share-started',
            payload: { peerId: myPeerId, displayName },
          });
        }

        // Handle browser stop button
        const videoTrack = screenStream.getVideoTracks()[0];
        videoTrack.onended = () => {
          if (isScreenSharingRef.current) {
            stopScreenShare();
          }
        };
      } catch (err) { console.log('[VideoRoom] Screen sharing cancelled:', err); }
      finally { screenSharePendingRef.current = false; }
    }
  };

  // PiP
  const autoPiPRef = useRef(false);
  const participantsCountRef = useRef(participants.length);
  participantsCountRef.current = participants.length;

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
        // Reject local video if remote participants exist
        const hasRemote = participants.length > 0;
        if (pipVideo?.getAttribute('data-local-video') === 'true' && hasRemote) {
          pipVideo = null;
        }
        if (!pipVideo?.srcObject || !pipVideo.videoWidth) {
          const allVideos = document.querySelectorAll('video');
          pipVideo = Array.from(allVideos).find(
            v => v.srcObject && (v as HTMLVideoElement).videoWidth > 0 && !v.paused && v.getAttribute('data-local-video') !== 'true' && v.getAttribute('data-audio-only') !== 'true'
          ) as HTMLVideoElement || (!hasRemote ? Array.from(allVideos).find(
            v => v.srcObject && (v as HTMLVideoElement).videoWidth > 0 && !v.paused && v.getAttribute('data-audio-only') !== 'true'
          ) as HTMLVideoElement : null) || null;
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
          const hasRemote = participantsCountRef.current > 0;
          if (pipVideo?.getAttribute('data-local-video') === 'true' && hasRemote) {
            pipVideo = null;
          }
          if (!pipVideo?.srcObject || !pipVideo.videoWidth) {
            const allVideos = document.querySelectorAll('video');
            pipVideo = Array.from(allVideos).find(
              v => v.srcObject && (v as HTMLVideoElement).videoWidth > 0 && !v.paused && v.getAttribute('data-local-video') !== 'true' && v.getAttribute('data-audio-only') !== 'true'
            ) as HTMLVideoElement || (!hasRemote ? Array.from(allVideos).find(
              v => v.srcObject && (v as HTMLVideoElement).videoWidth > 0 && !v.paused && v.getAttribute('data-audio-only') !== 'true'
            ) as HTMLVideoElement : null) || null;
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
          if (document.pictureInPictureElement) {
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

  // Sync isChatOpenRef
  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);

  // Persistent realtime subscription for unread chat badge (lives outside MeetingChat)
  useEffect(() => {
    const channel = supabase
      .channel(`meeting-chat-unread:${roomId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'meeting_chat_messages',
        filter: `room_id=eq.${roomId}`,
      }, (payload) => {
        const msg = payload.new as any;
        const isOwn = guestTokenId
          ? msg.guest_token_id === guestTokenId
          : msg.user_id === user?.id;
        if (!isOwn && !isChatOpenRef.current) {
          setUnreadChatCount(prev => prev + 1);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, user?.id, guestTokenId]);

  const handleNewChatMessage = useCallback(() => {
    // Keep as fallback for when chat is open (MeetingChat also calls this)
  }, []);

  // Background change handler
  const handleBackgroundChange = useCallback(async (newMode: BackgroundMode, imageSrc?: string) => {
    // Guard: camera must be on for background effects
    if (newMode !== 'none' && isCameraOff) {
      toast({ title: 'Włącz kamerę', description: 'Aby użyć efektów tła, najpierw włącz kamerę.', variant: 'destructive' });
      return;
    }

    // Lock to prevent concurrent apply operations
    if (isApplyingBackgroundRef.current) {
      console.warn('[VideoRoom] Background change already in progress, skipping');
      return;
    }
    isApplyingBackgroundRef.current = true;

    try {
      let stream = localStreamRef.current;
      if (!stream) { isApplyingBackgroundRef.current = false; return; }

      // Check if stream is dead — use reacquireLocalStream instead of raw getUserMedia
      const currentVideoTrack = stream.getVideoTracks()[0];
      if (newMode !== 'none' && (!currentVideoTrack || currentVideoTrack.readyState === 'ended')) {
        toast({ title: 'Odzyskiwanie kamery...', description: 'Strumień wideo wygasł, próbuję ponownie.' });
        const freshStream = await reacquireLocalStream();
        if (!freshStream) {
          isApplyingBackgroundRef.current = false;
          return;
        }
        stream = freshStream;
      }

      // Ensure raw stream is up-to-date before applying new effect
      const activeStream = localStreamRef.current!;
      if (!(activeStream as any).__bgProcessed) {
        updateRawStream(activeStream);
      }
      const processedStream = await applyBackground(activeStream, newMode, imageSrc);
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
    } catch (err: any) {
      console.error('[VideoRoom] Background change failed:', err);
      const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      const errorCode = err?.code || '';
      
      let description = 'Nie udało się zastosować efektu. Spróbuj ponownie.';
      if (errorCode === 'BG_MODEL_INIT_FAILED') {
        description = isMobile
          ? 'Model tła nie załadował się na tym urządzeniu. Spróbuj lżejszego efektu (rozmycie).'
          : 'Nie udało się załadować modelu segmentacji. Odśwież stronę.';
      } else if (errorCode === 'BG_FALLBACK_BLUR') {
        // This is actually a partial success — blur-light was applied as fallback
        toast({ title: 'Zastosowano lekkie rozmycie', description: 'Wybrany efekt był zbyt ciężki dla tego urządzenia.' });
        isApplyingBackgroundRef.current = false;
        return;
      } else if (isMobile) {
        description = 'Efekt tła nie jest dostępny na tym urządzeniu. Spróbuj ponownie po chwili.';
      }
      toast({ title: 'Błąd efektu tła', description, variant: 'destructive' });
    } finally {
      isApplyingBackgroundRef.current = false;
    }
  }, [applyBackground, updateRawStream, isCameraOff, toast, reacquireLocalStream]);

  // Persist viewMode to sessionStorage
  useEffect(() => {
    if (roomId) sessionStorage.setItem(`meeting_viewmode_${roomId}`, viewMode);
  }, [roomId, viewMode]);

  const handleLeave = async () => {
    if (roomId) sessionStorage.removeItem(`meeting_viewmode_${roomId}`);
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

    // 3. Update end_time in events table so widgets stop showing this meeting
    try {
      await supabase.from('events')
        .update({ end_time: new Date().toISOString() })
        .eq('meeting_room_id', roomId);
    } catch (e) { console.warn('[VideoRoom] Failed to update event end_time:', e); }

    // 4. Expire guest tokens for this room's event
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

    // 5. Fill missing left_at in guest analytics
    try {
      await supabase.from('meeting_guest_analytics')
        .update({ left_at: new Date().toISOString() })
        .eq('room_id', roomId)
        .is('left_at', null);
    } catch (e) { console.warn('[VideoRoom] Failed to update guest analytics:', e); }

    // 6. Notify widgets to refresh
    window.dispatchEvent(new CustomEvent('eventRegistrationChange'));

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
    // Mark global interaction so all future media elements start unmuted
    setUserHasInteracted();
    audioUnlockedRef.current = true;
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
          remoteScreenShareStream={remoteScreenShare?.stream || null}
          remoteScreenSharerName={remoteScreenShare?.displayName}
          remoteScreenSharerPeerId={remoteScreenShare?.peerId}
          isAudioUnlocked={audioUnlockedRef.current || !audioBlocked}
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
        backgroundImages={zoomBackgrounds}
        onBackgroundChange={handleBackgroundChange}
        customBackgroundImages={customBackgroundImages}
        maxCustomBackgrounds={maxCustomBackgrounds}
        isUploadingBackground={isUploadingBackground}
        onUploadBackground={user && !guestMode ? async (file) => {
          try {
            await uploadBackgroundImage(file);
            toast({ title: 'Tło przesłane' });
          } catch (err: any) {
            const msg = err.message?.includes('zalogowany')
              ? 'Musisz być zalogowany, aby dodać własne tło.'
              : err.message?.includes('za duży')
              ? 'Plik jest za duży (max 5MB).'
              : err.message || 'Nie udało się przesłać tła.';
            toast({ title: 'Błąd przesyłania', description: msg, variant: 'destructive' });
          }
        } : undefined}
        onRefreshBackgrounds={user && !guestMode ? refetchBackgrounds : undefined}
        onDeleteBackground={user && !guestMode ? async (url) => {
          try {
            if (bgSelectedImage === url) {
              await handleBackgroundChange('none');
            }
            await deleteBackgroundImage(url);
            toast({ title: 'Tło usunięte' });
          } catch (err: any) {
            toast({ title: 'Błąd', description: err.message, variant: 'destructive' });
          }
        } : undefined}
      />
    </div>
  );
};
