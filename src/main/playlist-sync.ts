/**
 * Playlist sync service
 *
 * Handles fetching playlists from Spotify and syncing with local database
 */

import SpotifyWebApi from 'spotify-web-api-node';
import type { LocalPlaylist } from '@shared/types';
import { PlaylistDatabase } from './database';
import { SPOTIFY_API_LIMITS } from '@shared/constants';

export class PlaylistSyncService {
  constructor(
    private spotifyApi: SpotifyWebApi,
    private database: PlaylistDatabase
  ) {}

  /**
   * Sync all playlists from Spotify to local database
   */
  async syncAllPlaylists(): Promise<{ total: number; synced: number }> {
    let allPlaylists: LocalPlaylist[] = [];
    let offset = 0;
    const limit = SPOTIFY_API_LIMITS.PLAYLISTS_PER_REQUEST;
    let hasMore = true;

    // Fetch all playlists with pagination
    while (hasMore) {
      const response = await this.spotifyApi.getUserPlaylists({
        limit,
        offset,
      });

      const items = response.body.items;

      if (items.length === 0) {
        hasMore = false;
        break;
      }

      // Convert to local playlist format
      for (const item of items) {
        const localPlaylist = this.convertToLocalPlaylist(item);
        allPlaylists.push(localPlaylist);
      }

      offset += limit;
      hasMore = response.body.next !== null;
    }

    // Store in database
    for (const playlist of allPlaylists) {
      this.database.upsertPlaylist(playlist);
    }

    return {
      total: allPlaylists.length,
      synced: allPlaylists.length,
    };
  }

  /**
   * Sync detailed information for specific playlists
   */
  async syncPlaylistDetails(playlistIds: string[]): Promise<void> {
    // Fetch in batches to respect API limits
    const batches = this.chunkArray(playlistIds, SPOTIFY_API_LIMITS.MAX_CONCURRENT_REQUESTS);

    for (const batch of batches) {
      await Promise.all(
        batch.map(async (id) => {
          try {
            const response = await this.spotifyApi.getPlaylist(id);
            const playlist = response.body;

            // Calculate total duration
            let duration = 0;
            if (playlist.tracks.items) {
              for (const item of playlist.tracks.items) {
                if (item.track) {
                  duration += item.track.duration_ms || 0;
                }
              }
            }

            const localPlaylist = this.convertToLocalPlaylist(playlist, duration);
            this.database.upsertPlaylist(localPlaylist);
          } catch (error) {
            console.error(`Failed to sync playlist ${id}:`, error);
          }
        })
      );
    }
  }

  /**
   * Convert Spotify playlist to local format
   */
  private convertToLocalPlaylist(
    spotifyPlaylist: any,
    duration?: number
  ): LocalPlaylist {
    // Get current user ID from API
    const currentUserId = this.spotifyApi.getAccessToken() ? '' : ''; // Will be set properly
    const isOwner = spotifyPlaylist.owner?.id === currentUserId;

    return {
      spotify_id: spotifyPlaylist.id,
      name: spotifyPlaylist.name,
      owner: spotifyPlaylist.owner?.display_name || spotifyPlaylist.owner?.id || 'Unknown',
      track_count: spotifyPlaylist.tracks?.total || 0,
      duration_ms: duration || 0,
      followers: spotifyPlaylist.followers?.total || 0,
      is_owner: isOwner,
      created_at: '', // Spotify doesn't provide this
      modified_at: '', // Will use snapshot_id to detect changes
      tags: '',
      last_synced: Date.now(),
      snapshot_id: spotifyPlaylist.snapshot_id,
    };
  }

  /**
   * Get current user ID
   */
  async getCurrentUserId(): Promise<string> {
    const response = await this.spotifyApi.getMe();
    return response.body.id;
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
