'use client';

import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageSquare } from 'lucide-react';

interface ControlsProps {
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onLeaveCall: () => void;
  onToggleTranscripts: () => void;
  showTranscripts: boolean;
}

export const Controls = ({
  isAudioEnabled,
  isVideoEnabled,
  onToggleAudio,
  onToggleVideo,
  onLeaveCall,
  onToggleTranscripts,
  showTranscripts,
}: ControlsProps) => {
  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/95 backdrop-blur-sm px-6 py-4 rounded-full border border-zinc-800 shadow-2xl">
      <div className="flex items-center gap-4">
        {/* Microphone toggle */}
        <button
          onClick={onToggleAudio}
          className={`p-4 rounded-full transition-all ${
            isAudioEnabled
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={isAudioEnabled ? 'Mute' : 'Unmute'}
        >
          {isAudioEnabled ? (
            <Mic className="w-6 h-6" />
          ) : (
            <MicOff className="w-6 h-6" />
          )}
        </button>

        {/* Video toggle */}
        <button
          onClick={onToggleVideo}
          className={`p-4 rounded-full transition-all ${
            isVideoEnabled
              ? 'bg-zinc-800 hover:bg-zinc-700 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
          title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {isVideoEnabled ? (
            <Video className="w-6 h-6" />
          ) : (
            <VideoOff className="w-6 h-6" />
          )}
        </button>

        {/* Transcripts toggle */}
        <button
          onClick={onToggleTranscripts}
          className={`p-4 rounded-full transition-all ${
            showTranscripts
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
              : 'bg-zinc-800 hover:bg-zinc-700 text-white'
          }`}
          title="Toggle transcripts"
        >
          <MessageSquare className="w-6 h-6" />
        </button>

        {/* Leave call */}
        <button
          onClick={onLeaveCall}
          className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white transition-all ml-2"
          title="Leave call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
