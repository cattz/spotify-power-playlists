/**
 * Custom hook for managing playlist data
 */

import { useState, useEffect, useCallback } from 'react';
import type { LocalPlaylist } from '@shared/types';

interface UsePlaylistsReturn {
  playlists: LocalPlaylist[];
  loading: boolean;
  error: string | null;
  syncing: boolean;
  syncPlaylists: () => Promise<void>;
  refreshPlaylists: () => Promise<void>;
}

export function usePlaylists(): UsePlaylistsReturn {
  const [playlists, setPlaylists] = useState<LocalPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  /**
   * Load playlists from local database
   */
  const refreshPlaylists = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await window.electronAPI.database.getPlaylists();

      if (result.success && result.data) {
        setPlaylists(result.data);
      } else {
        setError(result.error || 'Failed to load playlists');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load playlists');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Sync playlists from Spotify
   */
  const syncPlaylists = useCallback(async () => {
    try {
      setSyncing(true);
      setError(null);

      const result = await window.electronAPI.playlists.sync();

      if (result.success && result.data) {
        console.log(`Synced ${result.data.synced} of ${result.data.total} playlists`);
        // Refresh local data after sync
        await refreshPlaylists();
      } else {
        setError(result.error || 'Failed to sync playlists');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to sync playlists');
    } finally {
      setSyncing(false);
    }
  }, [refreshPlaylists]);

  // Load playlists on mount
  useEffect(() => {
    refreshPlaylists();
  }, [refreshPlaylists]);

  return {
    playlists,
    loading,
    error,
    syncing,
    syncPlaylists,
    refreshPlaylists,
  };
}
