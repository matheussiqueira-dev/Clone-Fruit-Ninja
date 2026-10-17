import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { CameraFailure, CameraStatus } from '../types';
import { getLoadedVision, loadVision } from '../services/visionLoader';
import { VIDEO_CONSTRAINTS } from '../config/gameConfig';
import { classifyCameraError, isCameraBusy } from '../lib/camera';

const VIDEO_START_TIMEOUT_MS = 8000;

interface CameraController {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  cameraStatus: CameraStatus;
  cameraFailure: CameraFailure | null;
  prepareCamera: () => Promise<boolean>;
  stopCamera: () => void;
  resetCamera: () => void;
}

// Resolves once the video has a frame; rejects with a TimeoutError if the device never delivers one.
const waitForVideoData = (video: HTMLVideoElement) =>
  new Promise<void>((resolve, reject) => {
    if (video.readyState >= 2) {
      resolve();
      return;
    }

    const timeout = window.setTimeout(() => {
      video.removeEventListener('loadeddata', onLoaded);
      reject(new DOMException('Video did not start in time.', 'TimeoutError'));
    }, VIDEO_START_TIMEOUT_MS);

    function onLoaded() {
      window.clearTimeout(timeout);
      resolve();
    }

    video.addEventListener('loadeddata', onLoaded, { once: true });
  });

export const useCameraController = (): CameraController => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraFailure, setCameraFailure] = useState<CameraFailure | null>(null);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const resetCamera = useCallback(() => {
    stopCamera();
    setCameraStatus('idle');
    setCameraFailure(null);
  }, [stopCamera]);

  const fail = useCallback(
    (failure: CameraFailure) => {
      stopCamera();
      setCameraFailure(failure);
      setCameraStatus('error');
    },
    [stopCamera]
  );

  const prepareCamera = useCallback(async () => {
    if (isCameraBusy(cameraStatus)) return false;
    if (cameraStatus === 'ready') return true;

    // Missing in insecure contexts (http on a LAN IP) and in browsers without camera support.
    if (!navigator.mediaDevices?.getUserMedia) {
      fail('unsupported');
      return false;
    }

    setCameraFailure(null);
    setCameraStatus('loading-model');

    // The hand model loads before the permission prompt, so a model failure never asks for the camera.
    try {
      const vision = await loadVision();
      await vision.initializeVision();
    } catch (error) {
      console.error('Hand model failed to load:', error);
      fail('model-error');
      return false;
    }

    setCameraStatus('requesting');

    try {
      const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
      cameraStreamRef.current = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await waitForVideoData(video);
        await video.play().catch(() => undefined);
      }

      setCameraStatus('ready');
      return true;
    } catch (error) {
      console.error('Camera setup failed:', error);
      fail(classifyCameraError(error));
      return false;
    }
  }, [cameraStatus, fail]);

  useEffect(() => {
    return () => {
      stopCamera();
      getLoadedVision()?.disposeVision();
    };
  }, [stopCamera]);

  return {
    videoRef,
    cameraStatus,
    cameraFailure,
    prepareCamera,
    stopCamera,
    resetCamera
  };
};
