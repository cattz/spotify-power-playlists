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
    sync: (): Promise<ApiResponse<{ total: number; synced: number }>> =>
      ipcRenderer.invoke('playlist:sync'),
    syncDetailsBackground: (): Promise<
      ApiResponse<{ total: number; synced: number; failed: number }>
    > => ipcRenderer.invoke('playlist:sync-details-background'),
    getDetails: (playlistIds: string[]): Promise<ApiResponse<any[]>> =>
      ipcRenderer.invoke('playlist:get-details', playlistIds),
    delete: (
      playlistIds: string[]
    ): Promise<ApiResponse<{ deleted: number; failed: string[] }>> =>
      ipcRenderer.invoke('playlist:delete', playlistIds),
    updateTags: (
      playlistIds: string[],
      tags: string,
      append: boolean
    ): Promise<ApiResponse<{ updated: number }>> =>
      ipcRenderer.invoke('playlist:update-tags', playlistIds, tags, append),
    merge: (
      playlistIds: string[],
      targetName: string,
      removeDuplicates: boolean,
      deleteSource: boolean
    ): Promise<ApiResponse<{ playlistId: string; trackCount: number }>> =>
      ipcRenderer.invoke('playlist:merge', playlistIds, targetName, removeDuplicates, deleteSource),
    fixBrokenLinks: (
      playlistId: string
    ): Promise<ApiResponse<{ playlistId: string; total: number; recovered: number; failed: number }>> =>
      ipcRenderer.invoke('playlist:fix-broken-links', playlistId),
    // TODO: Add more playlist operation methods
    // subtract: (config: SubtractConfig) => ipcRenderer.invoke('playlist:subtract', config),
    // intersect: (config: IntersectConfig) => ipcRenderer.invoke('playlist:intersect', config),
    // etc.
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', api);

// Type definitions for the exposed API (to be used in renderer)
export type ElectronAPI = typeof api;
