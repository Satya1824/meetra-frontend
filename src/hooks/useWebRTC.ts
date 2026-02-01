'use client';

import { useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';
import { Participant } from '@/types';

interface PeerConnection {
  peer: SimplePeer.Instance;
  stream?: MediaStream;
  isInitiator: boolean; // Track who initiated the connection
  reconnectAttempts: number; // Track reconnection attempts
  lastReconnectTime: number; // Track last reconnection time for backoff
}

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_BASE_DELAY = 1000; // 1 second base delay

export const useWebRTC = (
  localStream: MediaStream | null,
  roomId: string | null,
  userId: string | null,
  socket: any,
  existingParticipants: Participant[] = [],
) => {
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());
  const hasInitialized = useRef(false);

  // Create peer connections for existing participants when joining
  useEffect(() => {
    if (!socket || !localStream || !roomId || !userId || hasInitialized.current) return;
    if (existingParticipants.length === 0) return;

    console.log('📡 Connecting to', existingParticipants.length, 'participant(s)');
    
    existingParticipants.forEach((participant) => {
      if (participant.id !== userId) {
        // Create peer connection as initiator for existing users
        const peer = createPeer(participant.id, localStream, socket, roomId, userId);
        
        const newPeers = new Map(peersRef.current);
        newPeers.set(participant.id, { 
          peer, 
          isInitiator: true,
          reconnectAttempts: 0,
          lastReconnectTime: 0
        });
        peersRef.current = newPeers;
        setPeers(new Map(newPeers));
      }
    });

    hasInitialized.current = true;
  }, [existingParticipants, socket, localStream, roomId, userId]);

  useEffect(() => {
    if (!socket || !localStream || !roomId || !userId) return;

    // Handle new user joining
    socket.on('user-joined', ({ userId: newUserId }: { userId: string }) => {
      if (newUserId === userId) return;

      // Check if peer already exists
      const existingPeer = peersRef.current.get(newUserId);
      if (existingPeer && !existingPeer.peer.destroyed) {
        console.log('👤 Peer already exists for:', newUserId);
        return; // Don't create duplicate
      }

      console.log('👤 New user joined, creating peer connection:', newUserId);

      // Create peer connection as initiator
      const peer = createPeer(newUserId, localStream, socket, roomId, userId);
      
      const newPeers = new Map(peersRef.current);
      newPeers.set(newUserId, { 
        peer, 
        isInitiator: true,
        reconnectAttempts: 0,
        lastReconnectTime: 0
      });
      peersRef.current = newPeers;
      setPeers(new Map(newPeers));
    });

    // Handle receiving signal from another peer
    socket.on('signal', ({ signal, userId: signalingUserId }: any) => {
      if (signalingUserId === userId) return;

      let peerConnection = peersRef.current.get(signalingUserId);

      if (!peerConnection || peerConnection.peer.destroyed) {
        // Only create new peer as receiver if we don't already have one
        if (!peerConnection) {
          console.log('🆕 Creating new peer connection as receiver for:', signalingUserId);
          const peer = addPeer(signal, localStream, socket, roomId, userId, signalingUserId);
          
          const newPeers = new Map(peersRef.current);
          newPeers.set(signalingUserId, { 
            peer, 
            isInitiator: false,
            reconnectAttempts: 0,
            lastReconnectTime: 0
          });
          peersRef.current = newPeers;
          setPeers(new Map(newPeers));
        } else {
          // Peer was destroyed, check if we should attempt reconnection
          const { isInitiator, reconnectAttempts, lastReconnectTime } = peerConnection;
          
          // Check if max attempts exceeded
          if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('❌ Max reconnection attempts exceeded for:', signalingUserId);
            // Clean up the peer completely
            const newPeers = new Map(peersRef.current);
            newPeers.delete(signalingUserId);
            peersRef.current = newPeers;
            setPeers(new Map(newPeers));
            return;
          }
          
          // Calculate exponential backoff delay
          const now = Date.now();
          const backoffDelay = RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttempts);
          const timeSinceLastReconnect = now - lastReconnectTime;
          
          // If not enough time has passed, skip this reconnection attempt
          if (lastReconnectTime > 0 && timeSinceLastReconnect < backoffDelay) {
            console.log(`⏳ Waiting ${backoffDelay - timeSinceLastReconnect}ms before reconnection attempt ${reconnectAttempts + 1}`);
            return;
          }
          
          // Attempt reconnection
          console.log(`🔄 Reconnection attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS} for:`, signalingUserId);
          
          let peer;
          if (isInitiator) {
            peer = createPeer(signalingUserId, localStream, socket, roomId, userId);
          } else {
            peer = addPeer(signal, localStream, socket, roomId, userId, signalingUserId);
          }
          
          const newPeers = new Map(peersRef.current);
          newPeers.set(signalingUserId, { 
            peer, 
            isInitiator,
            reconnectAttempts: reconnectAttempts + 1,
            lastReconnectTime: now
          });
          peersRef.current = newPeers;
          setPeers(new Map(newPeers));
        }
      } else {
        // Signal existing peer if not destroyed
        try {
          peerConnection.peer.signal(signal);
        } catch (error: any) {
          // Ignore errors after peer is destroyed
          if (!error.message?.includes('peer is destroyed')) {
            console.error('Error signaling peer:', error);
          }
        }
      }
    });

    // Handle user disconnection
    socket.on('user-disconnected', ({ userId: disconnectedUserId }: { userId: string }) => {
      const peerConnection = peersRef.current.get(disconnectedUserId);
      if (peerConnection) {
        peerConnection.peer.destroy();
        const newPeers = new Map(peersRef.current);
        newPeers.delete(disconnectedUserId);
        peersRef.current = newPeers;
        setPeers(newPeers);
      }
    });

    return () => {
      socket.off('user-joined');
      socket.off('signal');
      socket.off('user-disconnected');

      // Cleanup all peer connections
      peersRef.current.forEach((peerConnection) => {
        peerConnection.peer.destroy();
      });
      peersRef.current.clear();
      setPeers(new Map());
    };
  }, [socket, localStream, roomId, userId]);

  // Create a peer connection as initiator
  const createPeer = (
    targetUserId: string,
    stream: MediaStream,
    socket: any,
    roomId: string,
    userId: string,
  ): SimplePeer.Instance => {
    const peer = new SimplePeer({
      initiator: true,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      socket.emit('signal', {
        signal,
        userId,
        roomId,
        targetUserId,
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log('📹 Received stream from:', targetUserId);
      const newPeers = new Map(peersRef.current);
      const existingPeer = newPeers.get(targetUserId);
      if (existingPeer) {
        existingPeer.stream = remoteStream;
        // Reset reconnection attempts on successful connection
        existingPeer.reconnectAttempts = 0;
        existingPeer.lastReconnectTime = 0;
        peersRef.current = newPeers;
        setPeers(new Map(newPeers));
      }
    });

    peer.on('error', (error: any) => {
      const peerConnection = peersRef.current.get(targetUserId);
      const attempts = peerConnection?.reconnectAttempts || 0;
      
      // Show error details for debugging
      const errorMsg = error.message || error.code || 'Unknown error';
      console.log(`⚠️ Peer error [attempt ${attempts}/${MAX_RECONNECT_ATTEMPTS}]: ${errorMsg} (${targetUserId})`);
      
      // Log full error for unexpected errors
      if (error.code !== 'ERR_CONNECTION_FAILURE' && 
          !error.message?.includes('setRemoteDescription') &&
          !error.message?.includes('connection failed')) {
        console.error('Unexpected peer error:', error);
      }
    });

    peer.on('close', () => {
      console.log('📴 Peer connection closed:', targetUserId);
      // Mark peer as destroyed but keep entry for potential recreation
      const peerConnection = peersRef.current.get(targetUserId);
      if (peerConnection) {
        // Keep the entry with destroyed peer to maintain role info
        console.log('⚠️ Keeping peer entry for potential reconnection');
      }
    });

    return peer;
  };

  // Add a peer connection as receiver
  const addPeer = (
    incomingSignal: any,
    stream: MediaStream,
    socket: any,
    roomId: string,
    userId: string,
    signalingUserId: string,
  ): SimplePeer.Instance => {
    const peer = new SimplePeer({
      initiator: false,
      trickle: true,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      },
    });

    peer.on('signal', (signal) => {
      socket.emit('signal', {
        signal,
        userId,
        roomId,
        targetUserId: signalingUserId,
      });
    });

    peer.on('stream', (remoteStream) => {
      console.log('📹 Received stream from:', signalingUserId);
      const newPeers = new Map(peersRef.current);
      const existingPeer = newPeers.get(signalingUserId);
      if (existingPeer) {
        existingPeer.stream = remoteStream;
        // Reset reconnection attempts on successful connection
        existingPeer.reconnectAttempts = 0;
        existingPeer.lastReconnectTime = 0;
        peersRef.current = newPeers;
        setPeers(new Map(newPeers));
      }
    });

    peer.on('error', (error: any) => {
      const peerConnection = peersRef.current.get(signalingUserId);
      const attempts = peerConnection?.reconnectAttempts || 0;
      
      // Show error details for debugging
      const errorMsg = error.message || error.code || 'Unknown error';
      console.log(`⚠️ Peer error [attempt ${attempts}/${MAX_RECONNECT_ATTEMPTS}]: ${errorMsg} (${signalingUserId})`);
      
      // Log full error for unexpected errors
      if (error.code !== 'ERR_CONNECTION_FAILURE' && 
          !error.message?.includes('setRemoteDescription') &&
          !error.message?.includes('connection failed')) {
        console.error('Unexpected peer error:', error);
      }
    });

    peer.on('close', () => {
      console.log('📴 Peer connection closed:', signalingUserId);
      // Mark peer as destroyed but keep entry for potential recreation
      const peerConnection = peersRef.current.get(signalingUserId);
      if (peerConnection) {
        // Keep the entry with destroyed peer to maintain role info
        console.log('⚠️ Keeping peer entry for potential reconnection');
      }
    });

    try {
      peer.signal(incomingSignal);
    } catch (error) {
      console.error('Error signaling peer:', error);
    }

    return peer;
  };

  return { peers };
};
