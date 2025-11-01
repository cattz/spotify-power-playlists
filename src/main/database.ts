/**
 * SQLite database operations
 *
 * This module handles:
 * - Database initialization
 * - Playlist metadata CRUD operations
 * - Operation history logging
 * - Unlinked track tracking
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import { join } from 'path';
import { readFileSync } from 'fs';
import type { LocalPlaylist, OperationHistory, UnlinkedTrack } from '@shared/types';

export class PlaylistDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = join(app.getPath('userData'), 'spotify-playlists.db');
    this.db = new Database(dbPath || defaultPath);
    this.initialize();
  }

  private initialize(): void {
    // Load and execute schema
    const schemaPath = join(__dirname, '../../database/schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);

    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
  }

  // Playlist operations
  upsertPlaylist(playlist: LocalPlaylist): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO playlists (
        spotify_id, name, owner, track_count, duration_ms, followers,
        is_owner, created_at, modified_at, tags, last_synced, snapshot_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      playlist.spotify_id,
      playlist.name,
      playlist.owner,
      playlist.track_count,
      playlist.duration_ms,
      playlist.followers,
      playlist.is_owner ? 1 : 0,
      playlist.created_at,
      playlist.modified_at,
      playlist.tags,
      playlist.last_synced,
      playlist.snapshot_id
    );
  }

  getAllPlaylists(): LocalPlaylist[] {
    const stmt = this.db.prepare('SELECT * FROM playlists ORDER BY name');
    return stmt.all() as LocalPlaylist[];
  }

  getPlaylistById(id: string): LocalPlaylist | undefined {
    const stmt = this.db.prepare('SELECT * FROM playlists WHERE spotify_id = ?');
    return stmt.get(id) as LocalPlaylist | undefined;
  }

  deletePlaylist(id: string): void {
    const stmt = this.db.prepare('DELETE FROM playlists WHERE spotify_id = ?');
    stmt.run(id);
  }

  updateTags(id: string, tags: string): void {
    const stmt = this.db.prepare('UPDATE playlists SET tags = ? WHERE spotify_id = ?');
    stmt.run(tags, id);
  }

  // Operation history
  logOperation(operation: Omit<OperationHistory, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO operation_history (timestamp, operation_type, playlists_affected, details, can_undo)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      operation.timestamp,
      operation.operation_type,
      operation.playlists_affected,
      operation.details,
      operation.can_undo ? 1 : 0
    );
  }

  getOperationHistory(limit = 100): OperationHistory[] {
    const stmt = this.db.prepare(
      'SELECT * FROM operation_history ORDER BY timestamp DESC LIMIT ?'
    );
    return stmt.all(limit) as OperationHistory[];
  }

  // Unlinked tracks
  addUnlinkedTrack(track: Omit<UnlinkedTrack, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO unlinked_tracks (playlist_id, track_uri, track_name, artist_name, detected_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      track.playlist_id,
      track.track_uri,
      track.track_name,
      track.artist_name,
      track.detected_at
    );
  }

  getUnlinkedTracksForPlaylist(playlistId: string): UnlinkedTrack[] {
    const stmt = this.db.prepare('SELECT * FROM unlinked_tracks WHERE playlist_id = ?');
    return stmt.all(playlistId) as UnlinkedTrack[];
  }

  close(): void {
    this.db.close();
  }
}
