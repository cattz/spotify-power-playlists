/**
 * IPC communication handlers
 *
 * This module sets up all IPC channels for communication
 * between the main process and renderer process
 */

import { ipcMain } from 'electron';
import type { ApiResponse, LocalPlaylist } from '@shared/types';
import { SpotifyAuth } from './auth';
import { PlaylistDatabase } from './database';
import { PlaylistSyncService } from './playlist-sync';
import { PlaylistOperations } from './playlist-operations';
import { checkRateLimit, logRateLimit } from './rate-limit-handler';

let spotifyAuth: SpotifyAuth | null = null;
let database: PlaylistDatabase | null = null;
let syncService: PlaylistSyncService | null = null;
let operations: PlaylistOperations | null = null;

/**
 * Initialize services with configuration
 */
export function initializeServices(clientId: string, dbPath?: string): void {
  spotifyAuth = new SpotifyAuth(clientId);
  database = new PlaylistDatabase(dbPath);

  // Initialize services
  if (spotifyAuth && database) {
    syncService = new PlaylistSyncService(spotifyAuth.getSpotifyApi(), database);
    operations = new PlaylistOperations(spotifyAuth.getSpotifyApi(), database);
  }
}

/**
 * Set up all IPC handlers
 */
export function setupIpcHandlers(): void {
  // Authentication handlers
  ipcMain.handle('auth:start', async (): Promise<ApiResponse<void>> => {
    try {
      if (!spotifyAuth) {
        throw new Error('Spotify auth not initialized');
      }

      await spotifyAuth.authenticate();

      return { success: true };
    } catch (error) {
      console.error('Auth error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      };
    }
  });

  ipcMain.handle('auth:status', async (): Promise<ApiResponse<{ authenticated: boolean }>> => {
    try {
      if (!spotifyAuth) {
        return { success: true, data: { authenticated: false } };
      }

      const authenticated = spotifyAuth.isAuthenticated();

      return { success: true, data: { authenticated } };
    } catch (error) {
      console.error('Auth status error:', error);
      return { success: false, error: 'Failed to check auth status' };
    }
  });

  ipcMain.handle('auth:logout', async (): Promise<ApiResponse<void>> => {
    try {
      if (!spotifyAuth) {
        throw new Error('Spotify auth not initialized');
      }

      spotifyAuth.clearTokens();

      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: 'Failed to logout' };
    }
  });

  // Database handlers
  ipcMain.handle('db:get-playlists', async (): Promise<ApiResponse<LocalPlaylist[]>> => {
    try {
      if (!database) {
        throw new Error('Database not initialized');
      }

      const playlists = database.getAllPlaylists();

      return { success: true, data: playlists };
    } catch (error) {
      console.error('Database error:', error);
      return { success: false, error: 'Failed to fetch playlists' };
    }
  });

  // Playlist sync handlers
  ipcMain.handle(
    'playlist:sync',
    async (): Promise<ApiResponse<{ total: number; synced: number }>> => {
      try {
        if (!syncService) {
          throw new Error('Sync service not initialized');
        }

        if (!spotifyAuth) {
          throw new Error('Spotify auth not initialized');
        }

        // Ensure we have a valid access token
        const accessToken = await spotifyAuth.getAccessToken();
        if (!accessToken) {
          throw new Error('Not authenticated');
        }

        const result = await syncService.syncAllPlaylists();

        return { success: true, data: result };
      } catch (error) {
        console.error('Playlist sync error:', error);

        // Check if this is a rate limit error
        const rateLimitInfo = checkRateLimit(error);
        if (rateLimitInfo.isRateLimited) {
          logRateLimit(rateLimitInfo);
          return {
            success: false,
            error: rateLimitInfo.message || 'Spotify API rate limit exceeded',
          };
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to sync playlists',
        };
      }
    }
  );

  // Background detail sync handler (manual trigger)
  ipcMain.handle(
    'playlist:sync-details-background',
    async (): Promise<
      ApiResponse<{ total: number; synced: number; failed: number }>
    > => {
      try {
        if (!syncService) {
          throw new Error('Sync service not initialized');
        }

        if (!spotifyAuth) {
          throw new Error('Spotify auth not initialized');
        }

        // Ensure we have a valid access token
        const accessToken = await spotifyAuth.getAccessToken();
        if (!accessToken) {
          throw new Error('Not authenticated');
        }

        const result = await syncService.syncPlaylistDetailsBackground();

        return { success: true, data: result };
      } catch (error) {
        console.error('Background detail sync error:', error);

        // Check if this is a rate limit error
        const rateLimitInfo = checkRateLimit(error);
        if (rateLimitInfo.isRateLimited) {
          logRateLimit(rateLimitInfo);
          return {
            success: false,
            error: rateLimitInfo.message || 'Spotify API rate limit exceeded',
          };
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to sync playlist details',
        };
      }
    }
  );

  // Spotify API handlers
  ipcMain.handle('spotify:get-user-playlists', async (): Promise<ApiResponse<any>> => {
    try {
      if (!spotifyAuth) {
        throw new Error('Spotify auth not initialized');
      }

      // Get valid access token (refreshes if needed)
      const accessToken = await spotifyAuth.getAccessToken();

      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const api = spotifyAuth.getSpotifyApi();
      const data = await api.getUserPlaylists();

      return { success: true, data: data.body };
    } catch (error) {
      console.error('Spotify API error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch playlists',
      };
    }
  });

  // Playlist operations handlers
  ipcMain.handle(
    'playlist:get-details',
    async (
      _event,
      playlistIds: string[]
    ): Promise<ApiResponse<LocalPlaylist[]>> => {
      try {
        if (!operations) {
          throw new Error('Operations service not initialized');
        }

        const details = operations.getPlaylistDetails(playlistIds);

        return { success: true, data: details };
      } catch (error) {
        console.error('Get playlist details error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get playlist details',
        };
      }
    }
  );

  ipcMain.handle(
    'playlist:delete',
    async (
      _event,
      playlistIds: string[]
    ): Promise<
      ApiResponse<{
        deleted: number;
        failed: string[];
      }>
    > => {
      try {
        if (!operations) {
          throw new Error('Operations service not initialized');
        }

        if (!spotifyAuth) {
          throw new Error('Spotify auth not initialized');
        }

        // Ensure we have a valid access token
        const accessToken = await spotifyAuth.getAccessToken();
        if (!accessToken) {
          throw new Error('Not authenticated');
        }

        const result = await operations.deletePlaylists(playlistIds);

        if (!result.success) {
          return {
            success: false,
            error: result.error,
          };
        }

        return {
          success: true,
          data: {
            deleted: result.deleted,
            failed: result.failed,
          },
        };
      } catch (error) {
        console.error('Delete playlists error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to delete playlists',
        };
      }
    }
  );

  ipcMain.handle(
    'playlist:update-tags',
    async (
      _event,
      playlistIds: string[],
      tags: string,
      append: boolean
    ): Promise<ApiResponse<{ updated: number }>> => {
      try {
        if (!database) {
          throw new Error('Database not initialized');
        }

        let updated = 0;

        for (const playlistId of playlistIds) {
          const playlist = database.getPlaylistById(playlistId);
          if (!playlist) continue;

          let newTags = tags;

          if (append && playlist.tags) {
            // Append mode: combine existing and new tags, remove duplicates
            const existingTags = playlist.tags.split(/\s+/).filter((t) => t.length > 0);
            const newTagsArray = tags.split(/\s+/).filter((t) => t.length > 0);
            const combinedTags = [...new Set([...existingTags, ...newTagsArray])];
            newTags = combinedTags.join(' ');
          }

          database.updateTags(playlistId, newTags);
          updated++;
        }

        return {
          success: true,
          data: { updated },
        };
      } catch (error) {
        console.error('Update tags error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to update tags',
        };
      }
    }
  );

  // Playlist merge handler
  ipcMain.handle(
    'playlist:merge',
    async (
      _event,
      playlistIds: string[],
      targetName: string,
      removeDuplicates: boolean,
      deleteSource: boolean
    ): Promise<
      ApiResponse<{
        playlistId: string;
        trackCount: number;
      }>
    > => {
      try {
        if (!operations) {
          throw new Error('Operations service not initialized');
        }

        if (!spotifyAuth) {
          throw new Error('Spotify auth not initialized');
        }

        // Ensure we have a valid access token
        const accessToken = await spotifyAuth.getAccessToken();
        if (!accessToken) {
          throw new Error('Not authenticated');
        }

        const result = await operations.mergePlaylists(
          playlistIds,
          targetName,
          removeDuplicates,
          deleteSource
        );

        if (!result.success) {
          return {
            success: false,
            error: result.error,
          };
        }

        return {
          success: true,
          data: {
            playlistId: result.playlistId!,
            trackCount: result.trackCount!,
          },
        };
      } catch (error) {
        console.error('Merge playlists error:', error);

        // Check if this is a rate limit error
        const rateLimitInfo = checkRateLimit(error);
        if (rateLimitInfo.isRateLimited) {
          logRateLimit(rateLimitInfo);
          return {
            success: false,
            error: rateLimitInfo.message || 'Spotify API rate limit exceeded',
          };
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to merge playlists',
        };
      }
    }
  );

  // Playlist fix broken tracks handler
  ipcMain.handle(
    'playlist:fix-broken-links',
    async (
      _event,
      playlistId: string
    ): Promise<
      ApiResponse<{
        playlistId: string;
        total: number;
        recovered: number;
        failed: number;
      }>
    > => {
      try {
        if (!operations) {
          throw new Error('Operations service not initialized');
        }

        if (!spotifyAuth) {
          throw new Error('Spotify auth not initialized');
        }

        // Ensure we have a valid access token
        const accessToken = await spotifyAuth.getAccessToken();
        if (!accessToken) {
          throw new Error('Not authenticated');
        }

        const result = await operations.fixBrokenTracks(playlistId);

        if (!result.success) {
          return {
            success: false,
            error: result.error,
          };
        }

        return {
          success: true,
          data: {
            playlistId: result.playlistId!,
            total: result.total!,
            recovered: result.recovered!,
            failed: result.failed!,
          },
        };
      } catch (error) {
        console.error('Fix broken tracks error:', error);

        // Check if this is a rate limit error
        const rateLimitInfo = checkRateLimit(error);
        if (rateLimitInfo.isRateLimited) {
          logRateLimit(rateLimitInfo);
          return {
            success: false,
            error: rateLimitInfo.message || 'Spotify API rate limit exceeded',
          };
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to fix broken tracks',
        };
      }
    }
  );

  // Playlist remove duplicates handler
  ipcMain.handle(
    'playlist:remove-duplicates',
    async (
      _event,
      playlistId: string
    ): Promise<
      ApiResponse<{
        playlistId: string;
        originalCount: number;
        uniqueCount: number;
        duplicatesRemoved: number;
      }>
    > => {
      try {
        if (!operations) {
          throw new Error('Operations service not initialized');
        }

        if (!spotifyAuth) {
          throw new Error('Spotify auth not initialized');
        }

        // Ensure we have a valid access token
        const accessToken = await spotifyAuth.getAccessToken();
        if (!accessToken) {
          throw new Error('Not authenticated');
        }

        const result = await operations.removeDuplicates(playlistId);

        if (!result.success) {
          return {
            success: false,
            error: result.error,
          };
        }

        return {
          success: true,
          data: {
            playlistId: result.playlistId!,
            originalCount: result.originalCount!,
            uniqueCount: result.uniqueCount!,
            duplicatesRemoved: result.duplicatesRemoved!,
          },
        };
      } catch (error) {
        console.error('Remove duplicates error:', error);

        // Check if this is a rate limit error
        const rateLimitInfo = checkRateLimit(error);
        if (rateLimitInfo.isRateLimited) {
          logRateLimit(rateLimitInfo);
          return {
            success: false,
            error: rateLimitInfo.message || 'Spotify API rate limit exceeded',
          };
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to remove duplicates',
        };
      }
    }
  );

  // Playlist bulk rename handler
  ipcMain.handle(
    'playlist:bulk-rename',
    async (
      _event,
      playlistIds: string[],
      findPattern: string,
      replacePattern: string
    ): Promise<
      ApiResponse<{
        renamed: number;
        failed: string[];
      }>
    > => {
      try {
        if (!operations) {
          throw new Error('Operations service not initialized');
        }

        if (!spotifyAuth) {
          throw new Error('Spotify auth not initialized');
        }

        // Ensure we have a valid access token
        const accessToken = await spotifyAuth.getAccessToken();
        if (!accessToken) {
          throw new Error('Not authenticated. Please log in to Spotify.');
        }

        const result = await operations.bulkRename(playlistIds, findPattern, replacePattern);

        if (!result.success) {
          return {
            success: false,
            error: result.error,
          };
        }

        return {
          success: true,
          data: {
            renamed: result.renamed!,
            failed: result.failed!,
          },
        };
      } catch (error) {
        console.error('Bulk rename error:', error);

        // Check if this is a rate limit error
        const rateLimit = checkRateLimit(error);
        if (rateLimit) {
          logRateLimit(rateLimit);
          return {
            success: false,
            error: `Rate limited by Spotify. Please wait ${Math.ceil(rateLimit.retryAfter / 60)} minutes.`,
          };
        }

        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to rename playlists',
        };
      }
    }
  );

  // TODO: Add more handlers as needed
  // - spotify:get-playlist-tracks
  // - spotify:create-playlist
  // - playlist:subtract
  // - playlist:intersect
}

/**
 * Get Spotify auth instance (for use in main process)
 */
export function getSpotifyAuth(): SpotifyAuth | null {
  return spotifyAuth;
}

/**
 * Get database instance (for use in main process)
 */
export function getDatabase(): PlaylistDatabase | null {
  return database;
}
