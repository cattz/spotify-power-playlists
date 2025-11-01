/**
 * IPC communication handlers
 *
 * This module sets up all IPC channels for communication
 * between the main process and renderer process
 */

import { ipcMain } from 'electron';
import type { ApiResponse } from '@shared/types';
import { SpotifyAuth } from './auth';
import { PlaylistDatabase } from './database';

let spotifyAuth: SpotifyAuth | null = null;
let database: PlaylistDatabase | null = null;

/**
 * Initialize services with configuration
 */
export function initializeServices(clientId: string, dbPath?: string): void {
  spotifyAuth = new SpotifyAuth(clientId);
  database = new PlaylistDatabase(dbPath);
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
  ipcMain.handle('db:get-playlists', async (): Promise<ApiResponse<any[]>> => {
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

  // TODO: Add more handlers as needed
  // - spotify:get-playlist-tracks
  // - spotify:create-playlist
  // - spotify:delete-playlist
  // - spotify:rename-playlist
  // - playlist:merge
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
