
import React, { useEffect, useRef, useState } from 'react';
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

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const PADDLE_HEIGHT = 80;
const PADDLE_SPEED = 5;
const BALL_SPEED = 4;
const MAX_SCORE = 5;

const Index = () => {
  const [gameState, setGameState] = useState<GameState>({
    ball: {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      dx: Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED,
      dy: (Math.random() - 0.5) * BALL_SPEED
    },
    paddles: {
      player1: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      player2: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2
    },
    scores: { player1: 0, player2: 0 },
    gameActive: true
  });
  
  const [currentPlayer, setCurrentPlayer] = useState<{ isPlayer1: boolean }>({ isPlayer1: true });
  const [connectionStatus] = useState<'playing'>('playing');
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const gameLoopRef = useRef<number>();

  const resetBall = (newGameState: GameState) => {
    newGameState.ball.x = GAME_WIDTH / 2;
    newGameState.ball.y = GAME_HEIGHT / 2;
    newGameState.ball.dx = Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED;
    newGameState.ball.dy = (Math.random() - 0.5) * BALL_SPEED;
  };

  const updateGameState = () => {
    setGameState(prevState => {
      if (!prevState.gameActive) return prevState;

      const newState = { ...prevState };

      // Update ball position
      newState.ball.x += newState.ball.dx;
      newState.ball.y += newState.ball.dy;

      // Ball collision with top/bottom walls
      if (newState.ball.y <= 8 || newState.ball.y >= GAME_HEIGHT - 8) {
        newState.ball.dy = -newState.ball.dy;
      }

      // Ball collision with paddles
      const ballLeft = newState.ball.x - 8;
      const ballRight = newState.ball.x + 8;
      const ballTop = newState.ball.y - 8;
      const ballBottom = newState.ball.y + 8;

      // Left paddle collision
      if (ballLeft <= 30 && ballRight >= 20 &&
          ballBottom >= newState.paddles.player1 &&
          ballTop <= newState.paddles.player1 + PADDLE_HEIGHT) {
        newState.ball.dx = Math.abs(newState.ball.dx);
        const hitPos = (newState.ball.y - newState.paddles.player1) / PADDLE_HEIGHT;
        newState.ball.dy = (hitPos - 0.5) * BALL_SPEED;
      }

      // Right paddle collision
      if (ballRight >= GAME_WIDTH - 30 && ballLeft <= GAME_WIDTH - 20 &&
          ballBottom >= newState.paddles.player2 &&
          ballTop <= newState.paddles.player2 + PADDLE_HEIGHT) {
        newState.ball.dx = -Math.abs(newState.ball.dx);
        const hitPos = (newState.ball.y - newState.paddles.player2) / PADDLE_HEIGHT;
        newState.ball.dy = (hitPos - 0.5) * BALL_SPEED;
      }

      // Scoring
      if (newState.ball.x < 0) {
        newState.scores.player2++;
        resetBall(newState);
      } else if (newState.ball.x > GAME_WIDTH) {
        newState.scores.player1++;
        resetBall(newState);
      }

      // Check for winner
      if (newState.scores.player1 >= MAX_SCORE) {
        newState.winner = 'player1';
        newState.gameActive = false;
      } else if (newState.scores.player2 >= MAX_SCORE) {
        newState.winner = 'player2';
        newState.gameActive = false;
      }

      return newState;
    });
  };

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
    if (!gameState.gameActive) return;

    gameLoopRef.current = window.setInterval(() => {
      // Handle paddle movements
      const keys = keysRef.current;
      
      setGameState(prevState => {
        const newState = { ...prevState };
        
        // Player 1 controls (W/S)
        if (keys['KeyW']) {
          newState.paddles.player1 = Math.max(0, newState.paddles.player1 - PADDLE_SPEED);
        }
        if (keys['KeyS']) {
          newState.paddles.player1 = Math.min(GAME_HEIGHT - PADDLE_HEIGHT, newState.paddles.player1 + PADDLE_SPEED);
        }
        
        // Player 2 controls (Arrow Keys)
        if (keys['ArrowUp']) {
          newState.paddles.player2 = Math.max(0, newState.paddles.player2 - PADDLE_SPEED);
        }
        if (keys['ArrowDown']) {
          newState.paddles.player2 = Math.min(GAME_HEIGHT - PADDLE_HEIGHT, newState.paddles.player2 + PADDLE_SPEED);
        }
        
        return newState;
      });

      updateGameState();
    }, 1000 / 60); // 60 FPS

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current);
      }
    };
  }, [gameState.gameActive]);

  const handleRestart = () => {
    setGameState({
      ball: {
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT / 2,
        dx: Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED,
        dy: (Math.random() - 0.5) * BALL_SPEED
      },
      paddles: {
        player1: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2,
        player2: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2
      },
      scores: { player1: 0, player2: 0 },
      gameActive: true,
      winner: undefined
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <h1 className="text-4xl md:text-6xl font-bold text-center mb-8 bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent">
          LOCAL PONG
        </h1>
        
        <GameUI 
          scores={gameState.scores}
          player={currentPlayer}
          gameActive={gameState.gameActive}
          winner={gameState.winner}
          onRestart={handleRestart}
        />
        <GameCanvas 
          gameState={gameState}
          player={{ id: 'local', isPlayer1: true, roomId: 'local' }}
        />
        
        <div className="text-center mt-4 text-gray-400">
          <p className="mb-2">Player 1 (Left Paddle): W/S Keys</p>
          <p className="mb-2">Player 2 (Right Paddle): Arrow Up/Down Keys</p>
          <p className="text-sm text-yellow-400">Local multiplayer - two players on same device!</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
