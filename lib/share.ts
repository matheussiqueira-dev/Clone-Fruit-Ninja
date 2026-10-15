// Shareable results and challenge links. Pure: the UI decides between Web Share and the clipboard.
import { isDayKey } from './engine/rng';
import { formatInteger, formatPercent } from './stats';
import { PRODUCT_NAME } from '../config/project';

export const CHALLENGE_PARAM = 'desafio';

// A shared link may carry a past challenge day; the future, malformed dates and anything
// else fall back to today, so a link can never seed an arbitrary run.
export const readChallengeDay = (search: string, today: string): string | null => {
  const value = new URLSearchParams(search).get(CHALLENGE_PARAM);
  if (value === null) return null;
  if (!isDayKey(value) || value > today) return today;
  return value;
};

export const buildShareUrl = (origin: string, day?: string): string => {
  const url = new URL('/', origin);
  if (day && isDayKey(day)) url.searchParams.set(CHALLENGE_PARAM, day);
  return url.toString();
};

// "15/10" from "2026-10-15", for short human-facing labels.
export const formatDayShort = (day: string): string => {
  const [, month, date] = day.split('-');
  return `${date}/${month}`;
};

export interface ShareResult {
  score: number;
  accuracy: number;
  maxCombo: number;
  day?: string;
}

export const buildShareText = ({ score, accuracy, maxCombo, day }: ShareResult): string => {
  const what = day ? `no desafio de ${formatDayShort(day)} do ${PRODUCT_NAME}` : `no ${PRODUCT_NAME}`;
  const details = `${formatPercent(accuracy)} de precisão, combo x${Math.max(1, maxCombo)}`;
  const call = day ? 'Consegue passar?' : 'Consegue me vencer?';
  return `Fiz ${formatInteger(score)} pontos ${what} (${details}). ${call}`;
};
