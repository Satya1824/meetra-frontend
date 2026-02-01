'use client';

import { create } from 'zustand';
import { Language, Participant, TranslatedMessage } from '@/types';

interface RoomStore {
  roomId: string | null;
  userId: string | null;
  userName: string | null;
  preferredLanguage: Language;
  participants: Map<string, Participant>;
  messages: TranslatedMessage[];
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  localStream: MediaStream | null;

  // Actions
  setRoomId: (roomId: string) => void;
  setUserId: (userId: string) => void;
  setUserName: (userName: string) => void;
  setPreferredLanguage: (language: Language) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipantStream: (userId: string, stream: MediaStream) => void;
  updateParticipantMedia: (userId: string, isAudioEnabled?: boolean, isVideoEnabled?: boolean) => void;
  addMessage: (message: TranslatedMessage) => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
  setLocalStream: (stream: MediaStream | null) => void;
  clearRoom: () => void;
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  roomId: null,
  userId: null,
  userName: null,
  preferredLanguage: Language.ENGLISH,
  participants: new Map(),
  messages: [],
  isAudioEnabled: true,
  isVideoEnabled: true,
  localStream: null,

  setRoomId: (roomId) => set({ roomId }),
  setUserId: (userId) => set({ userId }),
  setUserName: (userName) => set({ userName }),
  setPreferredLanguage: (language) => set({ preferredLanguage: language }),

  addParticipant: (participant) =>
    set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.set(participant.id, participant);
      return { participants: newParticipants };
    }),

  removeParticipant: (userId) =>
    set((state) => {
      const newParticipants = new Map(state.participants);
      newParticipants.delete(userId);
      return { participants: newParticipants };
    }),

  updateParticipantStream: (userId, stream) =>
    set((state) => {
      const newParticipants = new Map(state.participants);
      const participant = newParticipants.get(userId);
      if (participant) {
        participant.stream = stream;
        newParticipants.set(userId, participant);
      }
      return { participants: newParticipants };
    }),

  updateParticipantMedia: (userId, isAudioEnabled, isVideoEnabled) =>
    set((state) => {
      const newParticipants = new Map(state.participants);
      const participant = newParticipants.get(userId);
      if (participant) {
        if (isAudioEnabled !== undefined) {
          participant.isAudioEnabled = isAudioEnabled;
        }
        if (isVideoEnabled !== undefined) {
          participant.isVideoEnabled = isVideoEnabled;
        }
        newParticipants.set(userId, participant);
      }
      return { participants: newParticipants };
    }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  toggleAudio: () =>
    set((state) => {
      const newState = !state.isAudioEnabled;
      if (state.localStream) {
        state.localStream.getAudioTracks().forEach((track) => {
          track.enabled = newState;
        });
      }
      return { isAudioEnabled: newState };
    }),

  toggleVideo: () =>
    set((state) => {
      const newState = !state.isVideoEnabled;
      if (state.localStream) {
        state.localStream.getVideoTracks().forEach((track) => {
          track.enabled = newState;
        });
      }
      return { isVideoEnabled: newState };
    }),

  setLocalStream: (stream) => set({ localStream: stream }),

  clearRoom: () =>
    set({
      roomId: null,
      userId: null,
      participants: new Map(),
      messages: [],
      localStream: null,
    }),
}));
