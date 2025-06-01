import React, { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import GameCanvas from '../components/GameCanvas';
import GameUI from '../components/GameUI';
import ConnectionStatus from '../components/ConnectionStatus';
import { Button } from '@/components/ui/button';

interface Player {
  id: string;
  isPlayer1: boolean;
  roomId: string;
}

interface GameState {
  ball: { x: number; y: number; dx: number; dy: number };
  paddles: { player1: number; player2: number };
  scores: { player1: number; player2: number };
  gameActive: boolean;
  winner?: string;
}

const SERVER_URL = "http://localhost:3001";

const Index = () => {
  const socketRef = useRef<Socket | null>(null); // Use ref for socket to avoid stale closures in event handlers if needed
  const [player, setPlayer] = useState<Player | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'waiting' | 'playing' | 'disconnected'>('connecting');
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [showRestartOptions, setShowRestartOptions] = useState(false);

  const keysRef = useRef<{ [key: string]: boolean }>({});

  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  useEffect(() => {
    console.log("CLIENT: Mounting Index component. Attempting to connect to server at", SERVER_URL);
    const newSocket = io(SERVER_URL, {
        reconnectionAttempts: 3,
        timeout: 10000,
        // transports: ['websocket'], // You can try forcing websockets if polling is an issue, but usually not needed for localhost
    });
    socketRef.current = newSocket;

    const onConnect = () => {
      console.log('CLIENT: Event "connect" - Socket ID:', newSocket.id);
      setConnectionStatus('connecting'); 
      setErrorMessage(undefined);
      setShowRestartOptions(false);
    };

    const onConnectError = (err: Error) => {
        console.error('CLIENT: Event "connect_error" - Message:', err.message, err);
        setConnectionStatus('disconnected');
        setErrorMessage(`Failed to connect: ${err.message}. Ensure server is running & refresh.`);
        setShowRestartOptions(true);
    };

    const onPlayerAssigned = (assignedPlayer: Player) => {
      console.log('CLIENT: Event "playerAssigned" - Data:', assignedPlayer);
      setPlayer(assignedPlayer);
      setConnectionStatus('waiting');
      setShowRestartOptions(false);
    };

    const onWaitingForOpponent = () => {
        console.log('CLIENT: Event "waitingForOpponent"');
        setConnectionStatus('waiting');
        setErrorMessage(undefined);
        setShowRestartOptions(false);
    };

    const onGameStart = () => {
      console.log('CLIENT: Event "gameStart"');
      setConnectionStatus('playing');
      setErrorMessage(undefined);
      setShowRestartOptions(false);
    };

    const onGameState = (newGameState: GameState) => {
      // console.log('CLIENT: Event "gameState" - Data:', newGameState); // Noisy
      setGameState(newGameState);
      if (newGameState.gameActive && connectionStatus !== 'playing') {
        // This check might be redundant if 'gameStart' always precedes active gameState
        // console.log("CLIENT: gameState is active, ensuring connectionStatus is 'playing'");
        setConnectionStatus('playing');
      }
      if (!newGameState.gameActive && newGameState.winner) {
        console.log("CLIENT: Game ended with winner. Setting showRestartOptions to true.");
        // setConnectionStatus('playing'); // Keep as playing to show game board, GameUI handles winner display
        setShowRestartOptions(true);
      }
    };

    const onPlayerDisconnected = () => {
      console.log('CLIENT: Event "playerDisconnected" - Opponent left.');
      setConnectionStatus('disconnected');
      setErrorMessage('Opponent disconnected. The game has ended.');
      setShowRestartOptions(true);
      // Keep current gameState to show final scores, but mark as inactive
      setGameState(prev => prev ? ({ ...prev, gameActive: false }) : null);
    };

    const onDisconnect = (reason: Socket.DisconnectReason) => {
      console.log('CLIENT: Event "disconnect" - Reason:', reason);
      if (reason !== 'io client disconnect') { 
        setConnectionStatus('disconnected');
        setErrorMessage(`Lost connection: ${reason}. Please refresh.`);
        setShowRestartOptions(true);
      } else {
        setConnectionStatus('disconnected'); // Manual disconnect
      }
      setGameState(prev => prev ? ({ ...prev, gameActive: false }) : null);
    };

    newSocket.on('connect', onConnect);
    newSocket.on('connect_error', onConnectError);
    newSocket.on('playerAssigned', onPlayerAssigned);
    newSocket.on('waitingForOpponent', onWaitingForOpponent);
    newSocket.on('gameStart', onGameStart);
    newSocket.on('gameState', onGameState);
    newSocket.on('playerDisconnected', onPlayerDisconnected);
    newSocket.on('disconnect', onDisconnect);

    return () => {
      console.log("CLIENT: useEffect cleanup. Disconnecting socket:", newSocket.id);
      newSocket.off('connect', onConnect);
      newSocket.off('connect_error', onConnectError);
      newSocket.off('playerAssigned', onPlayerAssigned);
      newSocket.off('waitingForOpponent', onWaitingForOpponent);
      newSocket.off('gameStart', onGameStart);
      newSocket.off('gameState', onGameState);
      newSocket.off('playerDisconnected', onPlayerDisconnected);
      newSocket.off('disconnect', onDisconnect);
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, []); 

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    const inputLoopId = setInterval(() => {
      const currentSocket = socketRef.current; // Use the ref here
      if (currentSocket && player && gameState && gameState.gameActive) {
        let direction = 0;
        if (player.isPlayer1) {
          if (keysRef.current['KeyW']) direction = -1;
          if (keysRef.current['KeyS']) direction = 1;
        } else {
          if (keysRef.current['ArrowUp']) direction = -1;
          if (keysRef.current['ArrowDown']) direction = 1;
        }
        if (direction !== 0) {
          currentSocket.emit('paddleMove', direction);
        }
      }
    }, 1000 / 45); 

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearInterval(inputLoopId);
    };
  }, [player, gameState]); // Socket itself is stable via ref, so not in deps here

  const handleRestartOrFindNewGame = () => {
    const currentSocket = socketRef.current;
    if (!currentSocket || currentSocket.disconnected || !player) {
        console.log("CLIENT: Refreshing page to find new game / reconnect.");
        handleRefresh();
    } else if (player && gameState && !gameState.gameActive) { 
        console.log("CLIENT: Requesting to restart game...");
        currentSocket.emit('restartGame');
        setErrorMessage(undefined);
        setConnectionStatus('waiting'); 
        setShowRestartOptions(false); 
    } else {
        console.log("CLIENT: Cannot restart/find new game. State:", { connectionStatus, playerExists: !!player, gameStateActive: gameState?.gameActive });
    }
  };

  // Conditional Rendering Logic
  if (connectionStatus === 'connecting' && !errorMessage) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Multiplayer Pong</h1>
        <ConnectionStatus status="connecting" />
      </div>
    );
  }
  
  if (connectionStatus === 'disconnected' || !socketRef.current?.connected) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Multiplayer Pong</h1>
        <ConnectionStatus status="disconnected" error={errorMessage || "Connection failed or lost."} />
        <Button onClick={handleRefresh} className="mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-lg">
            {errorMessage && errorMessage.toLowerCase().includes("failed to connect") ? "Retry Connection" : "Refresh Page"}
        </Button>
      </div>
    );
  }

  if (!player || !gameState) {
     // This state means connected, but not yet assigned or no game state received
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Multiplayer Pong</h1>
        <ConnectionStatus status={connectionStatus} message={connectionStatus === 'waiting' ? 'Waiting for opponent...' : 'Setting up game...'} />
      </div>
    );
  }

  // Main game screen
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Multiplayer Pong</h1>
        </header>
        
        {(connectionStatus === 'waiting' && gameState && !gameState.gameActive && !gameState.winner) && (
          <ConnectionStatus status="waiting" message="Waiting for game to start..." />
        )}
        
        <GameUI 
          scores={gameState.scores}
          player={{ isPlayer1: player.isPlayer1 }}
          gameActive={gameState.gameActive}
          winner={gameState.winner}
          onRestart={handleRestartOrFindNewGame} 
        />
        <GameCanvas 
          gameState={gameState}
          player={player}
        />
        
                <footer className="text-center mt-6 text-gray-400">
          <p className="mb-1 text-sm md:text-base">
            You are Player {player.isPlayer1 ? '1 (Left Paddle - Cyan)' : '2 (Right Paddle - Purple)'}
          </p>
          <p className="mb-2 text-sm md:text-base">
            Controls: {player.isPlayer1 ? 'W / S Keys' : 'Arrow Up / Down Keys'}
          </p>
          
          {/* This block shows messages when the game is not active AND showRestartOptions is true */}
          {showRestartOptions && !gameState.gameActive && (
            <div className="mt-4">
              {(() => {
                // At this point, we are in the main game render block, so connectionStatus is NOT 'disconnected'
                // and likely not 'connecting' if player and gameState are available.
                // It's most likely 'playing' (but game is inactive) or 'waiting'.

                if (gameState.winner) {
                  // GameUI shows "Play Again". This provides context.
                  return (
                    <p className="text-lg text-yellow-400">
                      Game Over! Click "Play Again" above to start a new match.
                    </p>
                  );
                } else if (errorMessage && errorMessage.includes('Opponent disconnected')) {
                  // This specific error message implies a disconnect handled by playerDisconnected event
                  // which might have set connectionStatus to 'disconnected', but the main render
                  // logic for disconnected state should have caught that.
                  // This message is more for when that event specifically led to an inactive game.
                  return (
                    <>
                      <p className="text-lg text-yellow-400">{errorMessage}</p>
                      <p className="text-md text-gray-300 mt-1">You can click "Play Again" above to find a new opponent.</p>
                    </>
                  );
                } else if (errorMessage) {
                  // Some other error occurred while the game became inactive
                  return (
                    <p className="text-lg text-red-400">{errorMessage}</p>
                  );
                } else {
                  // No specific winner, no specific error message, but game is inactive.
                  return (
                    <p className="text-lg text-yellow-400">
                      The game has ended or is paused.
                    </p>
                  );
                }
              })()}
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default Index;