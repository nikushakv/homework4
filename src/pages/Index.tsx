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
  const socketRef = useRef<Socket | null>(null);
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
      setGameState(newGameState);
      if (newGameState.gameActive && connectionStatus !== 'playing') {
        setConnectionStatus('playing');
      }
      if (!newGameState.gameActive && newGameState.winner) {
        setShowRestartOptions(true);
      }
    };

    const onPlayerDisconnected = () => {
      console.log('CLIENT: Event "playerDisconnected" - Opponent left.');
      setConnectionStatus('disconnected'); 
      setErrorMessage('Opponent disconnected. The game has ended.');
      setShowRestartOptions(true);
      setGameState(prev => prev ? ({ ...prev, gameActive: false }) : null);
    };

    const onDisconnect = (reason: Socket.DisconnectReason) => {
      console.log('CLIENT: Event "disconnect" - Reason:', reason);
      if (socketRef.current && reason === 'io client disconnect' && socketRef.current.id === newSocket.id) {
        // Manual disconnect during cleanup, do not set error if it's the current socket
        console.log("CLIENT: Manual disconnect during cleanup for socket:", newSocket.id)
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('disconnected');
        setErrorMessage(`Lost connection: ${reason}. Please refresh.`);
        setShowRestartOptions(true);

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
      const currentSocket = socketRef.current;
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
  }, [player, gameState]);

  const handleRestartOrFindNewGame = () => {
    const currentSocket = socketRef.current;
    // If socket is not connected or player info is missing, force a page refresh.
    if (!currentSocket || !currentSocket.connected || !player) {
        console.log("CLIENT: Socket not connected or player info missing. Refreshing page.");
        handleRefresh();
    } else if (player && gameState && !gameState.gameActive) { 
        // If game is over (inactive) and player is connected, attempt to restart.
        console.log("CLIENT: Requesting to restart game...");
        currentSocket.emit('restartGame');
        setErrorMessage(undefined);
        setConnectionStatus('waiting'); 
        setShowRestartOptions(false); 
    } else {
        console.log("CLIENT: Cannot restart/find new game. Current state:", { 
            connectionStatus, 
            playerExists: !!player, 
            gameStateExists: !!gameState,
            isGameActive: gameState?.gameActive 
        });
        // Fallback to refresh if conditions for restart aren't met but button was somehow clicked.
        handleRefresh();
    }
  };

  // ---- CONDITIONAL RENDERING ----

  // 1. Initial Connecting State (before player/gameState is set, no critical error)
  if (connectionStatus === 'connecting' && !errorMessage && !player && !gameState) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Multiplayer Pong</h1>
        <ConnectionStatus status="connecting" />
      </div>
    );
  }
  
  // 2. Disconnected State (explicitly 'disconnected' or socket object reports not connected)
  //    This also catches initial connection errors handled by 'connect_error'.
  if (connectionStatus === 'disconnected' || (socketRef.current && !socketRef.current.connected && !player && !gameState) ) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Multiplayer Pong</h1>
        <ConnectionStatus status="disconnected" error={errorMessage || "Connection failed or lost. Please try refreshing."} />
        <Button onClick={handleRefresh} className="mt-6 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded text-lg">
            Refresh Page
        </Button>
      </div>
    );
  }

  // 3. Connected, but waiting for player data or initial game state
  if (!player || !gameState) { 
    // At this point, status is likely 'connecting' (if server is slow) or 'waiting'
    let waitingMessage = 'Setting up game...';
    if (connectionStatus === 'waiting') {
        waitingMessage = 'Waiting for opponent...';
    } else if (connectionStatus === 'connecting') {
        waitingMessage = 'Finalizing connection...';
    }
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Multiplayer Pong</h1>
        <ConnectionStatus status={connectionStatus === 'playing' ? 'waiting' : connectionStatus} message={waitingMessage} />
      </div>
    );
  }

  // 4. Main Game Screen (connected, player and gameState are available)
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">Multiplayer Pong</h1>
        </header>
        
        {/* Show "Waiting for game to start..." if game is not active yet, no winner, and status is waiting */}
        {(connectionStatus === 'waiting' && !gameState.gameActive && !gameState.winner) && (
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
          
          {showRestartOptions && !gameState.gameActive && (
            <div className="mt-4">
              {(() => {
                // By the time we are in this main render block, connectionStatus is NOT 'disconnected'.
                // It's 'playing' (game ended) or 'waiting' (post-assignment, pre-start, or between games).
                if (gameState.winner) {
                  return (
                    <p className="text-lg text-yellow-400">
                      Game Over! Click "Play Again" above to start a new match.
                    </p>
                  );
                } else if (errorMessage) { 
                  // This handles cases like "Opponent disconnected" which set errorMessage
                  return (
                    <>
                      <p className="text-lg text-red-400">{errorMessage}</p>
                      {/* GameUI's "Play Again" button calls handleRestartOrFindNewGame which will lead to refresh if needed */}
                      {errorMessage.includes('Opponent disconnected') && (
                        <p className="text-md text-gray-300 mt-1">Click "Play Again" to find a new opponent.</p>
                      )}
                    </>
                  );
                } else {
                  // No winner, no specific error message, but game is inactive.
                  return (
                    <p className="text-lg text-yellow-400">
                      The game has ended or is paused. Waiting for options...
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