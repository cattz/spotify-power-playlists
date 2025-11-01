/**
 * Type declarations for Electron API exposed via preload script
 */

import type { ElectronAPI } from '../main/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
