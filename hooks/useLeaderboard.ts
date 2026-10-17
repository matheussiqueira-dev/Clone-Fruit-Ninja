import { useCallback, useEffect, useState } from 'react';
import { LEADERBOARD_LIMIT } from '../config/gameConfig';
import { LeaderboardEntry, LeaderboardScope, LeaderboardSubmission } from '../types';
import {
  fetchLeaderboard,
  getLeaderboardScope,
  submitLeaderboardScore
} from '../services/leaderboardService';

interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  // 'remote' only when an API is configured; otherwise results live in this browser.
  scope: LeaderboardScope;
  loading: boolean;
  submitting: boolean;
  // True when a configured API failed and the list fell back to this browser.
  remoteUnavailable: boolean;
  refresh: () => Promise<void>;
  submit: (payload: LeaderboardSubmission) => Promise<LeaderboardScope>;
}

export const useLeaderboard = (): UseLeaderboardResult => {
  const [scope] = useState<LeaderboardScope>(getLeaderboardScope);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [remoteUnavailable, setRemoteUnavailable] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchLeaderboard(LEADERBOARD_LIMIT);
      setEntries(result.entries);
      setRemoteUnavailable(scope === 'remote' && result.source === 'local');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  const submit = useCallback(
    async (payload: LeaderboardSubmission) => {
      setSubmitting(true);
      try {
        const result = await submitLeaderboardScore(payload);
        setEntries(result.entries.slice(0, LEADERBOARD_LIMIT));
        setRemoteUnavailable(scope === 'remote' && result.source === 'local');
        return result.source;
      } finally {
        setSubmitting(false);
      }
    },
    [scope]
  );

  // First load: loading already starts true, so only the result is set, and a late answer after
  // unmount (or a scope change) is dropped.
  useEffect(() => {
    let active = true;
    void fetchLeaderboard(LEADERBOARD_LIMIT).then((result) => {
      if (!active) return;
      setEntries(result.entries);
      setRemoteUnavailable(scope === 'remote' && result.source === 'local');
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [scope]);

  return {
    entries,
    scope,
    loading,
    submitting,
    remoteUnavailable,
    refresh,
    submit
  };
};
