
import React, { useRef, useEffect } from 'react';

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

interface GameCanvasProps {
  gameState: GameState;
  player: Player;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, player }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Game dimensions (normalized to canvas size)
    const gameWidth = 800;
    const gameHeight = 400;
    const scaleX = rect.width / gameWidth;
    const scaleY = rect.height / gameHeight;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw center line
    ctx.strokeStyle = '#334155';
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(rect.width / 2, 0);
    ctx.lineTo(rect.width / 2, rect.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddle dimensions
    const paddleWidth = 10;
    const paddleHeight = 80;

    // Draw paddles with glow effect
    const drawPaddle = (x: number, y: number, isPlayer: boolean) => {
      ctx.shadowColor = isPlayer ? '#06b6d4' : '#8b5cf6';
      ctx.shadowBlur = 10;
      ctx.fillStyle = isPlayer ? '#06b6d4' : '#8b5cf6';
      ctx.fillRect(
        x * scaleX,
        y * scaleY,
        paddleWidth * scaleX,
        paddleHeight * scaleY
      );
      ctx.shadowBlur = 0;
    };

    // Player 1 paddle (left)
    drawPaddle(20, gameState.paddles.player1, player.isPlayer1);

    // Player 2 paddle (right)
    drawPaddle(gameWidth - 30, gameState.paddles.player2, !player.isPlayer1);

    // Draw ball with glow effect
    ctx.shadowColor = '#10b981';
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(
      gameState.ball.x * scaleX,
      gameState.ball.y * scaleY,
      8 * Math.min(scaleX, scaleY),
      0,
      2 * Math.PI
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw ball trail effect
    if (gameState.gameActive) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
      for (let i = 1; i <= 3; i++) {
        ctx.beginPath();
        ctx.arc(
          (gameState.ball.x - gameState.ball.dx * i * 2) * scaleX,
          (gameState.ball.y - gameState.ball.dy * i * 2) * scaleY,
          (8 - i * 2) * Math.min(scaleX, scaleY),
          0,
          2 * Math.PI
        );
        ctx.fill();
      }
    }

  }, [gameState, player]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <canvas
        ref={canvasRef}
        className="w-full h-64 md:h-96 border-2 border-gray-700 rounded-lg bg-slate-900"
        style={{ aspectRatio: '2/1' }}
      />
    </div>
  );
};

export default GameCanvas;
