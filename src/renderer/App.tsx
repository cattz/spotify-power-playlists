import { useEffect, useState } from 'react';
import './styles/app.css';

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

  // Check authentication status on mount
  useEffect(() => {
    checkAuthStatus();
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
          type="text"
          placeholder="Search playlists (supports regex)..."
          className="search-input"
          disabled={!authenticated}
        />
      </div>

      <div className="stats-bar">
        <span>Showing 0 of 0 playlists</span>
        <span>0 selected</span>
        <span>Total tracks: 0</span>
        <span>Total duration: 0h 0m</span>
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
        ) : (
          <p className="placeholder">
            Loading playlists... (TODO: Implement playlist table)
          </p>
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
        <button disabled>SYNC</button>
      </div>
    </div>
  );
}

export default App;
