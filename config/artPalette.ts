// Game art palette ("ink on lacquer"): the only place with literal colours for the canvas artwork.
// UI colours never live here: the shell uses ms-tokens, and canvas marks that read as interface
// (hand skeleton, blade, bomb alert ring) are read from the tokens at runtime (see readCanvasTokens).

export type FruitKind = 'apple' | 'orange' | 'watermelon';
export type ArtKind = FruitKind | 'bomb';

interface FruitArt {
  skin: string;
  flesh: string;
  stem: string;
}

export const FRUIT_ART: Record<FruitKind, FruitArt> = {
  apple: { skin: '#b8432f', flesh: '#f2e2c0', stem: '#4a3322' },
  orange: { skin: '#d9822b', flesh: '#f4c065', stem: '#3d5a2a' },
  watermelon: { skin: '#3e7a4c', flesh: '#e0565a', stem: '#2b4a32' }
};

export const FRUIT_KINDS: FruitKind[] = ['apple', 'orange', 'watermelon'];

export const BOMB_ART = {
  body: '#1d2026',
  highlight: '#2c3038',
  fuse: '#8a6a45',
  spark: '#f5c56d'
};

export interface CanvasTokens {
  blade: string;
  skeleton: string;
  halo: string;
  alert: string;
}

const FALLBACK_TOKENS: CanvasTokens = {
  blade: 'rgb(228, 231, 236)',
  skeleton: 'rgb(228, 231, 236)',
  halo: 'rgba(4, 6, 8, 0.72)',
  alert: 'rgb(255, 143, 112)'
};

export const readCanvasTokens = (): CanvasTokens => {
  if (typeof window === 'undefined') return FALLBACK_TOKENS;
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    blade: read('--ms-text', FALLBACK_TOKENS.blade),
    skeleton: read('--ms-text', FALLBACK_TOKENS.skeleton),
    halo: read('--ms-media-halo', FALLBACK_TOKENS.halo),
    alert: read('--ms-danger', FALLBACK_TOKENS.alert)
  };
};
