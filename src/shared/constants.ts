/**
 * Shared constants for Spotify Playlist Manager
 */

// Spotify OAuth configuration
export const SPOTIFY_SCOPES = [
  'playlist-read-private',
  'playlist-read-collaborative',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-library-read',
  'user-library-modify',
];

export const SPOTIFY_REDIRECT_URI = 'http://localhost:8888/callback';

// API limits
export const SPOTIFY_API_LIMITS = {
  PLAYLISTS_PER_REQUEST: 50,
  TRACKS_PER_REQUEST: 100,
  MAX_CONCURRENT_REQUESTS: 5,
  RATE_LIMIT_RETRY_MS: 2000,
  MAX_RETRIES: 3,
} as const;

// UI constants
export const UI_CONSTANTS = {
  SEARCH_DEBOUNCE_MS: 150,
  LOADING_SPINNER_DELAY_MS: 500,
  VIRTUALIZED_ROW_HEIGHT: 30,
  VIRTUALIZED_OVERSCAN: 10,
  TOAST_DURATION_MS: 3000,
  MODAL_FADE_DURATION_MS: 100,
} as const;

// Column widths (in pixels)
export const COLUMN_WIDTHS = {
  CHECKBOX: 35,
  NAME: 300,
  TRACKS: 70,
  DURATION: 80,
  OWNER: 100,
  MODIFIED: 95,
  CREATED: 95,
  FOLLOWERS: 80,
  TAGS: 200,
  WARNING: 30,
} as const;

// Color palette
export const COLORS = {
  BG_PRIMARY: '#000000',
  BG_SECONDARY: '#0a0a0a',
  BG_HOVER: '#111111',
  BG_SELECTED: '#1a1a1a',
  TEXT_PRIMARY: '#0f0',
  TEXT_SECONDARY: '#0a0',
  TEXT_TERTIARY: '#050',
  BORDER: '#0f0',
  BORDER_DIM: '#333',
  ERROR: '#f00',
  WARNING: '#ff0',
} as const;

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  FOCUS_SEARCH: 'CmdOrCtrl+F',
  SELECT_ALL: 'CmdOrCtrl+A',
  CLEAR_SELECTION: 'Escape',
  SETTINGS: 'CmdOrCtrl+,',
  MERGE: 'CmdOrCtrl+M',
  RENAME: 'CmdOrCtrl+R',
  TAGS: 'CmdOrCtrl+T',
  SUBTRACT: 'CmdOrCtrl+-',
  INTERSECT: 'CmdOrCtrl+&',
  DELETE: 'Delete',
  SHOW_SHORTCUTS: 'CmdOrCtrl+/',
  OPEN_IN_SPOTIFY: 'Enter',
  NAVIGATE_UP: 'ArrowUp',
  NAVIGATE_DOWN: 'ArrowDown',
  TOGGLE_SELECTION: 'Space',
} as const;

// Database
export const DB_CONFIG = {
  CACHE_DURATION_MS: 60 * 60 * 1000, // 1 hour
  DB_NAME: 'spotify-playlists.db',
} as const;

// Default settings
export const DEFAULT_SETTINGS = {
  autoSyncInterval: null,
  showDuration: true,
  showCreatedDate: true,
  showFollowers: true,
  compactMode: false,
} as const;

// Regex patterns
export const REGEX_PATTERNS = {
  // Detect if a string contains regex special characters
  IS_REGEX: /[.*+?^${}()|[\]\\]/,
} as const;

// Operation names
export const OPERATION_TYPES = {
  MERGE: 'merge',
  DELETE: 'delete',
  RENAME: 'rename',
  SUBTRACT: 'subtract',
  INTERSECT: 'intersect',
  TAG: 'tag',
} as const;

// Error messages
export const ERROR_MESSAGES = {
  AUTH_FAILED: 'Authentication failed. Please try again.',
  NETWORK_ERROR: 'Connection lost. Retrying...',
  RATE_LIMITED: 'Rate limited. Retrying in {seconds} seconds...',
  INSUFFICIENT_PERMISSIONS: 'Missing permissions. Please re-authenticate.',
  PLAYLIST_NOT_FOUND: 'Playlist was deleted on Spotify. Removing from cache.',
  DB_CORRUPTED: 'Database corrupted. Recreate?',
  DB_WRITE_FAILED: 'Failed to save tags. Retry?',
  INVALID_REGEX: 'Invalid regex pattern.',
  CANNOT_DELETE_FOLLOWED: "Cannot delete playlists you don't own.",
} as const;
