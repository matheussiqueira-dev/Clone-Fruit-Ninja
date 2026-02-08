import { useEffect, type MutableRefObject } from 'react';
import { GameState, VisionResult } from '../types';

interface PointerTrackingParams {
  enabled: boolean;
  gameStateRef: MutableRefObject<GameState>;
  handPositionRef: MutableRefObject<VisionResult | null>;
}

export const usePointerTracking = ({ enabled, gameStateRef, handPositionRef }: PointerTrackingParams) => {
  useEffect(() => {
    if (!enabled) return;

    const updatePointer = (event: PointerEvent) => {
      if (gameStateRef.current !== GameState.PLAYING) return;
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;

      handPositionRef.current = {
        x: event.clientX / width,
        y: event.clientY / height
      };
    };

    const clearPointer = () => {
      handPositionRef.current = null;
    };

    window.addEventListener('pointermove', updatePointer);
    window.addEventListener('pointerdown', updatePointer);
    window.addEventListener('blur', clearPointer);
    window.addEventListener('mouseleave', clearPointer);

    return () => {
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('pointerdown', updatePointer);
      window.removeEventListener('blur', clearPointer);
      window.removeEventListener('mouseleave', clearPointer);
    };
  }, [enabled, gameStateRef, handPositionRef]);
};

