'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { Language, LANGUAGE_NAMES } from '@/types';
import { Video, Globe, Zap, Shield, Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const { socket, isConnected } = useSocket();
  const [isCreating, setIsCreating] = useState(false);
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  
  // Form state
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState<Language>(Language.ENGLISH);

  const handleCreateRoom = () => {
    if (!userName.trim()) return;

    // Generate a temporary room ID and navigate to room page
    // The room page will handle actual room creation
    const tempRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/room/${tempRoomId}?name=${encodeURIComponent(userName)}&lang=${preferredLanguage}&create=true`);
  };

  const handleJoinRoom = () => {
    if (!userName.trim() || !roomId.trim()) return;

    router.push(`/room/${roomId.trim().toUpperCase()}?name=${encodeURIComponent(userName)}&lang=${preferredLanguage}`);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-900 via-black to-zinc-900">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Video className="w-12 h-12 text-blue-500" />
            <h1 className="text-5xl font-bold text-white">Meetra</h1>
          </div>
          <p className="text-xl text-zinc-400 mb-2">
            Video Conferencing with Real-Time Translation
          </p>
          <p className="text-zinc-500">
            Break language barriers. Connect with anyone, anywhere.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl mx-auto">
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-6">
            <Globe className="w-10 h-10 text-blue-500 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">12+ Languages</h3>
            <p className="text-zinc-400 text-sm">
              Speak in your language, see translations in real-time
            </p>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-6">
            <Zap className="w-10 h-10 text-blue-500 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Instant Translation</h3>
            <p className="text-zinc-400 text-sm">
              AI-powered translations appear as you speak
            </p>
          </div>
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800 rounded-lg p-6">
            <Shield className="w-10 h-10 text-blue-500 mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">Secure & Free</h3>
            <p className="text-zinc-400 text-sm">
              P2P connections, camera optional, no data stored
            </p>
          </div>
        </div>

        {/* Main Card */}
        <div className="max-w-md mx-auto">
          <div className="bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-xl p-8 shadow-2xl">
            {!mode ? (
              // Mode Selection
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-white text-center mb-6">
                  Get Started
                </h2>
                <button
                  onClick={() => setMode('create')}
                  disabled={!isConnected}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  Create New Room
                </button>
                <button
                  onClick={() => setMode('join')}
                  disabled={!isConnected}
                  className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors"
                >
                  Join Existing Room
                </button>
                {!isConnected && (
                  <p className="text-center text-yellow-400 text-sm mt-4">
                    Connecting to server...
                  </p>
                )}
              </div>
            ) : (
              // Form
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    {mode === 'create' ? 'Create Room' : 'Join Room'}
                  </h2>
                  <button
                    onClick={() => setMode(null)}
                    className="text-zinc-400 hover:text-white transition-colors"
                  >
                    Back
                  </button>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    maxLength={50}
                  />
                </div>

                {/* Room ID Input (Join only) */}
                {mode === 'join' && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-2">
                      Room Code
                    </label>
                    <input
                      type="text"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                      placeholder="Enter 6-digit code"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                      maxLength={6}
                    />
                  </div>
                )}

                {/* Language Selector */}
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Preferred Language
                  </label>
                  <select
                    value={preferredLanguage}
                    onChange={(e) => setPreferredLanguage(e.target.value as Language)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-zinc-500 mt-2">
                    Others will see translations in their preferred language
                  </p>
                </div>

                {/* Submit Button */}
                <button
                  onClick={mode === 'create' ? handleCreateRoom : handleJoinRoom}
                  disabled={
                    !userName.trim() ||
                    (mode === 'join' && !roomId.trim()) ||
                    isCreating ||
                    !isConnected
                  }
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : mode === 'create' ? (
                    'Create Room'
                  ) : (
                    'Join Room'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Browser Support Notice */}
          <div className="mt-6 text-center space-y-2">
            <p className="text-zinc-500 text-sm">
              💡 Camera is optional - you can join with audio only
            </p>
            <p className="text-zinc-500 text-sm">
              Best experienced on Chrome or Edge for full speech recognition support
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-zinc-600 text-sm">
          <p>Built with Next.js, NestJS, WebRTC & Web Speech API</p>
          <p className="mt-2">Free, open-source, and privacy-focused</p>
        </div>
      </div>
    </div>
  );
}
