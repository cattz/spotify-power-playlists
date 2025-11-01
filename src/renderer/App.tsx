import { useEffect, useState, useRef } from 'react';
import './styles/app.css';
import { usePlaylists } from './hooks/usePlaylists';
import { useDebounce } from './hooks/useDebounce';
import { useSelection } from './hooks/useSelection';
import { filterPlaylists } from './utils/filterPlaylists';
import { DeleteConfirmationModal } from './components/DeleteConfirmationModal';
import { TagModal } from './components/TagModal';
import { ContextMenu } from './components/ContextMenu';
import { UI_CONSTANTS } from '@shared/constants';
import type { LocalPlaylist } from '@shared/types';

/**
 * Main application component
 *
 * TODO: Implement full UI structure with:
 * - SearchBar component
 * - Stats bar
 * - PlaylistTable component (virtualized)
 * - ActionBar component
 * - Modal dialogs for operations
 * - Keyboard shortcuts handler
 */

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter and sort state
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'mine' | 'others'>('all');
  const [sortColumn, setSortColumn] = useState<keyof LocalPlaylist>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [playlistsToDelete, setPlaylistsToDelete] = useState<LocalPlaylist[]>([]);
  const [deleting, setDeleting] = useState(false);

  // Tag modal state
  const [showTagModal, setShowTagModal] = useState(false);
  const [playlistsToTag, setPlaylistsToTag] = useState<LocalPlaylist[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    playlist: LocalPlaylist;
    x: number;
    y: number;
  } | null>(null);

  // Playlist management
  const {
    playlists,
    loading: playlistsLoading,
    error: playlistsError,
    syncing,
    syncPlaylists,
    refreshPlaylists,
  } = usePlaylists();

  // Selection management
  const {
    selectedIds,
    isSelected,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    setLastClickedId,
  } = useSelection();

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, UI_CONSTANTS.SEARCH_DEBOUNCE_MS);

  // Filter playlists based on search
  const filterResult = filterPlaylists(playlists, debouncedSearch);
  let filteredPlaylists = filterResult.playlists;
  const searchError = filterResult.error;

  // Apply ownership filter
  if (ownershipFilter === 'mine') {
    filteredPlaylists = filteredPlaylists.filter((p) => p.is_owner);
  } else if (ownershipFilter === 'others') {
    filteredPlaylists = filteredPlaylists.filter((p) => !p.is_owner);
  }

  // Sort playlists
  filteredPlaylists = [...filteredPlaylists].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];

    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
      comparison = aVal === bVal ? 0 : aVal ? -1 : 1;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }

      // Cmd/Ctrl + A to select all (filtered)
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        const allIds = filteredPlaylists.map((p) => p.spotify_id);
        selectAll(allIds);
      }

      // Cmd/Ctrl + T to edit tags
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        if (selectedIds.size > 0) {
          handleTagClick();
        }
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        clearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredPlaylists, selectAll, clearSelection, selectedIds]);

  const checkAuthStatus = async () => {
    try {
      const result = await window.electronAPI.auth.status();
      if (result.success && result.data) {
        setAuthenticated(result.data.authenticated);
      }
    } catch (err) {
      console.error('Failed to check auth status:', err);
    }
  };

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.auth.start();

      if (result.success) {
        setAuthenticated(true);
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const result = await window.electronAPI.auth.logout();

      if (result.success) {
        setAuthenticated(false);
      }
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleSync = async () => {
    await syncPlaylists();
  };

  // Header checkbox handler (select all visible)
  const handleSelectAll = () => {
    if (selectedIds.size === filteredPlaylists.length && filteredPlaylists.length > 0) {
      // All visible are selected, deselect all
      clearSelection();
    } else {
      // Select all visible
      const allIds = filteredPlaylists.map((p) => p.spotify_id);
      selectAll(allIds);
    }
  };

  // Sort column handler
  const handleSort = (column: keyof LocalPlaylist) => {
    if (sortColumn === column) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Format duration helper
  const formatDuration = (ms: number): string => {
    if (ms === 0) {
      return '-';
    }
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Delete handlers
  const handleDeleteClick = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    // Get details for selected playlists
    const selectedPlaylistIds = Array.from(selectedIds);
    const result = await window.electronAPI.playlists.getDetails(selectedPlaylistIds);

    if (result.success && result.data) {
      setPlaylistsToDelete(result.data);
      setShowDeleteModal(true);
    }
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);

    try {
      const selectedPlaylistIds = playlistsToDelete.map((p) => p.spotify_id);
      const result = await window.electronAPI.playlists.delete(selectedPlaylistIds);

      if (result.success && result.data) {
        console.log(`Deleted ${result.data.deleted} playlists`);

        if (result.data.failed.length > 0) {
          console.error(`Failed to delete ${result.data.failed.length} playlists`);
        }

        // Clear selection and close modal
        clearSelection();
        setShowDeleteModal(false);

        // Refresh playlist list
        await refreshPlaylists();
      } else {
        console.error('Delete failed:', result.error);
      }
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setPlaylistsToDelete([]);
  };

  // Tag handlers
  const handleTagClick = async () => {
    if (selectedIds.size === 0) {
      return;
    }

    // Get details for selected playlists
    const selectedPlaylistIds = Array.from(selectedIds);
    const result = await window.electronAPI.playlists.getDetails(selectedPlaylistIds);

    if (result.success && result.data) {
      setPlaylistsToTag(result.data);
      setShowTagModal(true);
    }
  };

  const handleTagConfirm = async (tags: string, append: boolean) => {
    setSavingTags(true);

    try {
      const selectedPlaylistIds = playlistsToTag.map((p) => p.spotify_id);
      const result = await window.electronAPI.playlists.updateTags(
        selectedPlaylistIds,
        tags,
        append
      );

      if (result.success && result.data) {
        console.log(`Updated tags for ${result.data.updated} playlists`);

        // Close modal and refresh playlist list
        setShowTagModal(false);

        // Refresh playlist list to show updated tags
        await refreshPlaylists();
      } else {
        console.error('Update tags failed:', result.error);
      }
    } catch (err) {
      console.error('Update tags error:', err);
    } finally {
      setSavingTags(false);
    }
  };

  const handleTagCancel = () => {
    setShowTagModal(false);
    setPlaylistsToTag([]);
  };

  // Context menu handlers
  const handleContextMenu = (
    playlist: LocalPlaylist,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    setContextMenu({
      playlist,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleOpenInSpotify = () => {
    if (!contextMenu) return;
    const url = `https://open.spotify.com/playlist/${contextMenu.playlist.spotify_id}`;
    window.open(url, '_blank');
  };

  const handleCopyLink = async () => {
    if (!contextMenu) return;
    const url = `https://open.spotify.com/playlist/${contextMenu.playlist.spotify_id}`;
    try {
      await navigator.clipboard.writeText(url);
      console.log('Copied playlist link to clipboard');
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleCopyId = async () => {
    if (!contextMenu) return;
    try {
      await navigator.clipboard.writeText(contextMenu.playlist.spotify_id);
      console.log('Copied playlist ID to clipboard');
    } catch (err) {
      console.error('Failed to copy ID:', err);
    }
  };

  const handleContextDelete = async () => {
    if (!contextMenu) return;
    setPlaylistsToDelete([contextMenu.playlist]);
    setShowDeleteModal(true);
  };

  const handleContextEditTags = async () => {
    if (!contextMenu) return;
    setPlaylistsToTag([contextMenu.playlist]);
    setShowTagModal(true);
  };

  // Selection handlers
  const handleCheckboxClick = (
    playlistId: string,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.stopPropagation();

    if (e.shiftKey && selectedIds.size > 0) {
      // Shift+Click: range selection
      const allIds = filteredPlaylists.map((p) => p.spotify_id);
      const lastSelected = Array.from(selectedIds)[selectedIds.size - 1];
      selectRange(lastSelected, playlistId, allIds);
    } else if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl+Click: toggle selection
      toggleSelection(playlistId);
    } else {
      // Regular click: toggle selection
      toggleSelection(playlistId);
    }
  };

  const handleRowClick = (
    playlistId: string,
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    // Only handle clicks on the row itself, not on checkbox
    if ((e.target as HTMLElement).closest('.col-checkbox')) {
      return;
    }

    if (e.shiftKey && selectedIds.size > 0) {
      // Shift+Click: range selection
      const allIds = filteredPlaylists.map((p) => p.spotify_id);
      const lastSelected = Array.from(selectedIds)[selectedIds.size - 1];
      selectRange(lastSelected, playlistId, allIds);
    } else if (e.metaKey || e.ctrlKey) {
      // Cmd/Ctrl+Click: toggle selection
      toggleSelection(playlistId);
    } else {
      // Regular click: clear other selections and select this one
      clearSelection();
      toggleSelection(playlistId);
    }
  };

  // Calculate stats (use filtered playlists for visible stats)
  const totalTracks = filteredPlaylists.reduce((sum, p) => sum + p.track_count, 0);
  const totalDuration = filteredPlaylists.reduce((sum, p) => sum + p.duration_ms, 0);
  const durationHours = Math.floor(totalDuration / (1000 * 60 * 60));
  const durationMinutes = Math.floor((totalDuration % (1000 * 60 * 60)) / (1000 * 60));
  const avgTracks = filteredPlaylists.length > 0 ? (totalTracks / filteredPlaylists.length).toFixed(1) : '0';

  return (
    <div className="app">
      <header className="app-header">
        <h1>SPOTIFY PLAYLIST MANAGER</h1>
        <div className="status">
          {authenticated ? (
            <span>
              ✓ Authenticated{' '}
              <button onClick={handleLogout} className="logout-btn">
                [logout]
              </button>
            </span>
          ) : (
            <span>Not authenticated</span>
          )}
        </div>
      </header>

      <div className="search-bar">
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search playlists (supports regex)..."
          className={`search-input ${searchError ? 'search-error' : ''}`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={!authenticated}
        />
        {searchError && (
          <span className="search-error-message">{searchError}</span>
        )}
      </div>

      <div className="stats-bar">
        <span>Showing {filteredPlaylists.length} of {playlists.length} playlists</span>
        <span>{selectedIds.size} selected</span>
        <span>Total tracks: {totalTracks.toLocaleString()}</span>
        <span>Total duration: {durationHours}h {durationMinutes}m</span>
        <span>Avg: {avgTracks} tracks/playlist</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <span>Show:</span>
          <button
            className={`filter-toggle ${ownershipFilter === 'all' ? 'active' : ''}`}
            onClick={() => setOwnershipFilter('all')}
            disabled={!authenticated}
          >
            All
          </button>
          <button
            className={`filter-toggle ${ownershipFilter === 'mine' ? 'active' : ''}`}
            onClick={() => setOwnershipFilter('mine')}
            disabled={!authenticated}
          >
            Mine
          </button>
          <button
            className={`filter-toggle ${ownershipFilter === 'others' ? 'active' : ''}`}
            onClick={() => setOwnershipFilter('others')}
            disabled={!authenticated}
          >
            Others
          </button>
        </div>
      </div>

      <div className="table-container">
        {!authenticated ? (
          <div className="auth-container">
            <p className="placeholder">
              Connect your Spotify account to manage your playlists
            </p>
            <button
              onClick={handleLogin}
              disabled={loading}
              className="auth-button"
            >
              {loading ? 'Authenticating...' : 'Connect with Spotify'}
            </button>
            {error && <p className="error-message">{error}</p>}
          </div>
        ) : playlistsLoading ? (
          <p className="placeholder">Loading playlists from database...</p>
        ) : playlistsError ? (
          <div className="auth-container">
            <p className="error-message">{playlistsError}</p>
          </div>
        ) : playlists.length === 0 ? (
          <div className="auth-container">
            <p className="placeholder">No playlists found in database</p>
            <button onClick={handleSync} disabled={syncing} className="auth-button">
              {syncing ? 'Syncing from Spotify...' : 'Sync Playlists from Spotify'}
            </button>
          </div>
        ) : filteredPlaylists.length === 0 && searchQuery ? (
          <div className="auth-container">
            <p className="placeholder">
              No playlists match "{searchQuery}"
            </p>
          </div>
        ) : (
          <div className="playlist-list">
            <div className="playlist-table">
              <div className="table-header">
                <div
                  className="col-checkbox sortable-header"
                  onClick={handleSelectAll}
                  title="Select all visible"
                >
                  {selectedIds.size === filteredPlaylists.length && filteredPlaylists.length > 0 ? '[x]' : '[ ]'}
                </div>
                <div
                  className="col-name sortable-header"
                  onClick={() => handleSort('name')}
                >
                  NAME {sortColumn === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                </div>
                <div
                  className="col-tracks sortable-header"
                  onClick={() => handleSort('track_count')}
                >
                  TRACKS {sortColumn === 'track_count' && (sortDirection === 'asc' ? '↑' : '↓')}
                </div>
                <div
                  className="col-duration sortable-header"
                  onClick={() => handleSort('duration_ms')}
                >
                  DURATION {sortColumn === 'duration_ms' && (sortDirection === 'asc' ? '↑' : '↓')}
                </div>
                <div
                  className="col-owner sortable-header"
                  onClick={() => handleSort('owner')}
                >
                  OWNER {sortColumn === 'owner' && (sortDirection === 'asc' ? '↑' : '↓')}
                </div>
                <div className="col-unlinked">⚠</div>
                <div className="col-tags">TAGS</div>
              </div>
              {filteredPlaylists.map((playlist) => {
                const selected = isSelected(playlist.spotify_id);
                return (
                  <div
                    key={playlist.spotify_id}
                    className={`table-row ${selected ? 'selected' : ''}`}
                    onClick={(e) => handleRowClick(playlist.spotify_id, e)}
                    onContextMenu={(e) => handleContextMenu(playlist, e)}
                  >
                    <div
                      className="col-checkbox"
                      onClick={(e) => handleCheckboxClick(playlist.spotify_id, e)}
                    >
                      {selected ? '[x]' : '[ ]'}
                    </div>
                    <div className="col-name">{playlist.name}</div>
                    <div className="col-tracks">{playlist.track_count}</div>
                    <div className="col-duration">{formatDuration(playlist.duration_ms)}</div>
                    <div className="col-owner" style={{ color: playlist.is_owner ? '#0f0' : '#0a0' }}>
                      {playlist.is_owner ? 'you' : playlist.owner}
                    </div>
                    <div className="col-unlinked">-</div>
                    <div className="col-tags">{playlist.tags || '-'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="action-bar">
        <button disabled>MERGE</button>
        <button disabled>RENAME</button>
        <button onClick={handleTagClick} disabled={!authenticated || selectedIds.size === 0}>
          TAG
        </button>
        <button disabled>SUBTRACT</button>
        <button disabled>INTERSECT</button>
        <button
          onClick={handleDeleteClick}
          disabled={!authenticated || selectedIds.size === 0}
        >
          DELETE
        </button>
        <button disabled>SETTINGS</button>
        <button onClick={handleSync} disabled={!authenticated || syncing}>
          {syncing ? 'SYNCING...' : 'SYNC'}
        </button>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <DeleteConfirmationModal
          playlists={playlistsToDelete}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          deleting={deleting}
        />
      )}

      {/* Tag modal */}
      {showTagModal && (
        <TagModal
          playlists={playlistsToTag}
          onConfirm={handleTagConfirm}
          onCancel={handleTagCancel}
          saving={savingTags}
        />
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          playlist={contextMenu.playlist}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={handleCloseContextMenu}
          onOpenInSpotify={handleOpenInSpotify}
          onCopyLink={handleCopyLink}
          onCopyId={handleCopyId}
          onRename={() => {}}
          onDelete={handleContextDelete}
          onEditTags={handleContextEditTags}
          onFindDuplicates={() => {}}
          onRecoverUnlinked={() => {}}
          onExportCsv={() => {}}
        />
      )}
    </div>
  );
}

export default App;
