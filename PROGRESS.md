# Development Progress

Last Updated: 2025-11-02

## Current Status

**Bulk Regex Rename** feature completed and tested! Background sync moved to on-demand operation.

---

## ✅ Completed Features

### Phase 1: Core Infrastructure (Previous Sessions)
- [x] Electron + React + TypeScript setup
- [x] Spotify OAuth authentication with PKCE
- [x] SQLite database setup
- [x] Fetch and display playlists in table
- [x] Basic search/filter with regex support
- [x] Selection (single, multi, range with Shift/Cmd)
- [x] Virtualization for performance (react-window)
- [x] Keyboard shortcuts (Cmd+F, Cmd+A, Cmd+T, Cmd+M, Escape)

### Phase 2: Basic Operations (Previous Sessions)
- [x] Delete playlists (owned only)
- [x] Tag management (add/replace/append)
- [x] Merge playlists with duplicate removal option
- [x] Context menu for playlist actions
- [x] Sync functionality (quick + background detail sync)

### Phase 3: Recent Features (Current Session)
- [x] **Unlinked Track Detection** (Commit: prior)
  - Detects tracks with `trackId === null`
  - Detects local files (`spotify:local:...`)
  - Detects tracks with `is_playable === false`
  - Detects tracks with missing URIs
  - Displays count in ⚠ column

- [x] **Fix Broken Links** (Commit: prior)
  - Attempts to recover unlinked tracks by searching Spotify
  - Matches by track name + artist name
  - Selects most popular match
  - Creates new playlist with recovered tracks
  - Shows success/failure stats

- [x] **CSV Export for Failed Recoveries** (Commit: cdd7a72)
  - Exports tracks that couldn't be recovered
  - Saved to Desktop with timestamped filename
  - Format: `{PlaylistName}_failed_tracks_{Date}.csv`
  - Includes: Track Name, Artist Name, Original URI, Reason

- [x] **Owner Filter** (Already existed, verified working)
  - Filter buttons in stats bar: All / Mine / Others
  - Backend logic at App.tsx:90-94
  - UI at App.tsx:593-616
  - Proper CSS styling with active states

- [x] **Remove Duplicates** (Commit: ea0d61c)
  - Detects duplicate tracks by Spotify URI
  - Keeps only first occurrence
  - Creates new playlist: `{original} - No Duplicates`
  - Returns stats: original count, unique count, duplicates removed
  - Accessible via context menu

- [x] **Rate Limit Protection** (Commit: 1a00d7d)
  - Increased background sync delay from 2s to 5s
  - Now processes ~1 request/second sustained
  - Takes ~13 minutes for 794 playlists instead of ~5 minutes

- [x] **Bulk Regex Rename** (Commit: 9ff14c5, 12f5076) ⭐
  - Find/replace pattern with full regex support
  - Live preview showing original → renamed
  - Supports capture groups (e.g., `^(\d{2})` → `20$1`)
  - Statistics display: total, will rename, skipped (not owned), errors
  - Context menu integration (smart selection handling)
  - Keyboard shortcut: Cmd/Ctrl + R
  - Help section with common regex examples
  - Regex validation with clear error messages
  - **Tested and working!**

- [x] **On-Demand Background Sync** (Commit: 9ff14c5)
  - Removed automatic trigger after main sync to avoid rate limiting
  - Added manual "SYNC DETAILS" button in action bar
  - Main SYNC now fast (only fetches playlist names/IDs)
  - SYNC DETAILS fetches full metadata (track counts, durations, followers, unlinked tracks)
  - Shows completion stats and refreshes view after sync
  - Prevents concurrent sync operations

---

## 🐛 Known Issues

### Critical
- None currently

### Minor
- Multiple dev server processes running in background (can be cleaned up)

---

## 📋 Pending Features (From CLAUDE.md)

### High Priority
1. **Subtract Operation (A - B)**
   - Remove tracks from B that exist in A
   - Create new playlist with result
   - Dialog for source selection

3. **Intersect Operation (A ∩ B)**
   - Find tracks common to all selected playlists
   - Create new playlist with result
   - Support 2+ playlists

