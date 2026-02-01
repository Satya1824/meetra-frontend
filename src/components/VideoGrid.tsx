'use client';

import { VideoTile } from './VideoTile';
import { Participant } from '@/types';

interface VideoGridProps {
  localStream: MediaStream | null;
  localUserName: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  participants: Participant[];
  peers: Map<string, any>;
}

export const VideoGrid = ({
  localStream,
  localUserName,
  isAudioEnabled,
  isVideoEnabled,
  participants,
  peers,
}: VideoGridProps) => {
  const totalParticipants = participants.length + 1; // +1 for local user

  // Determine grid layout based on number of participants
  const getGridClass = () => {
    if (totalParticipants === 1) return 'grid-cols-1';
    if (totalParticipants === 2) return 'grid-cols-2';
    if (totalParticipants <= 4) return 'grid-cols-2';
    if (totalParticipants <= 6) return 'grid-cols-3';
    return 'grid-cols-4';
  };

  return (
    <div className={`grid ${getGridClass()} gap-4 w-full h-full p-4`}>
      {/* Local video */}
      <VideoTile
        stream={localStream || undefined}
        userName={localUserName}
        isAudioEnabled={isAudioEnabled}
        isVideoEnabled={isVideoEnabled}
        isLocal
      />

      {/* Remote videos */}
      {participants.map((participant) => {
        const peerConnection = peers.get(participant.id);
        return (
          <VideoTile
            key={participant.id}
            stream={peerConnection?.stream}
            userName={participant.userName}
            isAudioEnabled={participant.isAudioEnabled}
            isVideoEnabled={participant.isVideoEnabled}
          />
        );
      })}
    </div>
  );
};
