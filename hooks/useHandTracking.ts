import { useEffect, type MutableRefObject } from 'react';
import { InputMode, VisionResult } from '../types';
import { detectHands } from '../services/visionService';

interface HandTrackingParams {
  enabled: boolean;
  mirror: boolean;
  inputMode: InputMode;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  handPositionRef: MutableRefObject<VisionResult | null>;
}

export const useHandTracking = ({
  enabled,
  mirror,
  inputMode,
  videoRef,
  handPositionRef
}: HandTrackingParams) => {
  useEffect(() => {
    if (!enabled || inputMode !== 'camera') {
      return;
    }

    let animationFrameId: number | null = null;
    let videoFrameId: number | null = null;
    let cancelled = false;

    const processFrame = () => {
      if (cancelled) return;

      const video = videoRef.current;
      if (video) {
        const result = detectHands(video, { mirror });
        if (result !== undefined) {
          handPositionRef.current = result ?? null;
        }
      }

      schedule();
    };

    const schedule = () => {
      if (!videoRef.current) {
        animationFrameId = requestAnimationFrame(processFrame);
        return;
      }

      if ('requestVideoFrameCallback' in videoRef.current) {
        videoFrameId = videoRef.current.requestVideoFrameCallback(() => processFrame());
        return;
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };

    schedule();

    return () => {
      cancelled = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (videoFrameId !== null && videoRef.current?.cancelVideoFrameCallback) {
        videoRef.current.cancelVideoFrameCallback(videoFrameId);
      }
    };
  }, [enabled, mirror, inputMode, videoRef, handPositionRef]);
};

