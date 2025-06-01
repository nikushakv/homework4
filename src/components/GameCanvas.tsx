import React, { useRef, useEffect } from 'react';

// Ensure these interfaces match those in Index.tsx and your server
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

    const rect = canvas.getBoundingClientRect();
    const canvasWidth = rect.width;
    const canvasHeight = rect.height;

    // Set actual canvas drawing surface size (respecting device pixel ratio for sharpness)
    canvas.width = canvasWidth * window.devicePixelRatio;
    canvas.height = canvasHeight * window.devicePixelRatio;

    // Scale the drawing context to match the CSS dimensions
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Logical game dimensions (these should ideally match server constants for consistency)
    const logicalGameWidth = 800;
    const logicalGameHeight = 400;

    // Calculate scaling factors to map logical coordinates to canvas coordinates
    const scaleX = canvasWidth / logicalGameWidth;
    const scaleY = canvasHeight / logicalGameHeight;

    // Clear canvas
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Draw center line
    ctx.strokeStyle = '#334155'; // slate-700
    ctx.setLineDash([5 * Math.min(scaleX, scaleY), 5 * Math.min(scaleX, scaleY)]); // Scale dash pattern
    ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2, 0);
    ctx.lineTo(canvasWidth / 2, canvasHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Logical paddle dimensions
    const logicalPaddleWidth = 10;
    const logicalPaddleHeight = 80;
    const logicalPaddleMargin = 20; // Margin from the edge

    // Draw paddles with glow effect
    const drawPaddle = (logicalX: number, logicalY: number, isThisClientsPaddle: boolean) => {
      const paddleColor = isThisClientsPaddle ? '#06b6d4' : '#8b5cf6'; // cyan-500 for client, purple-500 for opponent
      ctx.shadowColor = paddleColor;
      ctx.shadowBlur = 10 * Math.min(scaleX, scaleY); // Scale shadow blur
      ctx.fillStyle = paddleColor;
      ctx.fillRect(
        logicalX * scaleX,
        logicalY * scaleY,
        logicalPaddleWidth * scaleX,
        logicalPaddleHeight * scaleY
      );
      ctx.shadowBlur = 0;
    };

    // Player 1 paddle (left)
    drawPaddle(logicalPaddleMargin, gameState.paddles.player1, player.isPlayer1);

    // Player 2 paddle (right)
    drawPaddle(logicalGameWidth - logicalPaddleMargin - logicalPaddleWidth, gameState.paddles.player2, !player.isPlayer1);


    // Draw ball with glow effect
    const logicalBallRadius = 8;
    ctx.shadowColor = '#10b981'; // green-500
    ctx.shadowBlur = 15 * Math.min(scaleX, scaleY); // Scale shadow blur
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.arc(
      gameState.ball.x * scaleX,
      gameState.ball.y * scaleY,
      logicalBallRadius * Math.min(scaleX, scaleY), // Scale ball radius
      0,
      2 * Math.PI
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw ball trail effect
    if (gameState.gameActive) {
      ctx.fillStyle = 'rgba(16, 185, 129, 0.2)'; // Slightly less opaque trail
      const trailParticles = 3;
      const trailSpacingFactor = 1.5; // How far back the trail particles are
      const trailRadiusDecrement = 1.5; // How much smaller each trail particle gets

      for (let i = 1; i <= trailParticles; i++) {
        const trailRadius = (logicalBallRadius - i * trailRadiusDecrement) * Math.min(scaleX, scaleY);
        if (trailRadius > 0) { // Only draw if radius is positive
          ctx.beginPath();
          ctx.arc(
            (gameState.ball.x - gameState.ball.dx * i * trailSpacingFactor) * scaleX,
            (gameState.ball.y - gameState.ball.dy * i * trailSpacingFactor) * scaleY,
            trailRadius,
            0,
            2 * Math.PI
          );
          ctx.fill();
        }
      }
    }

  }, [gameState, player]); // Re-render when gameState or player info changes
  const logicalGameWidth = 800;
  const logicalGameHeight = 400;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <canvas
        ref={canvasRef}
        className="w-full h-64 md:h-96 border-2 border-gray-700 rounded-lg bg-slate-900"
        // The style attribute helps maintain the aspect ratio responsive.
        // The canvas width/height attributes are set in useEffect to match CSS dimensions.
        style={{ aspectRatio: `${logicalGameWidth} / ${logicalGameHeight}` }}
      />
    </div>
  );
};

export default GameCanvas;