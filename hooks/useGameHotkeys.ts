import { useEffect } from 'react';
import { GameState, InputMode } from '../types';

interface HotkeysParams {
  gameState: GameState;
  inputMode: InputMode;
  onStart: () => void;
  onRestart: () => void;
  onInputModeChange: (mode: InputMode) => void;
  onRefreshLeaderboard: () => void;
}

const isTypingContext = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
};

export const useGameHotkeys = ({
  gameState,
  inputMode,
  onStart,
  onRestart,
  onInputModeChange,
  onRefreshLeaderboard
}: HotkeysParams) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingContext(event.target)) return;

      if (event.key === 'Enter') {
        if (gameState === GameState.MENU) {
          event.preventDefault();
          onStart();
          return;
        }

        if (gameState === GameState.GAME_OVER) {
          event.preventDefault();
          onRestart();
          return;
        }
      }

      if (event.key.toLowerCase() === 'm' && gameState === GameState.MENU) {
        event.preventDefault();
        onInputModeChange(inputMode === 'camera' ? 'pointer' : 'camera');
      }

      if (event.key.toLowerCase() === 'r' && (gameState === GameState.MENU || gameState === GameState.GAME_OVER)) {
        event.preventDefault();
        onRefreshLeaderboard();
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [gameState, inputMode, onInputModeChange, onRefreshLeaderboard, onRestart, onStart]);
};