4. **Export to CSV**
   - Export playlist metadata to CSV
   - Export track lists to CSV
   - Choose fields to include

### Medium Priority
5. Settings panel (basic structure exists)
6. More keyboard shortcuts (some implemented: Cmd+F, Cmd+A, Cmd+T, Cmd+M)
7. Auto-sync scheduling
8. Undo/redo for operations (limited by Spotify API)

### Low Priority (Post-MVP)
9. Playlist templates
10. Smart playlists (auto-update based on rules)
11. BPM and key analysis (via Spotify Audio Features API)
12. Genre/mood visualization
13. Backup/restore playlists
14. Cloud sync for tags
15. Plugin system for custom operations
16. Dark/light/custom themes

---

## 🏗️ Architecture Overview

### Database Schema
```sql
-- playlists table
CREATE TABLE playlists (
    spotify_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    owner TEXT NOT NULL,
    track_count INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    followers INTEGER DEFAULT 0,
    is_owner BOOLEAN DEFAULT 0,
    created_at TEXT,
    modified_at TEXT,
    tags TEXT DEFAULT '',
    last_synced INTEGER DEFAULT 0,
    snapshot_id TEXT,
    unlinked_count INTEGER DEFAULT 0  -- Added for broken track detection
);
```

### File Structure
```
src/
├── main/                           # Electron main process
│   ├── index.ts                   # App entry point
│   ├── auth.ts                    # Spotify OAuth (PKCE flow)
│   ├── database.ts                # SQLite operations
│   ├── playlist-sync.ts           # Sync with unlinked detection (lines 90-94)
│   ├── playlist-operations.ts     # Delete, merge, fix broken, remove duplicates
│   ├── ipc-handlers.ts            # IPC communication
│   └── preload.ts                 # Secure API exposure (contextBridge)
├── renderer/                       # React application
│   ├── App.tsx                    # Main component (owner filter: lines 90-94, 593-616)
│   ├── components/
│   │   ├── ContextMenu.tsx        # Right-click menu
│   │   ├── DeleteConfirmationModal.tsx
│   │   ├── TagModal.tsx
│   │   ├── MergeModal.tsx
│   │   ├── RenameModal.tsx        # Bulk regex rename with live preview
│   │   ├── RenameModal.css        # Rename modal styling
│   │   └── SetupGuideModal.tsx    # User setup guide for Spotify credentials
│   ├── hooks/
│   │   ├── usePlaylists.ts
│   │   ├── useDebounce.ts
│   │   └── useSelection.ts
│   ├── utils/
│   │   └── filterPlaylists.ts
│   └── styles/
│       └── app.css                # Terminal hacker aesthetic
└── shared/
    ├── types.ts                   # Shared TypeScript types
    └── constants.ts               # App-wide constants
```

### Key Implementation Details

**Unlinked Track Detection Logic** (playlist-sync.ts:178-182):
```typescript
const isUnlinked =
  !item.track ||
  item.track.id === null ||
  item.track.is_playable === false ||
  !item.track.uri;
```

**Owner Filter Logic** (App.tsx:90-94):
```typescript
if (ownershipFilter === 'mine') {
  filteredPlaylists = filteredPlaylists.filter((p) => p.is_owner);
} else if (ownershipFilter === 'others') {
  filteredPlaylists = filteredPlaylists.filter((p) => !p.is_owner);
}
```

**Rate Limiting Protection** (playlist-sync.ts:149-150):
```typescript
const BATCH_SIZE = 5;
const DELAY_MS = 5000;  // 5 seconds between batches
```

---

## 📊 Performance Metrics

### Current Performance (with 794 playlists)
- Initial load from database: <1 second
- Quick sync (basic metadata): ~30 seconds
- Background detail sync: ~13 minutes (with 5s delay)
- Search/filter with regex: <100ms (debounced 150ms)
- Table rendering: Virtualized, ~50 rows at a time

### Spotify API Usage
- Quick sync: ~16 requests (794 playlists ÷ 50 per request)
- Background detail sync: ~794 requests (1 per playlist)
- Rate limit: 5s delay = ~720 requests/hour sustained

---

## 🚀 Recent Commits

