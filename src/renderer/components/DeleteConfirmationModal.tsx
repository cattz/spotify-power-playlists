/**
 * Delete confirmation modal component
 */

import type { LocalPlaylist } from '@shared/types';

interface DeleteConfirmationModalProps {
  playlists: LocalPlaylist[];
  onConfirm: () => void;
  onCancel: () => void;
  deleting?: boolean;
}

export function DeleteConfirmationModal({
  playlists,
  onConfirm,
  onCancel,
  deleting = false,
}: DeleteConfirmationModalProps) {
  // Check if any playlists are not owned
  const notOwned = playlists.filter((p) => !p.is_owner);
  const canDelete = notOwned.length === 0;

  // Calculate total tracks
  const totalTracks = playlists.reduce((sum, p) => sum + p.track_count, 0);

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">CONFIRM DELETE</div>

        <div className="modal-body">
          {!canDelete ? (
            <>
              <p className="error-message">
                Cannot delete {notOwned.length} playlist(s) you don't own:
              </p>
              <div className="playlist-list-box">
                {notOwned.map((playlist) => (
                  <div key={playlist.spotify_id} className="playlist-item">
                    • {playlist.name} (owned by {playlist.owner})
                  </div>
                ))}
              </div>
              <p className="warning-message">
                You can only delete playlists you own. Deselect these playlists to continue.
              </p>
            </>
          ) : (
            <>
              <p className="warning-message">
                Are you sure you want to delete {playlists.length} playlist
                {playlists.length !== 1 ? 's' : ''}?
              </p>
              <div className="playlist-list-box">
                {playlists.map((playlist) => (
                  <div key={playlist.spotify_id} className="playlist-item">
                    • {playlist.name} ({playlist.track_count} tracks)
                  </div>
                ))}
              </div>
              <p className="stats-text">
                Total: {playlists.length} playlists, {totalTracks.toLocaleString()} tracks
              </p>
              <p className="error-message">This action CANNOT be undone.</p>
            </>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onCancel} disabled={deleting} className="modal-button">
            Cancel
          </button>
          {canDelete && (
            <button
              onClick={onConfirm}
              disabled={deleting}
              className="modal-button modal-button-danger"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
