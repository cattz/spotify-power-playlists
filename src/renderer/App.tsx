import { useEffect, useState, useRef } from 'react';
import './styles/app.css';
import { usePlaylists } from './hooks/usePlaylists';
import { useDebounce } from './hooks/useDebounce';
import { filterPlaylists } from './utils/filterPlaylists';
import { UI_CONSTANTS } from '@shared/constants';

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

  // Playlist management
  const {
    playlists,
    loading: playlistsLoading,
    error: playlistsError,
    syncing,
    syncPlaylists,
  } = usePlaylists();

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, UI_CONSTANTS.SEARCH_DEBOUNCE_MS);

  // Filter playlists based on search
  const filterResult = filterPlaylists(playlists, debouncedSearch);
  const filteredPlaylists = filterResult.playlists;
  const searchError = filterResult.error;

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
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
        <span>0 selected</span>
        <span>Total tracks: {totalTracks.toLocaleString()}</span>
        <span>Total duration: {durationHours}h {durationMinutes}m</span>
        <span>Avg: {avgTracks} tracks/playlist</span>
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
                <div className="col-checkbox">[ ]</div>
                <div className="col-name">NAME</div>
                <div className="col-tracks">TRACKS</div>
                <div className="col-owner">OWNER</div>
                <div className="col-modified">MODIFIED</div>
                <div className="col-tags">TAGS</div>
              </div>
              {filteredPlaylists.map((playlist) => (
                <div key={playlist.spotify_id} className="table-row">
                  <div className="col-checkbox">[ ]</div>
                  <div className="col-name">{playlist.name}</div>
                  <div className="col-tracks">{playlist.track_count}</div>
                  <div className="col-owner" style={{ color: playlist.is_owner ? '#0f0' : '#0a0' }}>
                    {playlist.is_owner ? 'you' : playlist.owner}
                  </div>
                  <div className="col-modified">-</div>
                  <div className="col-tags">{playlist.tags || '-'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="action-bar">
        <button disabled>MERGE</button>
        <button disabled>RENAME</button>
        <button disabled>TAG</button>
        <button disabled>SUBTRACT</button>
        <button disabled>INTERSECT</button>
        <button disabled>DELETE</button>
        <button disabled>SETTINGS</button>
        <button onClick={handleSync} disabled={!authenticated || syncing}>
          {syncing ? 'SYNCING...' : 'SYNC'}
        </button>
      </div>
    </div>
  );
}

export default App;
