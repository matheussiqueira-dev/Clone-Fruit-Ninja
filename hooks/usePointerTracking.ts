import { useEffect, type MutableRefObject, type RefObject } from 'react';
import { GameState, VisionResult } from '../types';

interface PointerTrackingParams {
  enabled: boolean;
  gameStateRef: MutableRefObject<GameState>;
  handPositionRef: MutableRefObject<VisionResult | null>;
  stageRef: RefObject<HTMLElement | null>;
}

// Normalises the pointer to the game stage (0-1 on each axis), the same space the hand tracker uses.
export const usePointerTracking = ({ enabled, gameStateRef, handPositionRef, stageRef }: PointerTrackingParams) => {
  useEffect(() => {
    if (!enabled) return;

    const updatePointer = (event: PointerEvent) => {
      if (gameStateRef.current !== GameState.PLAYING) return;
      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      handPositionRef.current = {
        x: (event.clientX - rect.left) / rect.width,
        y: (event.clientY - rect.top) / rect.height
      };
    };

    const clearPointer = () => {
      handPositionRef.current = null;
    };

    window.addEventListener('pointermove', updatePointer);
    window.addEventListener('pointerdown', updatePointer);
    window.addEventListener('pointerup', updatePointer);
    window.addEventListener('blur', clearPointer);
    document.documentElement.addEventListener('mouseleave', clearPointer);

    return () => {
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('pointerdown', updatePointer);
      window.removeEventListener('pointerup', updatePointer);
      window.removeEventListener('blur', clearPointer);
      document.documentElement.removeEventListener('mouseleave', clearPointer);
    };
  }, [enabled, gameStateRef, handPositionRef, stageRef]);
};
