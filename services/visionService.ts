import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";
import { VisionResult } from '../types';

const BASE_URL = (import.meta.env.BASE_URL ?? "/").replace(/\/?$/, "/");
const VISION_BASE_PATH = `${BASE_URL}vision/wasm`;
const HAND_MODEL_PATH = `${BASE_URL}vision/models/hand_landmarker.task`;

let handLandmarker: HandLandmarker | undefined;
let lastVideoTime = -1;

export const initializeVision = async (): Promise<void> => {
  if (handLandmarker) return;

  try {
    const vision = await FilesetResolver.forVisionTasks(VISION_BASE_PATH);
    handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: HAND_MODEL_PATH,
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numHands: 1
    });
  } catch (error) {
    console.error("Failed to initialize vision:", error);
    throw error;
  }
};

export const detectHands = (video: HTMLVideoElement): VisionResult | null | undefined => {
  if (!handLandmarker || !video.videoWidth) return undefined;

  const nowInMs = performance.now();
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const results = handLandmarker.detectForVideo(video, nowInMs);

    if (results.landmarks && results.landmarks.length > 0) {
      // Map all landmarks and mirror X
      const rawLandmarks = results.landmarks[0];
      const landmarks = rawLandmarks.map(l => ({
        x: 1 - l.x,
        y: l.y
      }));

      // Get the index finger tip (landmark 8)
      const indexTip = landmarks[8];
      
      return {
        x: indexTip.x,
        y: indexTip.y,
        landmarks: landmarks
      };
    }
    return null; // Frame processed but no hands found
  }
  return undefined; // No new frame to process
};
