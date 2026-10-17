// Game art palette: the only place with literal colours and glyphs for the canvas artwork.
// Every target is drawn from an emoji (see FRUIT_ART / SPECIAL_ART); the colours paint the juice,
// the cut face of the halves and the drops. UI colours never live here: the shell uses ms-tokens,
// and canvas marks that read as interface (hand skeleton, blade, alert ring) are read from the
// tokens at runtime (see readCanvasTokens).

export type FruitKind =
  | 'apple'
  | 'orange'
  | 'watermelon'
  | 'banana'
  | 'pineapple'
  | 'strawberry'
  | 'kiwi'
  | 'peach'
  | 'lemon'
  | 'coconut'
  | 'pear'
  | 'grapes';
export type SpecialKind = 'bomb' | 'heart';
export type ArtKind = FruitKind | SpecialKind;

interface FruitArt {
  emoji: string;
  // Colour of the juice, the drops and the cut face.
  flesh: string;
  label: string;
}

export const FRUIT_ART: Record<FruitKind, FruitArt> = {
  apple: { emoji: '🍎', flesh: '#f6e7b8', label: 'Maçã' },
  orange: { emoji: '🍊', flesh: '#ffb347', label: 'Laranja' },
  watermelon: { emoji: '🍉', flesh: '#ff5c6c', label: 'Melancia' },
  banana: { emoji: '🍌', flesh: '#fff1a8', label: 'Banana' },
  pineapple: { emoji: '🍍', flesh: '#ffd84d', label: 'Abacaxi' },
  strawberry: { emoji: '🍓', flesh: '#ff4d6d', label: 'Morango' },
  kiwi: { emoji: '🥝', flesh: '#9bd34a', label: 'Kiwi' },
  peach: { emoji: '🍑', flesh: '#ffb08a', label: 'Pêssego' },
  lemon: { emoji: '🍋', flesh: '#fff27a', label: 'Limão' },
  coconut: { emoji: '🥥', flesh: '#fbf6ee', label: 'Coco' },
  pear: { emoji: '🍐', flesh: '#e8f0a0', label: 'Pera' },
  grapes: { emoji: '🍇', flesh: '#b06ad9', label: 'Uva' }
};

export const FRUIT_KINDS: FruitKind[] = Object.keys(FRUIT_ART) as FruitKind[];

export const SPECIAL_ART: Record<SpecialKind, FruitArt> = {
  bomb: { emoji: '💣', flesh: '#ff8f70', label: 'Bomba' },
  heart: { emoji: '💖', flesh: '#ff7ab8', label: 'Coração' }
};

export const artFor = (kind: ArtKind): FruitArt =>
  kind === 'bomb' || kind === 'heart' ? SPECIAL_ART[kind] : FRUIT_ART[kind];

export const EMOJI_FONT_STACK =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Twemoji Mozilla", "EmojiOne Color", sans-serif';

export interface CanvasTokens {
  blade: string;
  skeleton: string;
  halo: string;
  alert: string;
  success: string;
}

const FALLBACK_TOKENS: CanvasTokens = {
  blade: 'rgb(228, 231, 236)',
  skeleton: 'rgb(228, 231, 236)',
  halo: 'rgba(4, 6, 8, 0.72)',
  alert: 'rgb(255, 143, 112)',
  success: 'rgb(255, 122, 184)'
};

export const readCanvasTokens = (): CanvasTokens => {
  if (typeof window === 'undefined') return FALLBACK_TOKENS;
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    blade: read('--ms-text', FALLBACK_TOKENS.blade),
    skeleton: read('--ms-text', FALLBACK_TOKENS.skeleton),
    halo: read('--ms-media-halo', FALLBACK_TOKENS.halo),
    alert: read('--ms-danger', FALLBACK_TOKENS.alert),
    success: FALLBACK_TOKENS.success
  };
};
