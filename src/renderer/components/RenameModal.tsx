import { useState, useEffect, useMemo } from 'react';
import type { LocalPlaylist } from '@shared/types';
import './RenameModal.css';

interface RenameModalProps {
  playlists: LocalPlaylist[];
  onConfirm: (findPattern: string, replacePattern: string) => Promise<void>;
  onCancel: () => void;
  renaming: boolean;
}

interface PreviewItem {
  playlist: LocalPlaylist;
  original: string;
  renamed: string;
  changed: boolean;
  error?: string;
}

export function RenameModal({
  playlists,
  onConfirm,
  onCancel,
  renaming,
}: RenameModalProps) {
  const [findPattern, setFindPattern] = useState('');
  const [replacePattern, setReplacePattern] = useState('');
  const [regexError, setRegexError] = useState<string | null>(null);

  // Compute preview of renames
  const preview = useMemo((): PreviewItem[] => {
    if (!findPattern) {
      return playlists.map(p => ({
        playlist: p,
        original: p.name,
        renamed: p.name,
        changed: false,
      }));
    }

    let regex: RegExp;
    try {
      regex = new RegExp(findPattern, 'g');
      setRegexError(null);
    } catch (err) {
      setRegexError(err instanceof Error ? err.message : 'Invalid regex pattern');
      return playlists.map(p => ({
        playlist: p,
        original: p.name,
        renamed: p.name,
        changed: false,
        error: 'Invalid pattern',
      }));
    }

    return playlists.map(playlist => {
      if (!playlist.is_owner) {
        return {
          playlist,
          original: playlist.name,
          renamed: playlist.name,
          changed: false,
          error: 'Not owned',
        };
      }

      try {
        const renamed = playlist.name.replace(regex, replacePattern);
        return {
          playlist,
          original: playlist.name,
          renamed,
          changed: renamed !== playlist.name,
        };
      } catch (err) {
        return {
          playlist,
          original: playlist.name,
          renamed: playlist.name,
          changed: false,
          error: 'Replace error',
        };
      }
    });
  }, [playlists, findPattern, replacePattern]);

  const stats = useMemo(() => {
    const total = preview.length;
    const changed = preview.filter(p => p.changed).length;
    const errors = preview.filter(p => p.error).length;
    const skipped = preview.filter(p => !p.playlist.is_owner).length;
    return { total, changed, errors, skipped };
  }, [preview]);

  const handleConfirm = async () => {
    if (!findPattern || stats.changed === 0 || regexError) return;
    await onConfirm(findPattern, replacePattern);
  };

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !renaming) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onCancel, renaming]);

  return (
    <div className="modal-overlay" onClick={renaming ? undefined : onCancel}>
      <div className="modal rename-modal" onClick={(e) => e.stopPropagation()}>
        <h2>BULK RENAME (REGEX)</h2>

        <div className="modal-section">
          <div className="rename-inputs">
            <div className="input-group">
              <label>Find Pattern (Regex):</label>
              <input
                type="text"
                value={findPattern}
                onChange={(e) => setFindPattern(e.target.value)}
                placeholder="e.g., ^(\d{2}) "
                className="rename-input"
                disabled={renaming}
                autoFocus
              />
            </div>

            <div className="input-group">
              <label>Replace With:</label>
              <input
                type="text"
                value={replacePattern}
                onChange={(e) => setReplacePattern(e.target.value)}
                placeholder="e.g., 20$1 "
                className="rename-input"
                disabled={renaming}
              />
            </div>
          </div>

          {regexError && (
            <div className="rename-error">
              ⚠ Regex Error: {regexError}
            </div>
          )}

          <div className="rename-help">
            <strong>Regex Examples:</strong>
            <div className="help-examples">
              <div>
                <code>^24 </code> → <code>2024 </code>
                <span className="help-desc">Prefix "24 " with "20"</span>
              </div>
              <div>
                <code>^(\d{'{'}2{'}'}) </code> → <code>20$1 </code>
                <span className="help-desc">Capture 2 digits, prefix with "20"</span>
              </div>
              <div>
                <code> - old$</code> → <code></code>
                <span className="help-desc">Remove " - old" suffix</span>
              </div>
              <div>
                <code>\[.*?\]</code> → <code></code>
                <span className="help-desc">Remove text in brackets</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-section">
          <div className="rename-stats">
            <span>Total: {stats.total}</span>
            <span className="stat-changed">Will Rename: {stats.changed}</span>
            {stats.skipped > 0 && (
              <span className="stat-skipped">Skipped (not owned): {stats.skipped}</span>
            )}
            {stats.errors > 0 && (
              <span className="stat-error">Errors: {stats.errors}</span>
            )}
          </div>

          <div className="rename-preview-container">
            <div className="rename-preview-header">Preview:</div>
            <div className="rename-preview">
              {preview.length === 0 ? (
                <div className="preview-empty">No playlists selected</div>
              ) : (
                preview.slice(0, 20).map((item) => (
                  <div
                    key={item.playlist.spotify_id}
                    className={`preview-item ${item.changed ? 'changed' : ''} ${item.error ? 'error' : ''}`}
                  >
                    <div className="preview-original">{item.original}</div>
                    <div className="preview-arrow">→</div>
                    <div className="preview-renamed">
                      {item.error ? (
                        <span className="preview-error-text">({item.error})</span>
                      ) : (
                        item.renamed
                      )}
                    </div>
                  </div>
                ))
              )}
              {preview.length > 20 && (
                <div className="preview-more">
                  ... and {preview.length - 20} more
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onCancel} disabled={renaming}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={renaming || !findPattern || stats.changed === 0 || regexError !== null}
            className="primary"
          >
            {renaming ? 'Renaming...' : `Rename ${stats.changed} Playlist${stats.changed !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}
