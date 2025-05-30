import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

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

interface Room {
  id: string;
  players: Player[];
  gameState: GameState;
  gameLoop?: NodeJS.Timeout;
}

const rooms: Map<string, Room> = new Map();
const waitingPlayers: string[] = [];

// Game constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 400;
const PADDLE_HEIGHT = 80;
const PADDLE_SPEED = 5;
const BALL_SPEED = 4;
const MAX_SCORE = 5;

function createInitialGameState(): GameState {
  return {
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
  };
}

function updateGameState(room: Room) {
  const { gameState } = room;
  
  if (!gameState.gameActive) return;

  // Update ball position
  gameState.ball.x += gameState.ball.dx;
  gameState.ball.y += gameState.ball.dy;

  // Ball collision with top/bottom walls
  if (gameState.ball.y <= 8 || gameState.ball.y >= GAME_HEIGHT - 8) {
    gameState.ball.dy = -gameState.ball.dy;
  }

  // Ball collision with paddles
  const ballLeft = gameState.ball.x - 8;
  const ballRight = gameState.ball.x + 8;
  const ballTop = gameState.ball.y - 8;
  const ballBottom = gameState.ball.y + 8;

  // Left paddle collision
  if (ballLeft <= 30 && ballRight >= 20 &&
      ballBottom >= gameState.paddles.player1 &&
      ballTop <= gameState.paddles.player1 + PADDLE_HEIGHT) {
    gameState.ball.dx = Math.abs(gameState.ball.dx);
    // Add some spin based on where the ball hits the paddle
    const hitPos = (gameState.ball.y - gameState.paddles.player1) / PADDLE_HEIGHT;
    gameState.ball.dy = (hitPos - 0.5) * BALL_SPEED;
  }

  // Right paddle collision
  if (ballRight >= GAME_WIDTH - 30 && ballLeft <= GAME_WIDTH - 20 &&
      ballBottom >= gameState.paddles.player2 &&
      ballTop <= gameState.paddles.player2 + PADDLE_HEIGHT) {
    gameState.ball.dx = -Math.abs(gameState.ball.dx);
    // Add some spin based on where the ball hits the paddle
    const hitPos = (gameState.ball.y - gameState.paddles.player2) / PADDLE_HEIGHT;
    gameState.ball.dy = (hitPos - 0.5) * BALL_SPEED;
  }

  // Scoring
  if (gameState.ball.x < 0) {
    gameState.scores.player2++;
    resetBall(gameState);
  } else if (gameState.ball.x > GAME_WIDTH) {
    gameState.scores.player1++;
    resetBall(gameState);
  }

  // Check for winner
  if (gameState.scores.player1 >= MAX_SCORE) {
    gameState.winner = 'player1';
    gameState.gameActive = false;
  } else if (gameState.scores.player2 >= MAX_SCORE) {
    gameState.winner = 'player2';
    gameState.gameActive = false;
  }

  // Emit game state to all players in room
  room.players.forEach(player => {
    io.to(player.id).emit('gameState', gameState);
  });
}

function resetBall(gameState: GameState) {
  gameState.ball.x = GAME_WIDTH / 2;
  gameState.ball.y = GAME_HEIGHT / 2;
  gameState.ball.dx = Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED;
  gameState.ball.dy = (Math.random() - 0.5) * BALL_SPEED;
}

function startGameLoop(room: Room) {
  if (room.gameLoop) return;
  
  room.gameLoop = setInterval(() => {
    updateGameState(room);
  }, 1000 / 60); // 60 FPS
}

function stopGameLoop(room: Room) {
  if (room.gameLoop) {
    clearInterval(room.gameLoop);
    room.gameLoop = undefined;
  }
}

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Player disconnected:', socket.id);
    
    // Remove from waiting players
    const waitingIndex = waitingPlayers.indexOf(socket.id);
    if (waitingIndex > -1) {
      waitingPlayers.splice(waitingIndex, 1);
    }

    // Find and handle room cleanup
    for (const [roomId, room] of rooms) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex > -1) {
        room.players.splice(playerIndex, 1);
        
        // Notify remaining player
        if (room.players.length > 0) {
          io.to(room.players[0].id).emit('playerDisconnected');
        }
        
        // Clean up empty rooms
        if (room.players.length === 0) {
          stopGameLoop(room);
          rooms.delete(roomId);
        }
        break;
      }
    }
  });

  // Add player to waiting queue
  waitingPlayers.push(socket.id);

  // Try to match players
  if (waitingPlayers.length >= 2) {
    const player1Id = waitingPlayers.shift()!;
    const player2Id = waitingPlayers.shift()!;
    
    const roomId = `room_${Date.now()}`;
    const room: Room = {
      id: roomId,
      players: [
        { id: player1Id, isPlayer1: true, roomId },
        { id: player2Id, isPlayer1: false, roomId }
      ],
      gameState: createInitialGameState()
    };
    
    rooms.set(roomId, room);
    
    // Notify players
    io.to(player1Id).emit('playerAssigned', room.players[0]);
    io.to(player2Id).emit('playerAssigned', room.players[1]);
    
    setTimeout(() => {
      io.to(player1Id).emit('gameStart');
      io.to(player2Id).emit('gameStart');
      startGameLoop(room);
    }, 1000);
  }

  socket.on('paddleMove', (direction: number) => {
    // Find player's room
    for (const room of rooms.values()) {
      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        const paddleKey = player.isPlayer1 ? 'player1' : 'player2';
        const currentPos = room.gameState.paddles[paddleKey];
        const newPos = currentPos + direction * PADDLE_SPEED;
        
        // Keep paddle within bounds
        room.gameState.paddles[paddleKey] = Math.max(
          0,
          Math.min(GAME_HEIGHT - PADDLE_HEIGHT, newPos)
        );
        break;
      }
    }
  });

  socket.on('restartGame', () => {
    // Find player's room
    for (const room of rooms.values()) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && room.players.length === 2) {
        room.gameState = createInitialGameState();
        startGameLoop(room);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
