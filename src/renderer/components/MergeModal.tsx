/**
 * Modal for merging multiple playlists
 */

import { useState, useEffect, useRef } from 'react';
import type { LocalPlaylist } from '@shared/types';

interface MergeModalProps {
  playlists: LocalPlaylist[];
  onConfirm: (
    targetName: string,
    removeDuplicates: boolean,
    deleteSource: boolean
  ) => void;
  onCancel: () => void;
  merging: boolean;
}

export function MergeModal({
  playlists,
  onConfirm,
  onCancel,
  merging,
}: MergeModalProps) {
  const [targetName, setTargetName] = useState('');
  const [removeDuplicates, setRemoveDuplicates] = useState(false);
  const [deleteSource, setDeleteSource] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Calculate total tracks
  const totalTracks = playlists.reduce((sum, p) => sum + p.track_count, 0);

  // Generate default target name
  useEffect(() => {
    if (playlists.length === 0) return;

    // Try to find common prefix
    const names = playlists.map((p) => p.name);
    let commonPrefix = names[0];

    for (let i = 1; i < names.length; i++) {
      let j = 0;
      while (j < commonPrefix.length && j < names[i].length && commonPrefix[j] === names[i][j]) {
        j++;
      }
      commonPrefix = commonPrefix.substring(0, j);
    }

    // Use common prefix + "Merged", or "Merged Playlist" if no common prefix
    const defaultName = commonPrefix.trim()
      ? `${commonPrefix.trim()} Merged`
      : 'Merged Playlist';
    setTargetName(defaultName);
  }, [playlists]);

  // Auto-focus input
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetName.trim() && !merging) {
      onConfirm(targetName.trim(), removeDuplicates, deleteSource);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">MERGE PLAYLISTS</div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <p>Merging:</p>
            <div className="playlist-list-box">
              {playlists.map((playlist) => (
                <div key={playlist.spotify_id} className="playlist-item">
                  • {playlist.name} ({playlist.track_count} tracks)
                </div>
              ))}
            </div>

            <p className="stats-text">
              Total: {totalTracks} tracks from {playlists.length} playlists
            </p>

            <div className="form-group">
              <label htmlFor="target-name">Target Playlist Name</label>
              <input
                ref={inputRef}
                id="target-name"
                type="text"
                className="text-input"
                value={targetName}
                onChange={(e) => setTargetName(e.target.value)}
                disabled={merging}
                required
              />
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={removeDuplicates}
                  onChange={(e) => setRemoveDuplicates(e.target.checked)}
                  disabled={merging}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <span style={{ color: 'var(--text-primary)' }}>Remove duplicates</span>
              </label>
              <p className="info-text">Keep only first occurrence of each track (by URI)</p>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={deleteSource}
                  onChange={(e) => setDeleteSource(e.target.checked)}
                  disabled={merging}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <span style={{ color: 'var(--text-primary)' }}>Delete source playlists</span>
              </label>
              {deleteSource && (
                <p className="warning-message">
                  Source playlists will be deleted after merge
                </p>
              )}
            </div>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              onClick={onCancel}
              disabled={merging}
              className="modal-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!targetName.trim() || merging}
              className="modal-button"
            >
              {merging ? 'Merging...' : 'Merge →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
