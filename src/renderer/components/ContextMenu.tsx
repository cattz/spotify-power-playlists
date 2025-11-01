/**
 * Context menu component for playlist actions
 */

import { useEffect } from 'react';
import type { LocalPlaylist } from '@shared/types';

interface ContextMenuProps {
  playlist: LocalPlaylist;
  x: number;
  y: number;
  onClose: () => void;
  onOpenInSpotify: () => void;
  onCopyLink: () => void;
  onCopyId: () => void;
  onRename: () => void;
  onDelete: () => void;
  onEditTags: () => void;
  onFindDuplicates: () => void;
  onRecoverUnlinked: () => void;
  onExportCsv: () => void;
}

export function ContextMenu({
  playlist,
  x,
  y,
  onClose,
  onOpenInSpotify,
  onCopyLink,
  onCopyId,
  onRename,
  onDelete,
  onEditTags,
  onFindDuplicates,
  onRecoverUnlinked,
  onExportCsv,
}: ContextMenuProps) {
  // Close on click outside or escape
  useEffect(() => {
    const handleClick = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Delay to prevent immediate close from the right-click event
    setTimeout(() => {
      document.addEventListener('click', handleClick);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleAction = (action: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    action();
    onClose();
  };

  return (
    <div
      className="context-menu"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="context-menu-item" onClick={handleAction(onOpenInSpotify)}>
        Open in Spotify
      </div>

      <div className="context-menu-separator" />

      <div className="context-menu-item" onClick={handleAction(onCopyLink)}>
        Copy Playlist Link
      </div>
      <div className="context-menu-item" onClick={handleAction(onCopyId)}>
        Copy Playlist ID
      </div>

      <div className="context-menu-separator" />

      <div className="context-menu-item context-menu-item-disabled" title="Not yet implemented">
        Rename (Cmd+R)
      </div>
      {playlist.is_owner && (
        <div className="context-menu-item" onClick={handleAction(onDelete)}>
          Delete (Del)
        </div>
      )}
      <div className="context-menu-item" onClick={handleAction(onEditTags)}>
        Edit Tags (Cmd+T)
      </div>

      <div className="context-menu-separator" />

      <div className="context-menu-item context-menu-item-disabled" title="Not yet implemented">
        Find Duplicates
      </div>
      {playlist.unlinked_count > 0 && (
        <div className="context-menu-item" onClick={handleAction(onRecoverUnlinked)}>
          Fix Broken Links ({playlist.unlinked_count})
        </div>
      )}

      <div className="context-menu-separator" />

      <div className="context-menu-item context-menu-item-disabled" title="Not yet implemented">
        Export to CSV
      </div>
    </div>
  );
}
