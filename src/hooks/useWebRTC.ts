'use client';

import { useEffect, useRef, useState } from 'react';
import SimplePeer from 'simple-peer';
import { Participant } from '@/types';

interface PeerConnection {
  peer: SimplePeer.Instance;
  stream?: MediaStream;
}

export const useWebRTC = (
  localStream: MediaStream | null,
  roomId: string | null,
  userId: string | null,
  socket: any,
) => {
  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  useEffect(() => {
    if (!socket || !localStream || !roomId || !userId) return;

    // Handle new user joining
    socket.on('user-joined', ({ userId: newUserId }: { userId: string }) => {
      if (newUserId === userId) return;

      // Create peer connection as initiator
      const peer = createPeer(newUserId, localStream, socket, roomId, userId);
      
      const newPeers = new Map(peersRef.current);
      newPeers.set(newUserId, { peer });
      peersRef.current = newPeers;
      setPeers(newPeers);
    });

    // Handle receiving signal from another peer
    socket.on('signal', ({ signal, userId: signalingUserId }: any) => {
      if (signalingUserId === userId) return;

      let peerConnection = peersRef.current.get(signalingUserId);

      if (!peerConnection) {
        // Create peer connection as receiver
        const peer = addPeer(signal, localStream, socket, roomId, userId, signalingUserId);
        
        const newPeers = new Map(peersRef.current);
        newPeers.set(signalingUserId, { peer });
        peersRef.current = newPeers;
        setPeers(newPeers);
      } else {
        // Signal existing peer
        try {
          peerConnection.peer.signal(signal);
        } catch (error) {
          console.error('Error signaling peer:', error);
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
      const newPeers = new Map(peersRef.current);
      const existingPeer = newPeers.get(targetUserId);
      if (existingPeer) {
        existingPeer.stream = remoteStream;
        peersRef.current = newPeers;
        setPeers(new Map(newPeers));
      }
    });

    peer.on('error', (error) => {
      console.error('Peer error:', error);
    });

    peer.on('close', () => {
      console.log('Peer connection closed:', targetUserId);
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
      const newPeers = new Map(peersRef.current);
      const existingPeer = newPeers.get(signalingUserId);
      if (existingPeer) {
        existingPeer.stream = remoteStream;
        peersRef.current = newPeers;
        setPeers(new Map(newPeers));
      }
    });

    peer.on('error', (error) => {
      console.error('Peer error:', error);
    });

    peer.on('close', () => {
      console.log('Peer connection closed:', signalingUserId);
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
