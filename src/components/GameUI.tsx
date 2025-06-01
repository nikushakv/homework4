import React from 'react';
import { Button } from '@/components/ui/button';

interface GameUIProps {
  scores: { player1: number; player2: number };
  player: { isPlayer1: boolean }; // As passed by Index.tsx
  gameActive: boolean;
  winner?: string;
  onRestart: () => void;
}

const GameUI: React.FC<GameUIProps> = ({ scores, player, gameActive, winner, onRestart }) => {
  return (
    <div className="mb-6">
      {/* Score Display */}
      <div className="flex justify-center items-center space-x-4 sm:space-x-8 md:space-x-16 mb-6">
        <div className="text-center p-3 sm:p-4 rounded-lg border-2 border-cyan-400 bg-cyan-400/10">
          <div className="text-xs sm:text-sm text-gray-400 mb-1">
            {player.isPlayer1 ? "YOU (P1)" : "PLAYER 1"}
          </div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-cyan-400">
            {scores.player1}
          </div>
        </div>
        
        <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-500">VS</div>
        
        <div className="text-center p-3 sm:p-4 rounded-lg border-2 border-purple-400 bg-purple-400/10">
          <div className="text-xs sm:text-sm text-gray-400 mb-1">
            {!player.isPlayer1 ? "YOU (P2)" : "PLAYER 2"}
          </div>
          <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-400">
            {scores.player2}
          </div>
        </div>
      </div>

      {/* Game Status Messages and Restart Button */}
      {!gameActive && winner && (
        <div className="text-center mb-4">
          <div className="text-xl sm:text-2xl md:text-3xl font-bold mb-4">
            🎉 Player {winner === 'player1' ? '1' : '2'} Wins! 🎉
          </div>
          <Button 
            onClick={onRestart} 
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white px-6 py-2 text-base"
          >
            Play Again
          </Button>
        </div>
      )}

      {!gameActive && !winner && (
        <div className="text-center text-lg sm:text-xl text-gray-400">
          Waiting for game to start or for opponent...
        </div>
      )}
    </div>
  );
};

export default GameUI;