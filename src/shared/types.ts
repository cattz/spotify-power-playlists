/**
 * Shared TypeScript types for Spotify Playlist Manager
 */

// Spotify API types
export interface SpotifyPlaylist {
  id: string;
  name: string;
  owner: {
    id: string;
    display_name: string;
  };
  tracks: {
    total: number;
  };
  followers?: {
    total: number;
  };
  collaborative: boolean;
  public: boolean;
  snapshot_id: string;
  uri: string;
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyTrack {
  uri: string;
  track: {
    id: string | null;
    name: string;
    artists: Array<{
      name: string;
    }>;
    duration_ms: number;
    is_playable?: boolean;
  } | null;
  added_at: string;
}

// Local database types
export interface LocalPlaylist {
  spotify_id: string;
  name: string;
  owner: string;
  track_count: number;
  duration_ms: number;
  followers: number;
  is_owner: boolean;
  created_at: string;
  modified_at: string;
  tags: string;
  last_synced: number;
  snapshot_id: string;
  unlinked_count: number;
}

export interface OperationHistory {
  id: number;
  timestamp: number;
  operation_type: 'merge' | 'delete' | 'rename' | 'subtract' | 'intersect' | 'tag' | 'remove_duplicates' | 'fix_broken_links';
  playlists_affected: string; // JSON array
  details: string; // JSON object
  can_undo: boolean;
}

export interface UnlinkedTrack {
  id: number;
  playlist_id: string;
  track_uri: string;
  track_name: string | null;
  artist_name: string | null;
  detected_at: number;
}

// UI state types
export interface PlaylistTableRow extends LocalPlaylist {
  selected: boolean;
  hasUnlinkedTracks?: boolean;
  unlinkedCount?: number;
}

export interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedIndex: number | null;
}

export interface FilterState {
  searchQuery: string;
  isRegex: boolean;
  isValid: boolean;
}

export interface SortConfig {
  column: keyof LocalPlaylist;
  direction: 'asc' | 'desc';
}

// Operation types
export interface MergeConfig {
  targetName: string;
  removeDuplicates: boolean;
  deleteSource: boolean;
  sortBy: 'date_added' | 'track_name' | 'artist_name';
}

export interface RenameConfig {
  findPattern: string;
  replacePattern: string;
}

export interface SubtractConfig {
  fromPlaylistId: string;
  subtractPlaylistId: string;
  targetName: string;
}

export interface IntersectConfig {
  playlistIds: string[];
  targetName: string;
}

export interface TagConfig {
  tags: string;
  append: boolean;
}

// IPC channel types
export type IpcChannels =
  | 'auth:start'
  | 'auth:callback'
  | 'auth:status'
  | 'db:init'
  | 'db:query'
  | 'spotify:get-playlists'
  | 'spotify:get-tracks'
  | 'spotify:create-playlist'
  | 'spotify:delete-playlist'
  | 'spotify:rename-playlist'
  | 'spotify:add-tracks'
  | 'spotify:remove-tracks'
  | 'playlist:merge'
  | 'playlist:subtract'
  | 'playlist:intersect'
  | 'playlist:rename-bulk'
  | 'playlist:update-tags'
  | 'playlist:sync'
  | 'playlist:export-csv';

// Settings types
export interface AppSettings {
  spotifyClientId: string;
  autoSyncInterval: number | null; // null = disabled, number = hours
  showDuration: boolean;
  showCreatedDate: boolean;
  showFollowers: boolean;
  compactMode: boolean;
  databasePath: string;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
