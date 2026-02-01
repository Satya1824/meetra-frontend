'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useRoomStore } from '@/store/roomStore';
import { VideoGrid } from '@/components/VideoGrid';
import { Controls } from '@/components/Controls';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { Language, Participant } from '@/types';
import { Loader2 } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const userName = searchParams.get('name') || 'Anonymous';
  const language = (searchParams.get('lang') as Language) || Language.ENGLISH;
  const shouldCreate = searchParams.get('create') === 'true';

  const { socket, isConnected } = useSocket();
  const [showTranscripts, setShowTranscripts] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actualRoomId, setActualRoomId] = useState<string | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const {
    userId,
    localStream,
    isAudioEnabled,
    isVideoEnabled,
    participants,
    messages,
    setRoomId,
    setUserId,
    setUserName,
    setPreferredLanguage,
    setLocalStream,
    addParticipant,
    removeParticipant,
    updateParticipantStream,
    updateParticipantMedia,
    addMessage,
    toggleAudio,
    toggleVideo,
    clearRoom,
  } = useRoomStore();

  const { peers } = useWebRTC(localStream, actualRoomId || roomId, userId, socket);

  // Handle transcript from speech recognition
  const handleTranscript = useCallback(
    (text: string) => {
      const currentRoomId = actualRoomId || roomId;
      if (socket && currentRoomId && userId) {
        socket.emit('transcript', {
          text,
          sourceLang: language,
          userId,
          roomId: currentRoomId,
        });
      }
    },
    [socket, roomId, actualRoomId, userId, language],
  );

  const { isListening, isSupported, error: speechError } = useSpeechRecognition({
    language,
    onTranscript: handleTranscript,
    isEnabled: isAudioEnabled && isInitialized,
  });

  // Initialize media stream
  useEffect(() => {
    const initializeMedia = async () => {
      let stream: MediaStream | null = null;
      
      try {
        // Try to get both video and audio
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        
        console.log('✅ Got video and audio');
      } catch (error) {
        console.warn('Failed to get video, trying audio-only:', error);
        
        try {
          // Fall back to audio-only
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
          
          // Update video state to off since we don't have camera
          toggleVideo();
          console.log('✅ Got audio-only (no camera available)');
        } catch (audioError) {
          console.error('Failed to get audio:', audioError);
          setError('Failed to access microphone. Please grant microphone permission to join the call.');
          return;
        }
      }

      if (stream) {
        setLocalStream(stream);
        setUserName(userName);
        setPreferredLanguage(language);
        setRoomId(roomId);
        
        // Check if we actually got video
        const hasVideo = stream.getVideoTracks().length > 0;
        if (!hasVideo && isVideoEnabled) {
          // Disable video in state if we didn't get it
          toggleVideo();
        }
      }
    };

    initializeMedia();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Create or join room when socket connects and media is ready
  useEffect(() => {
    if (!socket || !isConnected || !localStream || isInitialized) return;

    if (shouldCreate) {
      // Create new room
      socket.emit('create-room', {
        userName,
        preferredLanguage: language,
      });
    } else {
      // Join existing room
      socket.emit('join-room', {
        roomId,
        userName,
        preferredLanguage: language,
      });
    }

    setIsInitialized(true);
  }, [socket, isConnected, localStream, roomId, userName, language, isInitialized, shouldCreate]);

  // Loading timeout - if stuck for more than 15 seconds, show error
  useEffect(() => {
    if (!isInitialized || userId) return;

    const timeout = setTimeout(() => {
      if (!userId) {
        setLoadingTimeout(true);
        setError('Connection timeout. The room may not exist or the server is not responding.');
      }
    }, 15000);

    return () => clearTimeout(timeout);
  }, [isInitialized, userId]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    // Room joined successfully
    socket.on('room-joined', ({ userId: newUserId, participants: existingParticipants }: any) => {
      console.log('✅ Joined room:', roomId, 'User ID:', newUserId);
      setUserId(newUserId);

      // Add existing participants
      existingParticipants.forEach((p: Participant) => {
        addParticipant(p);
      });
    });

    // Room created (if creator)
    socket.on('room-created', ({ roomId: createdRoomId, userId: newUserId }: any) => {
      console.log('✅ Room created:', createdRoomId, 'User ID:', newUserId);
      setActualRoomId(createdRoomId);
      setRoomId(createdRoomId);
      setUserId(newUserId);
      
      // Update URL to show actual room ID
      if (shouldCreate) {
        window.history.replaceState({}, '', `/room/${createdRoomId}?name=${encodeURIComponent(userName)}&lang=${language}`);
      }
    });

    // New user joined
    socket.on('user-joined', ({ userId: newUserId, userName: newUserName, preferredLanguage }: any) => {
      console.log('👤 User joined:', newUserName);
      addParticipant({
        id: newUserId,
        userName: newUserName,
        preferredLanguage,
        isAudioEnabled: true,
        isVideoEnabled: true,
      });
    });

    // User disconnected
    socket.on('user-disconnected', ({ userId: disconnectedUserId }: any) => {
      console.log('👋 User left:', disconnectedUserId);
      removeParticipant(disconnectedUserId);
    });

    // Media status changed
    socket.on('user-media-changed', ({ userId: changedUserId, isAudioEnabled, isVideoEnabled }: any) => {
      updateParticipantMedia(changedUserId, isAudioEnabled, isVideoEnabled);
    });

    // Translated message received
    socket.on('translated-message', (message: any) => {
      addMessage(message);
    });

    // Error handling
    socket.on('error', ({ message }: any) => {
      console.error('Socket error:', message);
      
      // If room not found and we're trying to join, offer to create instead
      if (message === 'Room not found' && !shouldCreate) {
        const shouldRecreate = confirm(
          `Room "${roomId}" not found. It may have expired or been deleted.\n\n` +
          'Would you like to create a new room instead?'
        );
        
        if (shouldRecreate) {
          // Redirect to create a new room
          router.push(`/?name=${encodeURIComponent(userName)}&lang=${language}`);
        } else {
          // Go back to home
          router.push('/');
        }
      } else {
        setError(message);
      }
    });

    return () => {
      socket.off('room-joined');
      socket.off('room-created');
      socket.off('user-joined');
      socket.off('user-disconnected');
      socket.off('user-media-changed');
      socket.off('translated-message');
      socket.off('error');
    };
  }, [socket]);

  // Sync peer streams with participants
  useEffect(() => {
    peers.forEach((peerConnection, peerId) => {
      if (peerConnection.stream) {
        updateParticipantStream(peerId, peerConnection.stream);
      }
    });
  }, [peers]);

  // Handle audio toggle
  const handleToggleAudio = () => {
    toggleAudio();
    const currentRoomId = actualRoomId || roomId;
    if (socket && currentRoomId && userId) {
      socket.emit('toggle-audio', {
        roomId: currentRoomId,
        userId,
        enabled: !isAudioEnabled,
      });
    }
  };

  // Handle video toggle
  const handleToggleVideo = async () => {
    // Check if we have video tracks
    const hasVideoTrack = localStream?.getVideoTracks().length ?? 0 > 0;
    
    if (!hasVideoTrack && !isVideoEnabled) {
      // Trying to enable video but no camera available - try to request it
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        
        // Add video tracks to existing stream
        const videoTrack = newStream.getVideoTracks()[0];
        if (videoTrack && localStream) {
          localStream.addTrack(videoTrack);
          setLocalStream(new MediaStream([...localStream.getTracks()]));
        }
        
        console.log('✅ Camera enabled');
      } catch (error) {
        console.error('Cannot enable video:', error);
        alert('Camera not available or permission denied');
        return;
      }
    }
    
    toggleVideo();
    const currentRoomId = actualRoomId || roomId;
    if (socket && currentRoomId && userId) {
      socket.emit('toggle-video', {
        roomId: currentRoomId,
        userId,
        enabled: !isVideoEnabled,
      });
    }
  };

  // Handle leave call
  const handleLeaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    if (socket) {
      socket.disconnect();
    }
    clearRoom();
    router.push('/');
  };

  // Loading state
  if ((!isInitialized || !userId) && !error && !loadingTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-white text-lg">Joining room...</p>
          <p className="text-zinc-400 text-sm mt-2">
            Please grant microphone permission (camera is optional)
          </p>
          {!isSupported && (
            <p className="text-yellow-400 text-sm mt-2">
              ⚠️ Speech recognition not supported in this browser
            </p>
          )}
        </div>
      </div>
    );
  }

  // Error state
  if (error || loadingTimeout) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h1 className="text-white text-2xl font-bold mb-2">
            {loadingTimeout ? 'Connection Timeout' : 'Error'}
          </h1>
          <p className="text-zinc-400 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Return to Home
            </button>
            {loadingTimeout && (
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const participantsList = Array.from(participants.values());

  return (
    <div className="relative min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-10 bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-semibold text-lg">Room: {actualRoomId || roomId}</h1>
            <p className="text-zinc-400 text-sm">
              {participantsList.length + 1} participant{participantsList.length !== 0 ? 's' : ''}
              {isListening && (
                <span className="ml-2 text-green-400">🎤 Listening...</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`} />
              <span className="text-sm font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Video Grid */}
      <div className="pt-20 pb-32 h-screen">
        <VideoGrid
          localStream={localStream}
          localUserName={userName}
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
          participants={participantsList}
          peers={peers}
        />
      </div>

      {/* Controls */}
      <Controls
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        onToggleAudio={handleToggleAudio}
        onToggleVideo={handleToggleVideo}
        onLeaveCall={handleLeaveCall}
        onToggleTranscripts={() => setShowTranscripts(!showTranscripts)}
        showTranscripts={showTranscripts}
      />

      {/* Transcript Panel */}
      {showTranscripts && (
        <TranscriptPanel
          messages={messages}
          currentUserId={userId}
          onClose={() => setShowTranscripts(false)}
        />
      )}

      {/* Speech recognition error */}
      {speechError && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black px-4 py-2 rounded-lg text-sm">
          {speechError}
        </div>
      )}
    </div>
  );
}
