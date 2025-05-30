
# Multiplayer Pong Game

A real-time multiplayer Pong game built with React, TypeScript, and Socket.IO.

## Features

- Real-time multiplayer gameplay
- Smooth canvas-based graphics
- Room-based matchmaking
- Score tracking and win conditions
- Responsive design
- Modern UI with neon effects

## Setup Instructions

### Frontend (React)
The frontend is already configured and will run on the Lovable platform.

### Backend (Node.js Server)
To run the backend server locally:

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3001`.

## How to Play

1. Open the game in two browser windows/tabs
2. Both players will be automatically matched
3. Use Arrow Keys or W/S to control your paddle
4. First player to reach 5 points wins!

## Game Controls

- **Arrow Up** or **W**: Move paddle up
- **Arrow Down** or **S**: Move paddle down

## Technical Implementation

### Frontend
- React with TypeScript
- Socket.IO client for real-time communication
- HTML5 Canvas for smooth game rendering
- Tailwind CSS for modern styling

### Backend
- Node.js with Express
- Socket.IO for WebSocket communication
- Real-time game physics and collision detection
- Room management for player pairing

### Architecture
- Client-server architecture with authoritative server
- Real-time state synchronization
- Event-driven programming model
- Scalable room-based multiplayer system

## Game Mechanics

- Ball physics with paddle collision effects
- Paddle movement constraints
- Scoring system with win conditions
- Game state management across clients
- Automatic game restart functionality

Enjoy playing Multiplayer Pong! 🏓
