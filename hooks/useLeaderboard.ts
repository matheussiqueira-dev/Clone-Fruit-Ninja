import { useCallback, useEffect, useState } from 'react';
import { LEADERBOARD_LIMIT } from '../config/gameConfig';
import { LeaderboardEntry, LeaderboardSubmission } from '../types';
import { fetchLeaderboard, submitLeaderboardScore } from '../services/leaderboardService';

interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  submit: (payload: LeaderboardSubmission) => Promise<void>;
}

export const useLeaderboard = (): UseLeaderboardResult => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const nextEntries = await fetchLeaderboard(LEADERBOARD_LIMIT);
      setEntries(nextEntries);
    } catch (refreshError) {
      console.error('Leaderboard refresh failed:', refreshError);
      setError('Não foi possível carregar o ranking agora.');
    } finally {
      setLoading(false);
    }
  }, []);

  const submit = useCallback(async (payload: LeaderboardSubmission) => {
    setSubmitting(true);
    setError(null);

    try {
      const nextEntries = await submitLeaderboardScore(payload);
      setEntries(nextEntries.slice(0, LEADERBOARD_LIMIT));
    } catch (submitError) {
      console.error('Leaderboard submit failed:', submitError);
      setError('Não foi possível salvar seu resultado agora.');
      throw submitError;
    } finally {
      setSubmitting(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    entries,
    loading,
    submitting,
    error,
    refresh,
    submit
  };
};
