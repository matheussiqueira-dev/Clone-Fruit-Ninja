import { useEffect, useState } from 'react';

interface WindowSize {
  width: number;
  height: number;
}

const getWindowSize = (): WindowSize => {
  if (typeof window === 'undefined') {
    return { width: 1280, height: 720 };
  }
  return { width: window.innerWidth, height: window.innerHeight };
};

export const useWindowSize = () => {
  const [size, setSize] = useState<WindowSize>(getWindowSize);

  useEffect(() => {
    let resizeFrame: number | null = null;
    const handleResize = () => {
      if (resizeFrame !== null) return;
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        setSize(getWindowSize());
      });
    };
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
    };
  }, []);

  return size;
};
