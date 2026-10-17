import { useEffect, type MutableRefObject } from 'react';
import { InputMode, VisionResult } from '../types';
import { getLoadedVision, loadVision } from '../services/visionLoader';

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
    // The element that owns videoFrameId: the ref may point elsewhere by cleanup time.
    let videoFrameOwner: HTMLVideoElement | null = null;
    let cancelled = false;
    let detectHands: NonNullable<ReturnType<typeof getLoadedVision>>['detectHands'] | null = null;

    const processFrame = () => {
      if (cancelled || !detectHands) return;

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
        videoFrameOwner = videoRef.current;
        videoFrameId = videoFrameOwner.requestVideoFrameCallback(() => processFrame());
        return;
      }

      animationFrameId = requestAnimationFrame(processFrame);
    };

    // The camera controller loaded the module before the camera became ready; load it here only as a fallback.
    const loaded = getLoadedVision();
    if (loaded) {
      detectHands = loaded.detectHands;
      schedule();
    } else {
      loadVision()
        .then((vision) => {
          if (cancelled) return;
          detectHands = vision.detectHands;
          schedule();
        })
        .catch((error: unknown) => console.error('Hand tracking could not start:', error));
    }

    return () => {
      cancelled = true;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (videoFrameId !== null && videoFrameOwner?.cancelVideoFrameCallback) {
        videoFrameOwner.cancelVideoFrameCallback(videoFrameId);
      }
    };
  }, [enabled, mirror, inputMode, videoRef, handPositionRef]);
};
