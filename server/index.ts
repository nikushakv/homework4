import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:8080", // Ensure this matches your frontend dev port
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
const PADDLE_THICKNESS = 10;
const PADDLE_MARGIN = 20;
const PADDLE_SPEED = 6;
const BALL_RADIUS = 8;
const BALL_SPEED = 5;
const MAX_SCORE = 5;

function createInitialGameState(): GameState {
  return {
    ball: {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT / 2,
      dx: Math.random() > 0.5 ? BALL_SPEED : -BALL_SPEED,
      dy: (Math.random() - 0.5) * BALL_SPEED * 0.8
    },
    paddles: {
      player1: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2,
      player2: GAME_HEIGHT / 2 - PADDLE_HEIGHT / 2
    },
    scores: { player1: 0, player2: 0 },
    gameActive: true,
    winner: undefined
  };
}

function updateGameState(room: Room) {
  const { gameState } = room;
  
  if (!gameState.gameActive) return;

  gameState.ball.x += gameState.ball.dx;
  gameState.ball.y += gameState.ball.dy;

  if (gameState.ball.y - BALL_RADIUS <= 0 || gameState.ball.y + BALL_RADIUS >= GAME_HEIGHT) {
    gameState.ball.dy = -gameState.ball.dy;
    gameState.ball.y = Math.max(BALL_RADIUS, Math.min(GAME_HEIGHT - BALL_RADIUS, gameState.ball.y));
  }

  const ballLeft = gameState.ball.x - BALL_RADIUS;
  const ballRight = gameState.ball.x + BALL_RADIUS;
  const ballTop = gameState.ball.y - BALL_RADIUS;
  const ballBottom = gameState.ball.y + BALL_RADIUS;

  const p1PaddleTop = gameState.paddles.player1;
  const p1PaddleBottom = gameState.paddles.player1 + PADDLE_HEIGHT;
  const p1PaddleFront = PADDLE_MARGIN + PADDLE_THICKNESS;
  const p1PaddleBack = PADDLE_MARGIN;

  if (ballLeft <= p1PaddleFront && ballRight >= p1PaddleBack &&
      ballBottom >= p1PaddleTop && ballTop <= p1PaddleBottom) {
    gameState.ball.dx = Math.abs(BALL_SPEED); 
    const hitPos = (gameState.ball.y - p1PaddleTop) / PADDLE_HEIGHT; 
    gameState.ball.dy = (hitPos - 0.5) * BALL_SPEED * 1.5; 
    gameState.ball.x = p1PaddleFront + BALL_RADIUS; 
  }

  const p2PaddleTop = gameState.paddles.player2;
  const p2PaddleBottom = gameState.paddles.player2 + PADDLE_HEIGHT;
  const p2PaddleFront = GAME_WIDTH - PADDLE_MARGIN - PADDLE_THICKNESS;
  const p2PaddleBack = GAME_WIDTH - PADDLE_MARGIN;

  if (ballRight >= p2PaddleFront && ballLeft <= p2PaddleBack &&
      ballBottom >= p2PaddleTop && ballTop <= p2PaddleBottom) {
    gameState.ball.dx = -Math.abs(BALL_SPEED); 
    const hitPos = (gameState.ball.y - p2PaddleTop) / PADDLE_HEIGHT; 
    gameState.ball.dy = (hitPos - 0.5) * BALL_SPEED * 1.5; 
    gameState.ball.x = p2PaddleFront - BALL_RADIUS; 
  }

  if (gameState.ball.x - BALL_RADIUS < 0) {
    gameState.scores.player2++;
    resetBall(gameState, false);
  } else if (gameState.ball.x + BALL_RADIUS > GAME_WIDTH) {
    gameState.scores.player1++;
    resetBall(gameState, true);
  }

  if (gameState.scores.player1 >= MAX_SCORE) {
    gameState.winner = 'player1';
    gameState.gameActive = false;
    stopGameLoop(room); 
  } else if (gameState.scores.player2 >= MAX_SCORE) {
    gameState.winner = 'player2';
    gameState.gameActive = false;
    stopGameLoop(room); 
  }
}

function resetBall(gameState: GameState, lastScoredByPlayer1: boolean) {
  gameState.ball.x = GAME_WIDTH / 2;
  gameState.ball.y = GAME_HEIGHT / 2;
  gameState.ball.dx = lastScoredByPlayer1 ? -BALL_SPEED : BALL_SPEED;
  gameState.ball.dy = (Math.random() - 0.5) * BALL_SPEED * 0.5;
}

function startGameLoop(room: Room) {
  if (room.gameLoop) {
    // console.warn(`SERVER: Game loop already running for room ${room.id}, stopping old one.`);
    // clearInterval(room.gameLoop); 
  }
  console.log(`SERVER: Starting game loop for room ${room.id}`);
  room.gameLoop = setInterval(() => {
    updateGameState(room);
    room.players.forEach(player => {
        io.to(player.id).emit('gameState', room.gameState);
    });
  }, 1000 / 60); 
}

