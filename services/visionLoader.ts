// Loads the MediaPipe vision module on first use, so mouse-only players never download it.
type VisionModule = typeof import('./visionService');

let pending: Promise<VisionModule> | null = null;
let loaded: VisionModule | null = null;

export const loadVision = (): Promise<VisionModule> => {
  if (!pending) {
    pending = import('./visionService')
      .then((module) => {
        loaded = module;
        return module;
      })
      .catch((error: unknown) => {
        // Let the next attempt retry (e.g. after a network blip) instead of caching the failure.
        pending = null;
        throw error;
      });
  }
  return pending;
};

// The module if it has already loaded; used on teardown, where loading it just to dispose makes no sense.
export const getLoadedVision = (): VisionModule | null => loaded;
