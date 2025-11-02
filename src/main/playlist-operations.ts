/**
 * Playlist operations service
 * Handles bulk operations: delete, merge, rename, etc.
 */

import SpotifyWebApi from 'spotify-web-api-node';
import { PlaylistDatabase } from './database';
import type { LocalPlaylist } from '@shared/types';
import { app } from 'electron';
import { join } from 'path';
import { writeFileSync } from 'fs';

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
            // Skip null tracks (unlinked/unavailable)
            if (!item.track || !item.track.uri) {
              console.log(`[Merge] Skipping unlinked track in playlist ${playlistId}`);
              continue;
            }

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

          offset += limit;
          hasMore = response.body.next !== null;
        }
      }

      console.log(
        `[Merge] Collected ${allTrackUris.length} tracks (duplicates ${removeDuplicates ? 'removed' : 'kept'})`
      );

      // Validate all URIs are valid Spotify track URIs
      const validTrackUris = allTrackUris.filter((uri) => {
        const isValid = uri && uri.startsWith('spotify:track:') && uri.split(':').length === 3;
        if (!isValid) {
          console.log(`[Merge] Skipping invalid URI: ${uri}`);
        }
        return isValid;
      });

      if (validTrackUris.length === 0) {
        return {
          success: false,
          error: 'No valid tracks to merge (all tracks were unlinked or invalid)',
        };
      }

      console.log(
        `[Merge] Validated ${validTrackUris.length} track URIs (${allTrackUris.length - validTrackUris.length} invalid)`
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
      const batches = Math.ceil(validTrackUris.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, validTrackUris.length);
        const batch = validTrackUris.slice(start, end);

        console.log(`[Merge] Adding batch ${i + 1}/${batches} (${batch.length} tracks)...`);
        console.log(`[Merge] Sample URIs: ${batch.slice(0, 3).join(', ')}`);
        await this.spotifyApi.addTracksToPlaylist(newPlaylistId, batch);
      }

      console.log(`[Merge] Successfully added ${validTrackUris.length} tracks`);

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
          track_count: validTrackUris.length,
          remove_duplicates: removeDuplicates,
          delete_source: deleteSource,
        }),
        can_undo: false,
      });

      console.log('[Merge] Merge completed successfully');

      return {
        success: true,
        playlistId: newPlaylistId,
        trackCount: validTrackUris.length,
      };
    } catch (error) {
      console.error('[Merge] Merge failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to merge playlists',
      };
    }
  }

  /**
   * Fix broken/unlinked tracks in a playlist
   * Attempts to find replacement tracks by searching Spotify
   */
  async fixBrokenTracks(playlistId: string): Promise<{
    success: boolean;
    playlistId?: string;
    total?: number;
    recovered?: number;
    failed?: number;
    error?: string;
  }> {
    try {
      console.log(`[Fix Broken Tracks] Starting for playlist ${playlistId}`);

      // Get playlist details
      const playlistResponse = await this.spotifyApi.getPlaylist(playlistId);
      const playlist = playlistResponse.body;
      const playlistName = playlist.name;

      console.log(`[Fix Broken Tracks] Playlist: ${playlistName}`);

      // Fetch all tracks
      let allTracks: any[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.spotifyApi.getPlaylistTracks(playlistId, {
          offset,
          limit,
        });

        allTracks.push(...response.body.items);
        offset += limit;
        hasMore = response.body.next !== null;
      }

      console.log(`[Fix Broken Tracks] Found ${allTracks.length} total tracks`);

      // Identify unlinked tracks
      // Track can be unlinked in several ways:
      // 1. track is null
      // 2. track.id is null (removed from catalog)
      // 3. track.is_playable is false (regional restrictions or removed)
      // 4. track.uri is missing
      const unlinkedTracks = allTracks.filter((item) => {
        return (
          !item.track ||
          item.track.id === null ||
          item.track.is_playable === false ||
          !item.track.uri
        );
      });

      console.log(`[Fix Broken Tracks] Found ${unlinkedTracks.length} unlinked tracks`);

      if (unlinkedTracks.length === 0) {
        return {
          success: true,
          total: 0,
          recovered: 0,
          failed: 0,
        };
      }

      // Attempt to recover each unlinked track
      const recoveredUris: string[] = [];
      const failedTracks: Array<{
        trackName: string;
        artistName: string;
        uri: string;
        reason: string;
      }> = [];

      for (const item of unlinkedTracks) {
        // Try to extract track info from the item
        const trackName = item.track?.name || 'Unknown';
        const artistName =
          item.track?.artists?.[0]?.name || item.track?.album?.artists?.[0]?.name || 'Unknown';
        const uri = item.track?.uri || '';

        console.log(`[Fix Broken Tracks] Attempting to recover: "${trackName}" by ${artistName}`);

        if (trackName === 'Unknown' || artistName === 'Unknown') {
          console.log(`[Fix Broken Tracks] Insufficient info, skipping`);
          failedTracks.push({
            trackName,
            artistName,
            uri,
            reason: 'Insufficient metadata (track name or artist unknown)',
          });
          continue;
        }

        try {
          // Search Spotify for the track
          const searchQuery = `track:${trackName} artist:${artistName}`;
          const searchResponse = await this.spotifyApi.searchTracks(searchQuery, { limit: 10 });

          if (searchResponse.body.tracks && searchResponse.body.tracks.items.length > 0) {
            // Sort by popularity and take the most popular
            const results = searchResponse.body.tracks.items;
            results.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));

            const bestMatch = results[0];
            console.log(
              `[Fix Broken Tracks] ✓ Found match: "${bestMatch.name}" by ${bestMatch.artists[0].name} (popularity: ${bestMatch.popularity})`
            );

            recoveredUris.push(bestMatch.uri);
          } else {
            console.log(`[Fix Broken Tracks] ✗ No matches found`);
            failedTracks.push({
              trackName,
              artistName,
              uri,
              reason: 'No matches found on Spotify',
            });
          }
        } catch (error) {
          console.error(`[Fix Broken Tracks] Search failed:`, error);
          failedTracks.push({
            trackName,
            artistName,
            uri,
            reason: `Search error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          });
        }

        // Add a small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      console.log(
        `[Fix Broken Tracks] Recovery complete: ${recoveredUris.length} recovered, ${failedTracks.length} failed`
      );

      // Export failed tracks to CSV
      let exportFilePath: string | undefined;
      if (failedTracks.length > 0) {
        try {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
          const sanitizedPlaylistName = playlistName.replace(/[^a-z0-9]/gi, '_');
          const fileName = `${sanitizedPlaylistName}_failed_tracks_${timestamp}.csv`;
          exportFilePath = join(app.getPath('desktop'), fileName);

          // Create CSV content
          const csvHeader = 'Track Name,Artist Name,Original URI,Reason\n';
          const csvRows = failedTracks
            .map((track) => {
              // Escape commas and quotes in CSV
              const escapeCsv = (str: string) => {
                if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                  return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
              };

              return [
                escapeCsv(track.trackName),
                escapeCsv(track.artistName),
                escapeCsv(track.uri),
                escapeCsv(track.reason),
              ].join(',');
            })
            .join('\n');

          const csvContent = csvHeader + csvRows;
          writeFileSync(exportFilePath, csvContent, 'utf-8');

          console.log(`[Fix Broken Tracks] Exported ${failedTracks.length} failed tracks to: ${exportFilePath}`);
        } catch (error) {
          console.error('[Fix Broken Tracks] Failed to export CSV:', error);
          exportFilePath = undefined;
        }
      }

      if (recoveredUris.length === 0) {
        return {
          success: false,
          total: unlinkedTracks.length,
          recovered: 0,
          failed: failedTracks.length,
          error: 'No tracks could be recovered',
        };
      }

      // Create new playlist with recovered tracks
      const newPlaylistName = `${playlistName} - Recovered`;
      console.log(`[Fix Broken Tracks] Creating playlist "${newPlaylistName}"`);

      const createResponse = await this.spotifyApi.createPlaylist(newPlaylistName, {
        description: `Recovered ${recoveredUris.length} broken tracks from "${playlistName}"`,
        public: false,
      });

      const newPlaylistId = createResponse.body.id;

      // Add tracks in batches of 100
      const batchSize = 100;
      const batches = Math.ceil(recoveredUris.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, recoveredUris.length);
        const batch = recoveredUris.slice(start, end);

        await this.spotifyApi.addTracksToPlaylist(newPlaylistId, batch);
      }

      console.log(`[Fix Broken Tracks] ✓ Created playlist: ${newPlaylistId}`);

      return {
        success: true,
        playlistId: newPlaylistId,
        total: unlinkedTracks.length,
        recovered: recoveredUris.length,
        failed: failedTracks.length,
      };
    } catch (error) {
      console.error('[Fix Broken Tracks] Failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fix broken tracks',
      };
    }
  }

  /**
   * Remove duplicate tracks from a playlist
   * Creates a new playlist with only unique tracks (first occurrence kept)
   */
  async removeDuplicates(playlistId: string): Promise<{
    success: boolean;
    playlistId?: string;
    originalCount?: number;
    uniqueCount?: number;
    duplicatesRemoved?: number;
    error?: string;
  }> {
    try {
      console.log(`[Remove Duplicates] Starting for playlist ${playlistId}`);

      // Get playlist details
      const playlistResponse = await this.spotifyApi.getPlaylist(playlistId);
      const playlist = playlistResponse.body;
      const playlistName = playlist.name;

      console.log(`[Remove Duplicates] Playlist: ${playlistName}`);

      // Fetch all tracks
      let allTracks: any[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const response = await this.spotifyApi.getPlaylistTracks(playlistId, {
          offset,
          limit,
        });

        allTracks.push(...response.body.items);
        offset += limit;
        hasMore = response.body.next !== null;
      }

      console.log(`[Remove Duplicates] Found ${allTracks.length} total tracks`);

      // Track URIs and find duplicates
      const uniqueUris: string[] = [];
      const seenUris = new Set<string>();
      let duplicateCount = 0;

      for (const item of allTracks) {
        // Skip null tracks (unlinked/unavailable)
        if (!item.track || !item.track.uri) {
          console.log(`[Remove Duplicates] Skipping unlinked track`);
          continue;
        }

        const uri = item.track.uri;

        if (!seenUris.has(uri)) {
          // First occurrence, keep it
          uniqueUris.push(uri);
          seenUris.add(uri);
        } else {
          // Duplicate, skip it
          duplicateCount++;
        }
      }

      console.log(
        `[Remove Duplicates] Found ${uniqueUris.length} unique tracks, ${duplicateCount} duplicates`
      );

      if (duplicateCount === 0) {
        return {
          success: false,
          error: 'No duplicate tracks found in this playlist',
        };
      }

      // Validate all URIs are valid Spotify track URIs
      const validTrackUris = uniqueUris.filter((uri) => {
        const isValid = uri && uri.startsWith('spotify:track:') && uri.split(':').length === 3;
        if (!isValid) {
          console.log(`[Remove Duplicates] Skipping invalid URI: ${uri}`);
        }
        return isValid;
      });

      console.log(`[Remove Duplicates] Validated ${validTrackUris.length} track URIs`);

      if (validTrackUris.length === 0) {
        return {
          success: false,
          error: 'No valid tracks to create playlist (all tracks were unlinked or invalid)',
        };
      }

      // Create new playlist
      const newPlaylistName = `${playlistName} - No Duplicates`;
      console.log(`[Remove Duplicates] Creating playlist "${newPlaylistName}"`);

      const createResponse = await this.spotifyApi.createPlaylist(newPlaylistName, {
        description: `Duplicate-free version of "${playlistName}" (removed ${duplicateCount} duplicates)`,
        public: false,
      });

      const newPlaylistId = createResponse.body.id;
      console.log(`[Remove Duplicates] Created playlist ${newPlaylistId}`);

      // Add tracks in batches of 100 (Spotify API limit)
      const batchSize = 100;
      const batches = Math.ceil(validTrackUris.length / batchSize);

      for (let i = 0; i < batches; i++) {
        const start = i * batchSize;
        const end = Math.min(start + batchSize, validTrackUris.length);
        const batch = validTrackUris.slice(start, end);

        console.log(`[Remove Duplicates] Adding batch ${i + 1}/${batches} (${batch.length} tracks)...`);
        await this.spotifyApi.addTracksToPlaylist(newPlaylistId, batch);
      }

      console.log(`[Remove Duplicates] Successfully added ${validTrackUris.length} unique tracks`);

      // Log operation to history
      this.database.logOperation({
        timestamp: Date.now(),
        operation_type: 'remove_duplicates',
        playlists_affected: JSON.stringify([playlistId, newPlaylistId]),
        details: JSON.stringify({
          source_playlist: playlistId,
          new_playlist: newPlaylistId,
          original_count: allTracks.length,
          unique_count: validTrackUris.length,
          duplicates_removed: duplicateCount,
        }),
        can_undo: false,
      });

      console.log('[Remove Duplicates] Completed successfully');

      return {
        success: true,
        playlistId: newPlaylistId,
        originalCount: allTracks.length,
        uniqueCount: validTrackUris.length,
        duplicatesRemoved: duplicateCount,
      };
    } catch (error) {
      console.error('[Remove Duplicates] Failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove duplicates',
      };
    }
  }

  /**
   * Bulk rename playlists using regex find/replace
   */
  async bulkRename(
    playlistIds: string[],
    findPattern: string,
    replacePattern: string
  ): Promise<{
    success: boolean;
    renamed?: number;
    failed?: string[];
    error?: string;
  }> {
    try {
      console.log(`[Bulk Rename] Starting bulk rename for ${playlistIds.length} playlists`);
      console.log(`[Bulk Rename] Pattern: "${findPattern}" → "${replacePattern}"`);

      // Validate regex pattern
      let regex: RegExp;
      try {
        regex = new RegExp(findPattern, 'g');
      } catch (err) {
        return {
          success: false,
          error: `Invalid regex pattern: ${err instanceof Error ? err.message : 'Unknown error'}`,
        };
      }

      const failed: string[] = [];
      let renamed = 0;

      for (const playlistId of playlistIds) {
        try {
          // Get playlist from database
          const playlist = this.database.getPlaylistById(playlistId);
          if (!playlist) {
            console.log(`[Bulk Rename] Playlist ${playlistId} not found in database`);
            failed.push(playlistId);
            continue;
          }

          // Skip if not owned
          if (!playlist.is_owner) {
            console.log(`[Bulk Rename] Skipping ${playlist.name} - not owned`);
            failed.push(playlistId);
            continue;
          }

          // Apply regex rename
          const newName = playlist.name.replace(regex, replacePattern);

          // Skip if name didn't change
          if (newName === playlist.name) {
            console.log(`[Bulk Rename] Skipping ${playlist.name} - no change`);
            continue;
          }

          // Validate new name
          if (!newName || newName.trim().length === 0) {
            console.log(`[Bulk Rename] Skipping ${playlist.name} - invalid new name`);
            failed.push(playlistId);
            continue;
          }

          console.log(`[Bulk Rename] Renaming "${playlist.name}" → "${newName}"`);

          // Rename via Spotify API
          await this.spotifyApi.changePlaylistDetails(playlistId, {
            name: newName,
          });

          // Update in database
          this.database.updatePlaylistName(playlistId, newName);

          renamed++;
        } catch (error) {
          console.error(`[Bulk Rename] Failed to rename playlist ${playlistId}:`, error);
          failed.push(playlistId);
        }
      }

      console.log(`[Bulk Rename] Completed: ${renamed} renamed, ${failed.length} failed`);

      return {
        success: true,
        renamed,
        failed,
      };
    } catch (error) {
      console.error('[Bulk Rename] Failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rename playlists',
      };
    }
  }
}