function stopGameLoop(room: Room) {
  if (room.gameLoop) {
    clearInterval(room.gameLoop);
    room.gameLoop = undefined;
    console.log(`SERVER: Stopped game loop for room ${room.id}`);
  }
}

io.on('connection', (socket) => {
  console.log('SERVER: Player connected:', socket.id);

  socket.on('disconnect', () => {
    console.log(`SERVER: Player disconnected: ${socket.id}`);
    const waitingIndex = waitingPlayers.indexOf(socket.id);
    if (waitingIndex > -1) {
      waitingPlayers.splice(waitingIndex, 1);
      console.log(`SERVER: Player ${socket.id} removed from waiting queue.`);
    }
    for (const [roomId, room] of rooms) {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex > -1) {
        const disconnectedPlayer = room.players.splice(playerIndex, 1)[0];
        console.log(`SERVER: Player ${disconnectedPlayer.id} (Player ${disconnectedPlayer.isPlayer1 ? 1 : 2}) removed from room ${roomId}.`);
        if (room.players.length > 0) {
          const remainingPlayer = room.players[0];
          console.log(`SERVER: Notifying remaining player ${remainingPlayer.id} in room ${roomId} about disconnection.`);
          io.to(remainingPlayer.id).emit('playerDisconnected');
          room.gameState.gameActive = false;
          stopGameLoop(room); 
          io.to(remainingPlayer.id).emit('gameState', room.gameState); 
        }
        if (room.players.length === 0) {
          console.log(`SERVER: Room ${roomId} is empty, deleting.`);
          stopGameLoop(room);
          rooms.delete(roomId);
        }
        break;
      }
    }
  });

  waitingPlayers.push(socket.id);
  console.log(`SERVER: Player ${socket.id} added to waiting queue. Queue size: ${waitingPlayers.length}`);

  if (waitingPlayers.length >= 2) {
    const player1Id = waitingPlayers.shift()!;
    const player2Id = waitingPlayers.shift()!;
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const room: Room = {
      id: roomId,
      players: [
        { id: player1Id, isPlayer1: true, roomId },
        { id: player2Id, isPlayer1: false, roomId }
      ],
      gameState: createInitialGameState()
    };
    rooms.set(roomId, room);
    console.log(`SERVER: Room ${roomId} created for players ${player1Id} (P1) and ${player2Id} (P2).`);
    
    io.to(player1Id).emit('playerAssigned', room.players[0]);
    io.to(player2Id).emit('playerAssigned', room.players[1]);
    console.log(`SERVER: Emitting 'playerAssigned' to ${player1Id} and ${player2Id}`);
    
    console.log(`SERVER: Starting game for room ${roomId} in 1 second.`);
    setTimeout(() => {
      io.to(player1Id).emit('gameStart');
      io.to(player2Id).emit('gameStart');
      console.log(`SERVER: Emitting 'gameStart' to room ${room.id}`);
      startGameLoop(room);
    }, 1000);
  } else {
      // THIS IS THE CRUCIAL BLOCK FOR THE FIRST PLAYER
      socket.emit('waitingForOpponent');
      console.log(`SERVER: Emitting 'waitingForOpponent' to ${socket.id}`); 
      console.log(`SERVER: Player ${socket.id} is waiting for an opponent. Queue size: ${waitingPlayers.length}`);
  }

  socket.on('paddleMove', (direction: number) => {
    for (const room of rooms.values()) {
      const player = room.players.find(p => p.id === socket.id);
      if (player && room.gameState.gameActive) {
        const paddleKey = player.isPlayer1 ? 'player1' : 'player2';
        const currentPos = room.gameState.paddles[paddleKey];
        let newPos = currentPos + direction * PADDLE_SPEED;
        room.gameState.paddles[paddleKey] = Math.max(0, Math.min(GAME_HEIGHT - PADDLE_HEIGHT, newPos));
        break;
      }
    }
  });

  socket.on('restartGame', () => {
    console.log(`SERVER: Player ${socket.id} requested to restart game.`);
    for (const room of rooms.values()) {
      const playerRequesting = room.players.find(p => p.id === socket.id);
      if (playerRequesting) { 
        if (room.players.length === 2 && !room.gameState.gameActive && room.gameState.winner) {
          console.log(`SERVER: Restarting game in room ${room.id} due to request from ${socket.id}.`);
          room.gameState = createInitialGameState();
          stopGameLoop(room); 
          startGameLoop(room); 
          room.players.forEach(p => {
            io.to(p.id).emit('gameStart'); 
            io.to(p.id).emit('gameState', room.gameState); 
          });
        } else {
            console.log(`SERVER: Game in room ${room.id} conditions not met for restart request by ${socket.id} (players: ${room.players.length}, active: ${room.gameState.gameActive}, winner: ${room.gameState.winner})`);
        }
        break; 
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`SERVER: Server running on port ${PORT}`);
});