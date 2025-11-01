-- Local metadata storage for playlists
CREATE TABLE IF NOT EXISTS playlists (
    spotify_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    track_count INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    followers INTEGER DEFAULT 0,
    is_owner BOOLEAN DEFAULT 0,
    created_at TEXT,
    modified_at TEXT,
    tags TEXT DEFAULT '',           -- Space-separated tags
    last_synced INTEGER DEFAULT 0,  -- Unix timestamp
    snapshot_id TEXT                -- For change detection
);

CREATE TABLE IF NOT EXISTS operation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    operation_type TEXT NOT NULL,   -- 'merge', 'delete', 'rename', 'subtract', etc.
    playlists_affected TEXT,        -- JSON array of playlist IDs
    details TEXT,                   -- JSON object with operation details
    can_undo BOOLEAN DEFAULT 0
);

CREATE TABLE IF NOT EXISTS unlinked_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id TEXT NOT NULL,
    track_uri TEXT NOT NULL,
    track_name TEXT,
    artist_name TEXT,
    detected_at INTEGER NOT NULL,
    FOREIGN KEY (playlist_id) REFERENCES playlists(spotify_id)
);

CREATE INDEX IF NOT EXISTS idx_playlists_tags ON playlists(tags);
CREATE INDEX IF NOT EXISTS idx_playlists_name ON playlists(name);
CREATE INDEX IF NOT EXISTS idx_operation_history_timestamp ON operation_history(timestamp);