| Commit | Date | Description |
|--------|------|-------------|
| 12f5076 | 2025-11-02 | Fix TypeScript error: use correct RateLimitInfo property name |
| 9ff14c5 | 2025-11-02 | Add bulk regex rename feature and make background sync on-demand ⭐ |
| ea0d61c | 2025-11-01 | Add remove duplicates feature |
| 1a00d7d | 2025-11-01 | Increase background sync delay to 5s |
| cdd7a72 | 2025-11-01 | Export failed recovery tracks to CSV |

---

## 🧪 Testing Status

### Tested Features
- ✅ Authentication flow
- ✅ Playlist sync (quick + on-demand details)
- ✅ Search/filter with regex
- ✅ Selection (single, multi, range)
- ✅ Delete playlists
- ✅ Tag management
- ✅ Merge playlists
- ✅ Owner filter UI
- ✅ **Bulk regex rename** (tested with multiple patterns)
- ✅ **Context menu rename** (smart selection handling)
- ✅ Fix broken tracks
- ✅ Remove duplicates
- ✅ CSV export for failed recoveries

### Not Yet Tested
- [ ] Large-scale rename operations (>50 playlists)
- [ ] All possible regex edge cases
- [ ] Windows compatibility
- [ ] Linux compatibility

---

## 🔧 Development Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Spotify Developer Account with registered app

### Running the App
```bash
# Install dependencies
npm install

# Run in development mode
npm run electron:dev

# Build for production
npm run electron:build
```

### Environment Variables
Create `.env` in project root:
```
VITE_SPOTIFY_CLIENT_ID=your_client_id_here
```

### Database Location
- macOS: `~/Library/Application Support/spotify-playlist-manager/playlists.db`
- Windows: `%APPDATA%/spotify-playlist-manager/playlists.db`
- Linux: `~/.config/spotify-playlist-manager/playlists.db`

---

## 📝 Notes for Future Development

### Rate Limiting Best Practices
1. Always use delays between batched requests
2. Implement exponential backoff for retries
3. Store `retry-after` header value and respect it
4. Show user-friendly warnings when rate limited
5. Consider caching to reduce API calls

### Code Quality
- TypeScript strict mode enabled
- All API responses typed with interfaces
- Error handling with try-catch and user feedback
- Console logging for debugging (use `[Feature Name]` prefix)
- Git commits follow conventional format with co-authorship

### UI/UX Principles
- Terminal hacker aesthetic (black background, green text)
- Maximum information density
- Minimal animations (only hover states, <100ms transitions)
- Clear error messages in theme
- Keyboard shortcuts for power users
- Context menu for quick actions

---

## 🎯 Next Session Goals

1. **Implement Subtract Operation (A - B)** (High priority)
   - Select two playlists (A and B)
   - Remove all tracks from A that exist in B
   - Create new playlist with result
   - Modal dialog for source selection

2. **Implement Intersect Operation (A ∩ B)** (High priority)
   - Select 2+ playlists
   - Find tracks common to ALL selected playlists
   - Create new playlist with result
   - Modal dialog with preview

3. **Export Playlist Metadata to CSV** (Medium priority)
   - Export selected playlist metadata to CSV
   - Include: name, owner, track count, duration, followers, tags, etc.
   - Allow user to choose export location
   - Context menu option

4. **Settings Panel** (Medium priority)
   - Account info display
   - Manual/auto-sync configuration
   - Column visibility toggles
   - Database management options

---

## 🐛 Known Bugs to Fix

1. **Multiple dev servers running** - Need to kill old processes
2. **No visual feedback during long operations** - Add progress bars/spinners (partially done with loading states)

---

## 💡 Ideas for Improvement

- Add toast notifications instead of alert() dialogs
- Implement progress bars for long operations
- Add "undo last operation" feature (where possible)
- Batch operations: apply same action to multiple playlists at once
- Quick actions bar: "Delete all empty playlists", "Remove all duplicates", etc.
- Playlist statistics dashboard
- Export operation history to CSV
- Dark mode toggle (currently always dark)

---

## 📞 Support

For issues or questions:
- Check CLAUDE.md for project specifications
- Review this PROGRESS.md for current status
- Check git history for recent changes
- Test in isolation before committing
