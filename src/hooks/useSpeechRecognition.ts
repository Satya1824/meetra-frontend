'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Language } from '@/types';

// Extend Window interface for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface UseSpeechRecognitionProps {
  language: Language;
  onTranscript: (text: string) => void;
  isEnabled: boolean;
}

const LANGUAGE_CODE_MAP: Record<Language, string> = {
  [Language.ENGLISH]: 'en-US',
  [Language.HINDI]: 'hi-IN',
  [Language.SPANISH]: 'es-ES',
  [Language.FRENCH]: 'fr-FR',
  [Language.GERMAN]: 'de-DE',
  [Language.CHINESE]: 'zh-CN',
  [Language.JAPANESE]: 'ja-JP',
  [Language.KOREAN]: 'ko-KR',
  [Language.ARABIC]: 'ar-SA',
  [Language.RUSSIAN]: 'ru-RU',
  [Language.PORTUGUESE]: 'pt-BR',
  [Language.ITALIAN]: 'it-IT',
};

export const useSpeechRecognition = ({
  language,
  onTranscript,
  isEnabled,
}: UseSpeechRecognitionProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const restartTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if browser supports Web Speech API
    const SpeechRecognition =
      typeof window !== 'undefined' &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    setIsSupported(true);

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANGUAGE_CODE_MAP[language] || 'en-US';
    recognition.maxAlternatives = 1;

    let finalTranscript = '';
    let lastTranscriptTime = Date.now();

    recognition.onstart = () => {
      console.log('🎤 Speech recognition started');
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
          lastTranscriptTime = Date.now();

          // Send final transcript
          if (transcript.trim()) {
            onTranscript(transcript.trim());
          }
        } else {
          interimTranscript += transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      // Handle different error types
      if (event.error === 'no-speech') {
        // Normal - no speech detected, will auto-restart
        console.log('👂 No speech detected, continuing to listen...');
        return; // Don't show error, just continue
      } else if (event.error === 'audio-capture') {
        console.error('Speech recognition error:', event.error);
        setError('Microphone access denied or unavailable');
        setIsListening(false);
      } else if (event.error === 'not-allowed') {
        console.error('Speech recognition error:', event.error);
        setError('Microphone permission denied');
        setIsListening(false);
      } else if (event.error === 'aborted') {
        // Normal when manually stopped
        console.log('Speech recognition stopped');
      } else {
        console.error('Speech recognition error:', event.error);
        setError(`Recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      console.log('🎤 Speech recognition ended');
      setIsListening(false);

      // Auto-restart if still enabled and not manually stopped
      if (isEnabled && recognitionRef.current && !restartTimeoutRef.current) {
        restartTimeoutRef.current = setTimeout(() => {
          try {
            // Double check it's still enabled
            if (isEnabled) {
              recognitionRef.current?.start();
            }
          } catch (error: any) {
            // Ignore InvalidStateError (already running)
            if (error.name !== 'InvalidStateError') {
              console.error('Error restarting recognition:', error);
            }
          }
          restartTimeoutRef.current = null;
        }, 300);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    };
  }, [language, onTranscript, isEnabled]);

  // Start/stop recognition based on isEnabled
  useEffect(() => {
    if (!isSupported || !recognitionRef.current) return;

    if (isEnabled && !isListening) {
      // Clear any pending restart timeouts
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      try {
        recognitionRef.current.start();
      } catch (error: any) {
        if (error.name !== 'InvalidStateError') {
          console.error('Error starting recognition:', error);
          setError('Failed to start speech recognition');
        }
      }
    } else if (!isEnabled && isListening) {
      // Clear any pending restart timeouts
      if (restartTimeoutRef.current) {
        clearTimeout(restartTimeoutRef.current);
        restartTimeoutRef.current = null;
      }
      
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error('Error stopping recognition:', error);
      }
    }
  }, [isEnabled, isListening, isSupported]);

  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;

    try {
      recognitionRef.current.start();
    } catch (error: any) {
      if (error.name !== 'InvalidStateError') {
        console.error('Error starting recognition:', error);
      }
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;

    try {
      recognitionRef.current.stop();
    } catch (error) {
      console.error('Error stopping recognition:', error);
    }
  }, []);

  return {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
  };
};
