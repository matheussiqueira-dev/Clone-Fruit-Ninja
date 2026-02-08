import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { CameraStatus } from '../types';
import { disposeVision, initializeVision } from '../services/visionService';
import { VIDEO_CONSTRAINTS } from '../config/gameConfig';

interface CameraController {
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  cameraStatus: CameraStatus;
  cameraError: string | null;
  prepareCamera: () => Promise<boolean>;
  stopCamera: () => void;
  clearCameraError: () => void;
  markCameraIdle: () => void;
}

export const useCameraController = (): CameraController => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const clearCameraError = useCallback(() => {
    setCameraError(null);
  }, []);

  const markCameraIdle = useCallback(() => {
    setCameraStatus('idle');
  }, []);

  const prepareCamera = useCallback(async () => {
    if (cameraStatus === 'loading' || cameraStatus === 'ready') {
      return cameraStatus === 'ready';
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Câmera não suportada neste navegador.');
      setCameraStatus('error');
      return false;
    }

    setCameraStatus('loading');
    setCameraError(null);

    try {
      await initializeVision();
      const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
      cameraStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        if (videoRef.current.readyState < 2) {
          await new Promise<void>((resolve) => {
            if (!videoRef.current) {
              resolve();
              return;
            }
            videoRef.current.addEventListener('loadeddata', () => resolve(), { once: true });
          });
        }

        await videoRef.current.play().catch(() => undefined);
      }

      setCameraStatus('ready');
      return true;
    } catch (error) {
      console.error('Camera setup failed:', error);
      stopCamera();
      setCameraError('Permita o acesso à câmera para jogar.');
      setCameraStatus('error');
      return false;
    }
  }, [cameraStatus, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      disposeVision();
    };
  }, [stopCamera]);

  return {
    videoRef,
    cameraStatus,
    cameraError,
    prepareCamera,
    stopCamera,
    clearCameraError,
    markCameraIdle
  };
};

