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
}
