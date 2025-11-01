/**
 * Preload script for secure IPC communication
 *
 * This script runs in a sandboxed context and exposes a safe API
 * to the renderer process using contextBridge
 */

import { contextBridge, ipcRenderer } from 'electron';
import type { ApiResponse } from '@shared/types';

// Define the API that will be exposed to the renderer
const api = {
  // Authentication
  auth: {
    start: (): Promise<ApiResponse<void>> => ipcRenderer.invoke('auth:start'),
    status: (): Promise<ApiResponse<{ authenticated: boolean }>> =>
      ipcRenderer.invoke('auth:status'),
    logout: (): Promise<ApiResponse<void>> => ipcRenderer.invoke('auth:logout'),
  },

  // Database
  database: {
    getPlaylists: (): Promise<ApiResponse<any[]>> => ipcRenderer.invoke('db:get-playlists'),
  },

  // Spotify API
  spotify: {
    getUserPlaylists: (): Promise<ApiResponse<any>> =>
      ipcRenderer.invoke('spotify:get-user-playlists'),
    // Add more methods as implemented
  },

  // Playlist operations
  playlists: {
    // TODO: Add playlist operation methods
    // merge: (config: MergeConfig) => ipcRenderer.invoke('playlist:merge', config),
    // subtract: (config: SubtractConfig) => ipcRenderer.invoke('playlist:subtract', config),
    // etc.
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', api);

// Type definitions for the exposed API (to be used in renderer)
export type ElectronAPI = typeof api;
