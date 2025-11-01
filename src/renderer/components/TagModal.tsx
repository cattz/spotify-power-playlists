/**
 * Tag management modal component
 */

import { useState, useEffect } from 'react';
import type { LocalPlaylist } from '@shared/types';

interface TagModalProps {
  playlists: LocalPlaylist[];
  onConfirm: (tags: string, append: boolean) => void;
  onCancel: () => void;
  saving?: boolean;
}

export function TagModal({ playlists, onConfirm, onCancel, saving = false }: TagModalProps) {
  const [tags, setTags] = useState('');
  const [append, setAppend] = useState(false);

  // Calculate common tags across selected playlists
  const commonTags = getCommonTags(playlists);

  // Pre-fill with common tags if all playlists have the same tags
  useEffect(() => {
    if (playlists.length === 1) {
      setTags(playlists[0].tags);
    }
  }, [playlists]);

  const handleConfirm = () => {
    onConfirm(tags.trim(), append);
  };

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">EDIT TAGS</div>

        <div className="modal-body">
          <p className="info-text">
            Editing tags for {playlists.length} playlist{playlists.length !== 1 ? 's' : ''}
          </p>

          <div className="form-group">
            <label htmlFor="tags-input">Tags (space-separated):</label>
            <input
              id="tags-input"
              type="text"
              className="text-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., notmine indie 25"
              autoFocus
              disabled={saving}
            />
          </div>

          {commonTags.length > 0 && (
            <div className="tag-suggestions">
              <div className="tag-suggestions-label">Common tags in selection:</div>
              <div className="tag-list">
                {commonTags.map(([tag, count]) => (
                  <div key={tag} className="tag-item">
                    • {tag} ({count} playlist{count !== 1 ? 's' : ''})
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="radio-label">
              <input
                type="radio"
                name="mode"
                checked={append}
                onChange={() => setAppend(true)}
                disabled={saving}
              />
              <span>Append to existing tags</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                name="mode"
                checked={!append}
                onChange={() => setAppend(false)}
                disabled={saving}
              />
              <span>Replace existing tags</span>
            </label>
          </div>
        </div>

        <div className="modal-actions">
          <button onClick={onCancel} disabled={saving} className="modal-button">
            Cancel
          </button>
          <button onClick={handleConfirm} disabled={saving} className="modal-button">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Get common tags across multiple playlists
 * Returns array of [tag, count] tuples sorted by count descending
 */
function getCommonTags(playlists: LocalPlaylist[]): [string, number][] {
  const tagCounts = new Map<string, number>();

  for (const playlist of playlists) {
    if (!playlist.tags) continue;

    const tags = playlist.tags.split(/\s+/).filter((t) => t.length > 0);
    for (const tag of tags) {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    }
  }

  return Array.from(tagCounts.entries()).sort((a, b) => b[1] - a[1]);
}
