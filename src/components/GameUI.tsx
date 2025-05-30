
import React from 'react';
import { Button } from '@/components/ui/button';

interface GameUIProps {
  scores: { player1: number; player2: number };
  player: { isPlayer1: boolean };
  gameActive: boolean;
  winner?: string;
  onRestart: () => void;
}

const GameUI: React.FC<GameUIProps> = ({ scores, player, gameActive, winner, onRestart }) => {
  return (
    <div className="mb-6">
      {/* Score Display */}
      <div className="flex justify-center items-center space-x-8 md:space-x-16 mb-6">
        <div className={`text-center p-4 rounded-lg border-2 ${
          player.isPlayer1 ? 'border-cyan-400 bg-cyan-400/10' : 'border-gray-600 bg-gray-800'
        }`}>
          <div className="text-sm text-gray-400 mb-1">Player 1 (You)</div>
          <div className="text-3xl md:text-4xl font-bold text-cyan-400">
            {scores.player1}
          </div>
        </div>
        
        <div className="text-2xl md:text-3xl font-bold text-gray-500">VS</div>
        
        <div className={`text-center p-4 rounded-lg border-2 ${
          !player.isPlayer1 ? 'border-purple-400 bg-purple-400/10' : 'border-gray-600 bg-gray-800'
        }`}>
          <div className="text-sm text-gray-400 mb-1">Player 2 (You)</div>
          <div className="text-3xl md:text-4xl font-bold text-purple-400">
            {scores.player2}
          </div>
        </div>
      </div>

      {/* Game Status */}
      {winner && (
        <div className="text-center mb-4">
          <div className="text-2xl md:text-3xl font-bold mb-4">
            {winner === 'player1' 
              ? (player.isPlayer1 ? '🎉 You Win!' : '😔 You Lose!') 
              : (player.isPlayer1 ? '😔 You Lose!' : '🎉 You Win!')
            }
          </div>
          <Button 
            onClick={onRestart} 
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700"
          >
            Play Again
          </Button>
        </div>
      )}

      {!gameActive && !winner && (
        <div className="text-center text-xl text-gray-400">
          Get ready...
        </div>
      )}
    </div>
  );
};

export default GameUI;
