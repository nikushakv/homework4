
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import GameCanvas from '../components/GameCanvas';
import GameUI from '../components/GameUI';
import ConnectionStatus from '../components/ConnectionStatus';

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: { player1: number; player2: number };
  scores: { player1: number; player2: number };
  gameActive: boolean;
  winner?: string;
}

interface Player {
  id: string;
  isPlayer1: boolean;
  roomId: string;
}

const Index = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'waiting' | 'playing' | 'disconnected'>('connecting');
  const [error, setError] = useState<string>('');
  
  const keysRef = useRef<{ [key: string]: boolean }>({});

  useEffect(() => {
    console.log('Initializing socket connection...');
    // In a real deployment, this would be your server URL
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket'],
      timeout: 5000,
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnectionStatus('waiting');
      setError('');
    });

    newSocket.on('connect_error', (err) => {
      console.error('Connection error:', err);
      setError('Failed to connect to game server. Please try again.');
      setConnectionStatus('disconnected');
    });

    newSocket.on('playerAssigned', (playerData: Player) => {
      console.log('Player assigned:', playerData);
      setPlayer(playerData);
    });

    newSocket.on('gameStart', () => {
      console.log('Game started');
      setConnectionStatus('playing');
    });

    newSocket.on('gameState', (state: GameState) => {
      setGameState(state);
    });

    newSocket.on('playerDisconnected', () => {
      setConnectionStatus('waiting');
      setGameState(null);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnectionStatus('disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!socket || !player || connectionStatus !== 'playing') return;

    const gameLoop = setInterval(() => {
      const keys = keysRef.current;
      let paddleDirection = 0;

      if (keys['ArrowUp'] || keys['KeyW']) {
        paddleDirection = -1;
      } else if (keys['ArrowDown'] || keys['KeyS']) {
        paddleDirection = 1;
      }

      if (paddleDirection !== 0) {
        socket.emit('paddleMove', paddleDirection);
      }
    }, 16); // ~60 FPS

    return () => clearInterval(gameLoop);
  }, [socket, player, connectionStatus]);

  const handleRestart = () => {
    if (socket) {
      socket.emit('restartGame');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
          MULTIPLAYER PONG
        </h1>
        
        <ConnectionStatus status={connectionStatus} error={error} />
        
        {gameState && player && (
          <>
            <GameUI 
              scores={gameState.scores}
              player={player}
              gameActive={gameState.gameActive}
              winner={gameState.winner}
              onRestart={handleRestart}
            />
            <GameCanvas 
              gameState={gameState}
              player={player}
            />
          </>
        )}
        
        {connectionStatus === 'playing' && (
          <div className="text-center mt-4 text-gray-400">
            <p className="mb-2">Controls: Arrow Keys or W/S</p>
            <p className="text-sm">
              {player?.isPlayer1 ? 'You are Player 1 (Left)' : 'You are Player 2 (Right)'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
