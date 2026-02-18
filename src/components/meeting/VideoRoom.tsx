import React, { useEffect, useRef, useState, useCallback } from 'react';
import Peer, { MediaConnection } from 'peerjs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { VideoGrid } from './VideoGrid';
import { MeetingControls } from './MeetingControls';
import { MeetingChat } from './MeetingChat';
import { ParticipantsPanel } from './ParticipantsPanel';
import { useToast } from '@/hooks/use-toast';

interface RemoteParticipant {
  peerId: string;
  displayName: string;
  stream: MediaStream | null;
  isMuted?: boolean;
  avatarUrl?: string;
}

interface VideoRoomProps {
  roomId: string;
  displayName: string;
  meetingTitle?: string;
  audioEnabled: boolean;
  videoEnabled: boolean;
  onLeave: () => void;
}

export const VideoRoom: React.FC<VideoRoomProps> = ({
  roomId,
  displayName,
  meetingTitle,
  audioEnabled: initialAudio,
  videoEnabled: initialVideo,
  onLeave,
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

  // Fetch local user's avatar
  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('avatar_url').eq('user_id', user.id).single()
      .then(({ data }) => { if (data?.avatar_url) setLocalAvatarUrl(data.avatar_url); });
  }, [user]);

  const isPiPSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;

  // Fetch TURN credentials
  const getTurnCredentials = useCallback(async () => {
    try {
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
  }, []);

  // Cleanup function with guard
  const cleanup = useCallback(async () => {
    if (cleanupDoneRef.current) return;
    cleanupDoneRef.current = true;

    console.log('[VideoRoom] Cleanup starting...');

    const peerId = peerRef.current?.id;
    
    // Broadcast peer-left
    if (peerId && channelRef.current) {
      try {
        await channelRef.current.send({ type: 'broadcast', event: 'peer-left', payload: { peerId } });
      } catch (e) {
        console.warn('[VideoRoom] Failed to broadcast peer-left:', e);
      }
    }

    // Remove channel
    if (channelRef.current) {
      try { supabase.removeChannel(channelRef.current); } catch {}
      channelRef.current = null;
    }

    // Update DB
    if (user) {
      try {
        await supabase.from('meeting_room_participants')
          .update({ is_active: false, left_at: new Date().toISOString() })
          .eq('room_id', roomId).eq('user_id', user.id);
      } catch (e) {
        console.warn('[VideoRoom] Failed to update participant status:', e);
      }
    }

    // Close all connections
    connectionsRef.current.forEach((conn) => {
      try { conn.close(); } catch {}
    });
    connectionsRef.current.clear();

    // Stop local tracks
    localStreamRef.current?.getTracks().forEach((t) => {
      try { t.stop(); } catch {}
    });
    localStreamRef.current = null;

    // Destroy peer
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch {}
      peerRef.current = null;
    }

    console.log('[VideoRoom] Cleanup complete');
  }, [roomId, user]);

  // beforeunload handler
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Synchronous cleanup for page unload
      if (cleanupDoneRef.current) return;
      cleanupDoneRef.current = true;

      localStreamRef.current?.getTracks().forEach(t => { try { t.stop(); } catch {} });
      connectionsRef.current.forEach(conn => { try { conn.close(); } catch {} });
      if (peerRef.current) { try { peerRef.current.destroy(); } catch {} }

      // Use sendBeacon for DB update
      if (user) {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/meeting_room_participants?room_id=eq.${roomId}&user_id=eq.${user.id}`;
        const body = JSON.stringify({ is_active: false, left_at: new Date().toISOString() });
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [roomId, user]);

  // Initialize peer and media
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    cleanupDoneRef.current = false;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        stream.getAudioTracks().forEach(t => (t.enabled = initialAudio));
        stream.getVideoTracks().forEach(t => (t.enabled = initialVideo));
        localStreamRef.current = stream;
        setLocalStream(stream);

        const iceServers = await getTurnCredentials();
        const peer = new Peer({
          config: { iceServers },
          debug: 0,
        });
        peerRef.current = peer;

        peer.on('open', async (peerId) => {
          if (cancelled) return;
          console.log('[VideoRoom] Peer opened:', peerId);
          setIsConnected(true);

          // Register as participant (upsert to handle rejoin)
          const { error: participantError } = await supabase
            .from('meeting_room_participants')
            .upsert(
              {
                room_id: roomId,
                user_id: user.id,
                peer_id: peerId,
                display_name: displayName,
                is_active: true,
                left_at: null,
                joined_at: new Date().toISOString(),
              },
              { onConflict: 'room_id,user_id' }
            );
          if (participantError) {
            console.error('[VideoRoom] Failed to register participant:', participantError);
            // Retry once
            await supabase.from('meeting_room_participants').upsert(
              { room_id: roomId, user_id: user.id, peer_id: peerId, display_name: displayName, is_active: true, left_at: null, joined_at: new Date().toISOString() },
              { onConflict: 'room_id,user_id' }
            );
          }

          // Set up realtime channel
          const channel = supabase.channel(`meeting:${roomId}`);
          channelRef.current = channel;

          channel.on('broadcast', { event: 'peer-joined' }, ({ payload }) => {
            if (payload.peerId !== peerId && !cancelled) {
              callPeer(payload.peerId, payload.displayName, stream);
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

          channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED' && !cancelled) {
              await channel.send({ type: 'broadcast', event: 'peer-joined', payload: { peerId, displayName, userId: user.id } });
            }
          });

          // Connect to existing participants
          const { data: existing } = await supabase
            .from('meeting_room_participants')
            .select('peer_id, display_name, user_id')
            .eq('room_id', roomId).eq('is_active', true).neq('user_id', user.id);

          if (existing && !cancelled) {
            for (const p of existing) {
              if (p.peer_id) {
                // Fetch avatar for this participant
                let avatarUrl: string | undefined;
                if (p.user_id) {
                  const { data: profile } = await supabase.from('profiles').select('avatar_url').eq('user_id', p.user_id).single();
                  avatarUrl = profile?.avatar_url || undefined;
                }
                callPeer(p.peer_id, p.display_name || 'Uczestnik', stream, avatarUrl);
              }
            }
          }
        });

        peer.on('call', (call) => {
          if (!cancelled) { call.answer(stream); handleCall(call, 'Uczestnik'); }
        });

        peer.on('error', (err) => {
          console.error('[VideoRoom] Peer error:', err);
          if (err.type === 'peer-unavailable') {
            // Peer we tried to call doesn't exist anymore - remove them
            const failedPeerId = (err as any).message?.match(/peer\s+(\S+)/)?.[1];
            if (failedPeerId) removePeer(failedPeerId);
          } else if (err.type === 'disconnected') {
            // Try to reconnect
            console.log('[VideoRoom] Peer disconnected, attempting reconnect...');
            try { peer.reconnect(); } catch {}
          } else {
            toast({ title: 'Błąd połączenia', description: 'Wystąpił problem z połączeniem video.', variant: 'destructive' });
          }
        });

        peer.on('disconnected', () => {
          if (!cancelled && !cleanupDoneRef.current) {
            console.log('[VideoRoom] Peer disconnected, reconnecting...');
            setTimeout(() => {
              if (!cancelled && !cleanupDoneRef.current) {
                try { peer.reconnect(); } catch {}
              }
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
  }, [user, roomId]);

  const callPeer = (remotePeerId: string, name: string, stream: MediaStream, avatarUrl?: string) => {
    if (!peerRef.current || connectionsRef.current.has(remotePeerId)) return;
    console.log('[VideoRoom] Calling peer:', remotePeerId);
    const call = peerRef.current.call(remotePeerId, stream);
    if (call) handleCall(call, name, avatarUrl);
  };

  const handleCall = (call: MediaConnection, name: string, avatarUrl?: string) => {
    connectionsRef.current.set(call.peer, call);

    // Timeout: if no stream within 15s, remove connection
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
        return [...prev, { peerId: call.peer, displayName: name, stream: remoteStream, avatarUrl }];
      });
    });

    call.on('close', () => {
      clearTimeout(timeout);
      removePeer(call.peer);
    });

    call.on('error', (err) => {
      clearTimeout(timeout);
      console.error('[VideoRoom] Call error with peer:', call.peer, err);
      removePeer(call.peer);
    });
  };

  const removePeer = (peerId: string) => {
    connectionsRef.current.delete(peerId);
    setParticipants((prev) => prev.filter((p) => p.peerId !== peerId));
  };

  // Controls
  const handleToggleMute = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = isMuted));
      setIsMuted(!isMuted);
    }
  };

  const handleToggleCamera = () => {
    if (localStreamRef.current) {
      const newEnabled = isCameraOff; // currently off, so we enable
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = newEnabled));
      setIsCameraOff(!isCameraOff);
      // Force new stream reference to trigger React re-render in VideoGrid
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      try {
        screenSharePendingRef.current = true;
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
        screenSharePendingRef.current = true;
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
    } catch (err) {
      console.error('[VideoRoom] PiP error:', err);
    }
  };

  // Auto PiP on tab switch
  useEffect(() => {
    if (!isPiPSupported) return;
    const autoPiPRef = { current: false };

    const handleVisibility = async () => {
      if (screenSharePendingRef.current) return; // Don't trigger PiP during screen share picker
      try {
        if (document.hidden) {
          if (!document.pictureInPictureElement && activeVideoRef.current && activeVideoRef.current.srcObject) {
            await activeVideoRef.current.requestPictureInPicture();
            autoPiPRef.current = true;
            setIsPiPActive(true);
          }
        } else {
          if (document.pictureInPictureElement && autoPiPRef.current) {
            await document.exitPictureInPicture();
            autoPiPRef.current = false;
            setIsPiPActive(false);
          }
        }
      } catch (err) {
        console.warn('[VideoRoom] Auto PiP error:', err);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isPiPSupported]);

  // Chat / Participants toggles
  const handleToggleChat = () => {
    setIsChatOpen(prev => !prev);
    if (!isChatOpen) {
      setIsParticipantsOpen(false);
      setUnreadChatCount(0);
    }
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
      await Promise.race([
        cleanup(),
        new Promise((resolve) => setTimeout(resolve, 3000)),
      ]);
    } catch (e) {
      console.warn('[VideoRoom] Cleanup error on leave:', e);
    } finally {
      onLeave();
    }
  };

  const handleEndMeeting = async () => {
    // Broadcast meeting-ended to all participants
    if (channelRef.current) {
      try {
        await channelRef.current.send({ type: 'broadcast', event: 'meeting-ended', payload: {} });
      } catch (e) {
        console.warn('[VideoRoom] Failed to broadcast meeting-ended:', e);
      }
    }
    // Then leave
    await handleLeave();
  };

  const sidebarOpen = isChatOpen || isParticipantsOpen;

  return (
    <div className="flex flex-col h-screen bg-black">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/90 backdrop-blur-sm">
        <h2 className="text-sm font-medium text-white truncate">{meetingTitle || 'Spotkanie'}</h2>
        <div className="flex items-center gap-2">
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
          onActiveVideoRef={(el) => { activeVideoRef.current = el; }}
        />

        {sidebarOpen && (
          <div className="w-80 max-md:absolute max-md:inset-0 max-md:w-full max-md:z-50">
            {isChatOpen && user && (
              <MeetingChat
                roomId={roomId}
                userId={user.id}
                displayName={displayName}
                onClose={() => setIsChatOpen(false)}
                onNewMessage={handleNewChatMessage}
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
        onEndMeeting={handleEndMeeting}
        onViewModeChange={setViewMode}
      />
    </div>
  );
};
