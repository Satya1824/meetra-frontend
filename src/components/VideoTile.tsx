'use client';

import { useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface VideoTileProps {
  stream?: MediaStream;
  userName: string;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  isLocal?: boolean;
}

export const VideoTile = ({
  stream,
  userName,
  isAudioEnabled,
  isVideoEnabled,
  isLocal = false,
}: VideoTileProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative aspect-video bg-zinc-900 rounded-lg overflow-hidden">
      {isVideoEnabled && stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
          <div className="w-20 h-20 rounded-full bg-zinc-700 flex items-center justify-center text-2xl font-bold text-white">
            {userName.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* User name badge */}
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full flex items-center gap-2">
        <span className="text-sm font-medium text-white">
          {isLocal ? 'You' : userName}
        </span>
        {!isAudioEnabled && (
          <MicOff className="w-4 h-4 text-red-400" />
        )}
      </div>

      {/* Video status */}
      {!isVideoEnabled && (
        <div className="absolute top-3 right-3 bg-red-500/90 backdrop-blur-sm px-2 py-1 rounded-full">
          <VideoOff className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};
