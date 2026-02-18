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

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [participants, setParticipants] = useState<RemoteParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(!initialAudio);
  const [isCameraOff, setIsCameraOff] = useState(!initialVideo);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // New states
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const isPiPSupported = typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && document.pictureInPictureEnabled;

  // Fetch TURN credentials
  const getTurnCredentials = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-turn-credentials');
      if (error) throw error;
      return data?.iceServers || [];
    } catch (err) {
      console.error('[VideoRoom] Failed to get TURN credentials:', err);
      return [{ urls: 'stun:stun.l.google.com:19302' }];
    }
  }, []);

  // Initialize peer and media
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

        stream.getAudioTracks().forEach(t => (t.enabled = initialAudio));
        stream.getVideoTracks().forEach(t => (t.enabled = initialVideo));
        localStreamRef.current = stream;
        setLocalStream(stream);

        const iceServers = await getTurnCredentials();
        const peer = new Peer({ config: { iceServers } });
        peerRef.current = peer;

        peer.on('open', async (peerId) => {
          console.log('[VideoRoom] Peer opened:', peerId);
          setIsConnected(true);

          await supabase.from('meeting_room_participants').insert({
            room_id: roomId, user_id: user.id, peer_id: peerId,
            display_name: displayName, is_active: true,
          });

          const channel = supabase.channel(`meeting:${roomId}`);
          channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await channel.send({ type: 'broadcast', event: 'peer-joined', payload: { peerId, displayName, userId: user.id } });
            }
          });

          channel.on('broadcast', { event: 'peer-joined' }, ({ payload }) => {
            if (payload.peerId !== peerId) callPeer(payload.peerId, payload.displayName, stream);
          });
          channel.on('broadcast', { event: 'peer-left' }, ({ payload }) => removePeer(payload.peerId));

          const { data: existing } = await supabase
            .from('meeting_room_participants')
            .select('peer_id, display_name')
            .eq('room_id', roomId).eq('is_active', true).neq('user_id', user.id);

          if (existing) {
            for (const p of existing) {
              if (p.peer_id) callPeer(p.peer_id, p.display_name || 'Uczestnik', stream);
            }
          }
        });

        peer.on('call', (call) => { call.answer(stream); handleCall(call, 'Uczestnik'); });
        peer.on('error', (err) => {
          console.error('[VideoRoom] Peer error:', err);
          toast({ title: 'Błąd połączenia', description: 'Wystąpił problem z połączeniem video.', variant: 'destructive' });
        });
      } catch (err) {
        console.error('[VideoRoom] Init error:', err);
        toast({ title: 'Brak dostępu do kamery/mikrofonu', description: 'Upewnij się, że przeglądarka ma uprawnienia.', variant: 'destructive' });
      }
    };

    init();
    return () => { cancelled = true; cleanup(); };
  }, [user, roomId]);

  const callPeer = (remotePeerId: string, name: string, stream: MediaStream) => {
    if (!peerRef.current || connectionsRef.current.has(remotePeerId)) return;
    const call = peerRef.current.call(remotePeerId, stream);
    if (call) handleCall(call, name);
  };

  const handleCall = (call: MediaConnection, name: string) => {
    connectionsRef.current.set(call.peer, call);
    call.on('stream', (remoteStream) => {
      setParticipants((prev) => {
        const exists = prev.find((p) => p.peerId === call.peer);
        if (exists) return prev.map((p) => p.peerId === call.peer ? { ...p, stream: remoteStream } : p);
        return [...prev, { peerId: call.peer, displayName: name, stream: remoteStream }];
      });
    });
    call.on('close', () => removePeer(call.peer));
  };

  const removePeer = (peerId: string) => {
    connectionsRef.current.delete(peerId);
    setParticipants((prev) => prev.filter((p) => p.peerId !== peerId));
  };

  const cleanup = async () => {
    const peerId = peerRef.current?.id;
    if (peerId) {
      const channel = supabase.channel(`meeting:${roomId}`);
      try { await channel.send({ type: 'broadcast', event: 'peer-left', payload: { peerId } }); } catch { }
      supabase.removeChannel(channel);
    }
    if (user) {
      await supabase.from('meeting_room_participants')
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq('room_id', roomId).eq('user_id', user.id);
    }
    connectionsRef.current.forEach((conn) => conn.close());
    connectionsRef.current.clear();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    peerRef.current?.destroy();
    peerRef.current = null;
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
      localStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = isCameraOff));
      setIsCameraOff(!isCameraOff);
    }
  };

  const handleToggleScreenShare = async () => {
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

  const handleLeave = async () => { await cleanup(); onLeave(); };

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
        {/* Video Grid */}
        <VideoGrid
          participants={participants}
          localStream={localStream}
          localDisplayName={displayName}
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          onActiveVideoRef={(el) => { activeVideoRef.current = el; }}
        />

        {/* Sidebar */}
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
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleChat={handleToggleChat}
        onToggleParticipants={handleToggleParticipants}
        onTogglePiP={handleTogglePiP}
        onLeave={handleLeave}
      />
    </div>
  );
};
