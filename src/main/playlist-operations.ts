/**
 * Playlist operations service
 * Handles bulk operations: delete, merge, rename, etc.
 */

import SpotifyWebApi from 'spotify-web-api-node';
import { PlaylistDatabase } from './database';
import type { LocalPlaylist } from '@shared/types';

export class PlaylistOperations {
  constructor(
    private spotifyApi: SpotifyWebApi,
    private database: PlaylistDatabase
  ) {}

  /**
   * Delete playlists by ID
   * Only allows deletion of playlists owned by the user
   */
  async deletePlaylists(playlistIds: string[]): Promise<{
    success: boolean;
    deleted: number;
    failed: string[];
    error?: string;
  }> {
    if (playlistIds.length === 0) {
      return {
        success: false,
        deleted: 0,
        failed: [],
        error: 'No playlists selected',
      };
    }

    const deleted: string[] = [];
    const failed: string[] = [];

    // Get playlists from database to check ownership
    const allPlaylists = this.database.getAllPlaylists();
    const playlistsToDelete = allPlaylists.filter((p) =>
      playlistIds.includes(p.spotify_id)
    );

    // Check if any are not owned
    const notOwned = playlistsToDelete.filter((p) => !p.is_owner);
    if (notOwned.length > 0) {
      return {
        success: false,
        deleted: 0,
        failed: notOwned.map((p) => p.spotify_id),
        error: `Cannot delete ${notOwned.length} playlist(s) you don't own`,
      };
    }

    // Delete each playlist
    for (const playlist of playlistsToDelete) {
      try {
        // Call Spotify API to unfollow (delete) playlist
        await this.spotifyApi.unfollowPlaylist(playlist.spotify_id);

        // Remove from local database
        this.database.deletePlaylist(playlist.spotify_id);

        deleted.push(playlist.spotify_id);
      } catch (error) {
        console.error(`Failed to delete playlist ${playlist.spotify_id}:`, error);
        failed.push(playlist.spotify_id);
      }
    }

    // Log operation to history
    this.database.logOperation({
      timestamp: Date.now(),
      operation_type: 'delete',
      playlists_affected: JSON.stringify(deleted),
      details: JSON.stringify({
        total: playlistIds.length,
        deleted: deleted.length,
        failed: failed.length,
      }),
      can_undo: false, // Spotify API doesn't support playlist recovery
    });

    return {
      success: failed.length === 0,
      deleted: deleted.length,
      failed,
      error: failed.length > 0 ? `Failed to delete ${failed.length} playlist(s)` : undefined,
    };
  }

  /**
   * Get details for playlists to be deleted (for confirmation dialog)
   */
  getPlaylistDetails(playlistIds: string[]): LocalPlaylist[] {
    const allPlaylists = this.database.getAllPlaylists();
    return allPlaylists.filter((p) => playlistIds.includes(p.spotify_id));
  }

  /**
   * Merge multiple playlists into one
   */
  async mergePlaylists(
    playlistIds: string[],
    targetName: string,
    removeDuplicates: boolean,
    deleteSource: boolean
  ): Promise<{
    success: boolean;
    playlistId?: string;
    trackCount?: number;
    error?: string;
  }> {
    if (playlistIds.length < 2) {
      return {
        success: false,
        error: 'Select at least 2 playlists to merge',
      };
    }

    if (!targetName.trim()) {
      return {
        success: false,
        error: 'Target playlist name is required',
      };
    }

    try {
      console.log(`[Merge] Starting merge of ${playlistIds.length} playlists...`);

      // Get current user ID
      const userResponse = await this.spotifyApi.getMe();
      const userId = userResponse.body.id;

      // Fetch all tracks from source playlists
      const allTrackUris: string[] = [];
      const trackUrisSeen = new Set<string>();

      for (const playlistId of playlistIds) {
        console.log(`[Merge] Fetching tracks from playlist ${playlistId}...`);
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
          const response = await this.spotifyApi.getPlaylistTracks(playlistId, {
            offset,
            limit,
          });

          const items = response.body.items;
          if (items.length === 0) {
            hasMore = false;
            break;
          }

          for (const item of items) {
            if (item.track && item.track.uri) {
              const uri = item.track.uri;

              if (removeDuplicates) {
                // Only add if not seen before
                if (!trackUrisSeen.has(uri)) {
                  allTrackUris.push(uri);
                  trackUrisSeen.add(uri);
                }
              } else {
                // Add all tracks
                allTrackUris.push(uri);
              }
            }
          }

          offset += limit;
          hasMore = response.body.next !== null;
        }
      }

      console.log(
        `[Merge] Collected ${allTrackUris.length} tracks (duplicates ${removeDuplicates ? 'removed' : 'kept'})`
      );

      // Create new playlist
      console.log(`[Merge] Creating new playlist "${targetName}"...`);
      const createResponse = await this.spotifyApi.createPlaylist(targetName, {
        description: `Merged from ${playlistIds.length} playlists`,
        public: false,
      });

      const newPlaylistId = createResponse.body.id;
      console.log(`[Merge] Created playlist ${newPlaylistId}`);

      // Add tracks in batches of 100 (Spotify API limit)
      const batchSize = 100;
      const batches = Math.ceil(allTrackUris.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, allTrackUris.length);
        const batch = allTrackUris.slice(start, end);

        console.log(`[Merge] Adding batch ${i + 1}/${batches} (${batch.length} tracks)...`);
        await this.spotifyApi.addTracksToPlaylist(newPlaylistId, batch);
      }

      console.log(`[Merge] Successfully added ${allTrackUris.length} tracks`);

      // Delete source playlists if requested
      if (deleteSource) {
        console.log('[Merge] Deleting source playlists...');
        const deleteResult = await this.deletePlaylists(playlistIds);
        if (!deleteResult.success) {
          console.warn('[Merge] Some source playlists failed to delete:', deleteResult.error);
        }
      }

      // Log operation to history
      this.database.logOperation({
        timestamp: Date.now(),
        operation_type: 'merge',
        playlists_affected: JSON.stringify([...playlistIds, newPlaylistId]),
        details: JSON.stringify({
          source_playlists: playlistIds,
          target_playlist: newPlaylistId,
          target_name: targetName,
          track_count: allTrackUris.length,
          remove_duplicates: removeDuplicates,
          delete_source: deleteSource,
        }),
        can_undo: false,
      });

      console.log('[Merge] Merge completed successfully');

      return {
        success: true,
        playlistId: newPlaylistId,
        trackCount: allTrackUris.length,
      };
    } catch (error) {
      console.error('[Merge] Merge failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to merge playlists',
      };
    }
  }
}
