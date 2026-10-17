import { useEffect, useState, type RefObject } from 'react';

interface ElementSize {
  width: number;
  height: number;
}

// Tracks an element's content box, so the game stage is measured between the header, HUD and footer
// instead of assuming the whole window.
export const useElementSize = (ref: RefObject<HTMLElement | null>): ElementSize => {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const update = () => {
      const rect = element.getBoundingClientRect();
      const next = { width: Math.round(rect.width), height: Math.round(rect.height) };
      setSize((current) => (current.width === next.width && current.height === next.height ? current : next));
    };

    update();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return size;
};
