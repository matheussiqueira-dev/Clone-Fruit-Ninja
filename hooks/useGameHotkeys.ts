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

// Radios, checkboxes and buttons are not typing: shortcuts must keep working after picking a mode.
const NON_TEXT_INPUT_TYPES = new Set(['radio', 'checkbox', 'button', 'submit', 'reset', 'range', 'color']);

const isTypingContext = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement) return !NON_TEXT_INPUT_TYPES.has(target.type);
  return target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target.isContentEditable;
};

// Enter on a focused button activates that button; the global shortcut must not fire a second action.
const isActivatableControl = (target: EventTarget | null) =>
  target instanceof HTMLButtonElement || target instanceof HTMLAnchorElement;

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

      if (event.key === 'Enter' && !isActivatableControl(event.target)) {
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
