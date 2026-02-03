import React from 'react';
import { GameState } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  score: number;
  senseiWisdom: string;
  cameraError: string | null;
  onStart: () => void;
  onRestart: () => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({ 
  gameState, 
  score, 
  senseiWisdom,
  cameraError,
  onStart, 
  onRestart 
}) => {
  return (
    <div className="absolute top-0 left-0 w-full h-full z-20 flex flex-col justify-between pointer-events-none">
      
      {/* Header / Score */}
      <div className="p-6 flex justify-between items-start">
        <div className="bg-black/50 backdrop-blur-md p-4 rounded-xl border border-white/10 text-white pointer-events-auto shadow-2xl">
          <h1 className="text-3xl font-ninja text-yellow-400 tracking-wider">Fruit Ninja</h1>
        </div>
        
        {gameState === GameState.PLAYING && (
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-full border border-white/20">
             <span className="text-4xl font-bold text-white drop-shadow-lg">{score}</span>
          </div>
        )}
      </div>

      {cameraError && (
        <div className="px-6 pointer-events-auto">
          <div className="bg-red-600/80 text-white px-4 py-3 rounded-lg border border-red-400/60 shadow-lg text-sm">
            {cameraError}
          </div>
        </div>
      )}

      {/* Main Center Content */}
      <div className="flex-1 flex items-center justify-center pointer-events-auto">
        
        {gameState === GameState.LOADING && (
           <div className="text-center space-y-4 animate-pulse">
             <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
             <p className="text-white text-xl font-medium tracking-widest">CALIBRATING KATANA...</p>
           </div>
        )}

        {gameState === GameState.MENU && (
          <div className="text-center space-y-6 bg-black/60 p-12 rounded-2xl border border-yellow-500/30 backdrop-blur-sm shadow-[0_0_50px_rgba(234,179,8,0.2)]">
            <h2 className="text-6xl font-ninja text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-8">
              Ready?
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-md mx-auto">
              Use sua mão para cortar as frutas. Evite as bombas pretas!
            </p>
            <button 
              onClick={onStart}
              disabled={Boolean(cameraError)}
              className="px-10 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-xl rounded-full transition-all duration-300 transform active:scale-95 hover:scale-105 hover:shadow-lg hover:shadow-green-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              INICIAR MISSÃO
            </button>
          </div>
        )}

        {gameState === GameState.GAME_OVER && (
          <div className="text-center space-y-6 bg-black/80 p-10 rounded-2xl border border-red-500/50 backdrop-blur-md max-w-lg w-full mx-4 shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
            <h2 className="text-5xl font-ninja text-red-500 mb-2">GAME OVER</h2>
            <div className="text-6xl font-bold text-white mb-6">{score}</div>
            
            <div className="bg-white/5 p-6 rounded-lg border-l-4 border-yellow-500 italic text-gray-300 min-h-[80px] flex items-center justify-center">
              "{senseiWisdom || 'Meditando...'}"
            </div>

            <button 
              onClick={onRestart}
              className="mt-6 px-8 py-3 bg-white text-black font-bold text-lg rounded-full hover:bg-gray-200 transition-colors shadow-lg hover:shadow-white/20"
            >
              Tentar Novamente
            </button>
          </div>
        )}
      </div>

      {/* Footer Request */}
      <div className="p-6 flex flex-col md:flex-row items-center justify-end gap-4 pointer-events-auto">
        <div className="bg-indigo-600 text-white px-4 py-2 rounded shadow-lg font-medium text-sm flex items-center">
           Projeto desenvolvido por Matheus Siqueira
        </div>
        <a 
          href="https://www.matheussiqueira.dev" 
          target="_blank" 
          rel="noopener noreferrer"
          className="bg-white text-indigo-900 hover:bg-indigo-50 px-4 py-2 rounded shadow-lg font-bold text-sm transition-colors flex items-center gap-2 group"
        >
          <span>Visitar Site</span>
          <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path></svg>
        </a>
      </div>
    </div>
  );
};

export default UIOverlay;
