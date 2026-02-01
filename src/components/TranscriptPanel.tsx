'use client';

import { useEffect, useRef } from 'react';
import { TranslatedMessage, LANGUAGE_NAMES } from '@/types';
import { X } from 'lucide-react';

interface TranscriptPanelProps {
  messages: TranslatedMessage[];
  currentUserId: string | null;
  onClose: () => void;
}

export const TranscriptPanel = ({
  messages,
  currentUserId,
  onClose,
}: TranscriptPanelProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed top-4 right-4 w-96 h-[calc(100vh-8rem)] bg-zinc-900/95 backdrop-blur-sm border border-zinc-800 rounded-lg shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <h2 className="text-lg font-semibold text-white">Live Transcripts</h2>
        <button
          onClick={onClose}
          className="p-1 hover:bg-zinc-800 rounded transition-colors"
        >
          <X className="w-5 h-5 text-zinc-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 mt-8">
            <p>No transcripts yet.</p>
            <p className="text-sm mt-2">Start speaking to see translations appear here.</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const isCurrentUser = message.userId === currentUserId;
            return (
              <div
                key={index}
                className={`flex flex-col ${
                  isCurrentUser ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    isCurrentUser
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">
                      {isCurrentUser ? 'You' : message.userName}
                    </span>
                    <span className="text-xs opacity-60">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{message.translatedText}</p>
                  {message.sourceLang !== message.targetLang && (
                    <p className="text-xs opacity-60 mt-1 italic">
                      Original ({LANGUAGE_NAMES[message.sourceLang]}):{' '}
                      {message.originalText}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
