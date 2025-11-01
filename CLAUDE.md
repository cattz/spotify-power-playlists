LAUDE.md - Spotify Playlist Manager

## Project Overview

A desktop application for advanced Spotify playlist management, designed for DJs and power users who manage hundreds of playlists. Built with Electron, TypeScript, and React, featuring a terminal-inspired hacker aesthetic with maximum information density.

**Target User:** DJ with 600+ playlists using strict naming conventions, needs bulk operations, regex filtering, and playlist recovery tools.

---

## Tech Stack

### Core
- **Electron** - Desktop application framework
- **TypeScript** - Primary language
- **React** - UI framework
- **SQLite** - Local metadata storage (tags, cache, history)

### Key Libraries
- **spotify-web-api-node** - Spotify API wrapper
- **better-sqlite3** - Synchronous SQLite
- **react-window** - Virtualized list rendering (performance with 600+ playlists)
- **electron-store** - Persistent configuration storage

### UI/Styling
- Minimal CSS (no framework needed)
- Monospace font (Courier New / Fira Code)
- Terminal color scheme (#000 background, #0f0 text)

---

## Architecture

```
spotify-playlist-manager/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts            # App entry point
│   │   ├── auth.ts             # Spotify OAuth handler
│   │   ├── database.ts         # SQLite operations
│   │   └── ipc-handlers.ts     # IPC communication handlers
│   ├── renderer/                # React application
│   │   ├── App.tsx             # Main application component
│   │   ├── components/
│   │   │   ├── PlaylistTable.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── ActionBar.tsx
│   │   │   ├── ContextMenu.tsx
│   │   │   └── KeyboardShortcuts.tsx
│   │   ├── hooks/
│   │   │   ├── useSpotify.ts
│   │   │   ├── useSelection.ts
│   │   │   └── useKeyboard.ts
│   │   ├── services/
│   │   │   ├── spotify-api.ts
│   │   │   └── playlist-operations.ts
│   │   └── styles/
│   │       └── app.css
│   ├── cli/                     # Standalone utilities
│   │   ├── generate-monthly-likes.ts
│   │   └── fix-unlinked-tracks.ts
│   └── shared/
│       ├── types.ts             # Shared TypeScript types
│       └── constants.ts
├── database/
│   └── schema.sql
├── package.json
├── tsconfig.json
└── electron-builder.json
```

---

## Database Schema

```sql
-- Local metadata storage for playlists
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
    tags TEXT DEFAULT '',           -- Space-separated tags
    last_synced INTEGER DEFAULT 0,  -- Unix timestamp
    snapshot_id TEXT                -- For change detection
);

CREATE TABLE operation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    operation_type TEXT NOT NULL,   -- 'merge', 'delete', 'rename', 'subtract', etc.
    playlists_affected TEXT,        -- JSON array of playlist IDs
    details TEXT,                   -- JSON object with operation details
    can_undo BOOLEAN DEFAULT 0
);

CREATE TABLE unlinked_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id TEXT NOT NULL,
    track_uri TEXT NOT NULL,
    track_name TEXT,
    artist_name TEXT,
    detected_at INTEGER NOT NULL,
    FOREIGN KEY (playlist_id) REFERENCES playlists(spotify_id)
);

CREATE INDEX idx_playlists_tags ON playlists(tags);
CREATE INDEX idx_playlists_name ON playlists(name);
CREATE INDEX idx_operation_history_timestamp ON operation_history(timestamp);
```

---

## Core Features Specification

### 1. Authentication & Setup

**OAuth Flow:**
- Use Spotify Authorization Code Flow with PKCE
- Required scopes:
  - `playlist-read-private`
  - `playlist-read-collaborative`
  - `playlist-modify-public`
  - `playlist-modify-private`
  - `user-library-read`
  - `user-library-modify`
- Store refresh token in encrypted file using `electron-store`
- Auto-refresh access token when expired

**Initial Sync:**
- Fetch all user playlists on first launch
- Fetch basic metadata (name, track count, owner, etc.)
- Store in SQLite for fast filtering
- Show progress bar during sync

---

### 2. Playlist Browser (Main UI)

**Layout:**
- Full-screen table with sortable columns
- Fixed header row
- Virtualized scrolling (render only visible rows)
- Fixed action bar at bottom

**Columns (all sortable):**
1. `[ ]` - Checkbox (35px)
2. `NAME` - Playlist name (250-400px, expandable)
3. `TRACKS` - Track count (70px, right-aligned)
4. `DURATION` - Total duration in `XXh XXm` format (80px, right-aligned)
5. `OWNER` - Owner name, "you" for owned playlists (100px)
6. `MODIFIED` - Last modified date `YYYY-MM-DD` (95px)
7. `CREATED` - Creation date `YYYY-MM-DD` (95px)
8. `FOLLOW` - Follower count (80px, right-aligned, "-" for followed playlists)
9. `TAGS` - Space-separated tags (200px+, expandable)
10. `⚠` - Warning icon if unlinked tracks detected (30px)

**Visual Indicators:**
- Owned playlists: owner column in bright green (`#0f0`)
- Followed playlists: owner column in dim green (`#0a0`)
- Selected rows: background `#1a1a1a`
- Hover: background `#111`
- Unlinked tracks: red warning icon `⚠` with count (e.g., "⚠ 12")

**Stats Bar (above table):**
```
Showing 42 of 623 playlists | 3 selected | Total tracks: 14,892 | Total duration: 62h 14m | Avg: 23.9 tracks/playlist
```

---

### 3. Search & Filtering

**Search Input:**
- Live filtering (debounced 150ms)
- Supports plain text substring matching
- Supports full regex patterns (auto-detect by presence of regex chars)
- Search across: playlist name + tags
- Show "Invalid regex" error if pattern is malformed

**Examples:**
```
24 MT              → Matches "24 MT Indie", "24 MT Electronic"
^24.*Indie$        → Regex: starts with "24", ends with "Indie"
\d{2} (MT|DF)      → Regex: two digits followed by MT or DF
notmine            → Matches any playlist tagged with "notmine"
```

**Keyboard Shortcut:** `Cmd/Ctrl + F` to focus search

---

### 4. Selection & Multi-Select

**Selection Methods:**
1. Click checkbox to select individual playlist
2. `Shift + Click` to select range
3. `Cmd/Ctrl + Click` to toggle individual selection
4. `Cmd/Ctrl + A` to select all visible (filtered) playlists
5. Click row (not checkbox) to open context menu

**Selection State:**
- Display count in stats bar: "3 selected"
- Enable/disable action buttons based on selection
- Clear selection with `Escape` key

---

### 5. Playlist Operations

#### 5.1 Merge Playlists

**Trigger:** Select 2+ playlists, click "MERGE" or press `Cmd/Ctrl + M`

**Dialog:**
```
╔═══════════════════════════════════════════╗
║ MERGE PLAYLISTS                           ║
╠═══════════════════════════════════════════╣
║                                           ║
║ Merging:                                  ║
║  • 24 MT Indie (187 tracks)              ║
║  • 24 MT Electronic (203 tracks)         ║
║  • 24 MT Chill Vibes (94 tracks)         ║
║                                           ║
║ Target Name: [24 MT All               ]  ║
║                                           ║
║ [ ] Remove duplicates                     ║
║ [x] Delete source playlists               ║
║                                           ║
║ Sort by: [Date Added ▼]                  ║
║                                           ║
║         [Cancel]  [Merge →]               ║
╚═══════════════════════════════════════════╝
```

**Logic:**
- Create new playlist with target name
- Add all tracks from source playlists in order
- If "Remove duplicates": keep only first occurrence (by Spotify URI)
- If "Delete source playlists": delete after successful merge
- Show progress bar during operation
- Add to operation history

#### 5.2 Delete Playlists

**Trigger:** Select 1+ playlists, click "DELETE" or press `Delete`

**Confirmation:**
```
╔═══════════════════════════════════════════╗
║ CONFIRM DELETE                            ║
╠═══════════════════════════════════════════╣
║                                           ║
║ Are you sure you want to delete:          ║
║  • 24 MT Indie (187 tracks)              ║
║  • 24 MT Electronic (203 tracks)         ║
║                                           ║
║ This action CANNOT be undone.             ║
║                                           ║
║         [Cancel]  [Delete]                ║
╚═══════════════════════════════════════════╝
```

**Logic:**
- Only allow deletion of owned playlists
- If followed playlists are selected, show error: "Cannot delete playlists you don't own"
- Delete playlists via Spotify API
- Remove from local database
- Cannot undo (Spotify API limitation)

#### 5.3 Rename Playlists (Bulk Regex)

**Trigger:** Select 1+ owned playlists, click "RENAME" or press `Cmd/Ctrl + R`

**Dialog:**
```
╔═══════════════════════════════════════════╗
║ BULK RENAME (Regex)                       ║
╠═══════════════════════════════════════════╣
║                                           ║
║ Find:    [^24 ]                           ║
║ Replace: [2024 ]                          ║
║                                           ║
║ Preview:                                  ║
║  24 MT Indie      → 2024 MT Indie        ║
║  24 MT Electronic → 2024 MT Electronic   ║
║  24 DF House      → 2024 DF House        ║
║                                           ║
║ Supports regex capture groups:            ║
║ Example: ^(\d{2}) → 20$1                 ║
║                                           ║
║         [Cancel]  [Apply]                 ║
╚═══════════════════════════════════════════╝
```

**Logic:**
- Apply regex find/replace to playlist names
- Show live preview of changes
- Only rename owned playlists (skip followed playlists with warning)
- Rename via Spotify API
- Update local database
- Add to operation history

#### 5.4 Subtract Playlists (A - B)

**Trigger:** Select exactly 2 playlists, click "SUBTRACT" or press `Cmd/Ctrl + -`

**Dialog:**
```
╔═══════════════════════════════════════════╗
║ SUBTRACT PLAYLISTS                        ║
╠═══════════════════════════════════════════╣
║                                           ║
║ From: [24 MT All (484 tracks)     ▼]    ║
║                                           ║
║ Subtract: [24 DF House (156 tracks)▼]   ║
║                                           ║
║ Result: ~328 tracks                       ║
║                                           ║
║ Target Name: [24 MT Minus House     ]    ║
║                                           ║
║         [Cancel]  [Create →]              ║
╚═══════════════════════════════════════════╝
```

**Logic:**
- Remove all tracks from B that exist in A (by Spotify URI)
- Create new playlist with result
- Add to operation history

#### 5.5 Intersect Playlists (A ∩ B)

**Trigger:** Select 2+ playlists, click "INTERSECT" or press `Cmd/Ctrl + &`

**Dialog:**
```
╔═══════════════════════════════════════════╗
║ INTERSECT PLAYLISTS                       ║
╠═══════════════════════════════════════════╣
║                                           ║
║ Finding common tracks in:                 ║
║  • 24 MT Indie (187 tracks)              ║
║  • 24 MT Electronic (203 tracks)         ║
║  • 24 MT Chill Vibes (94 tracks)         ║
║                                           ║
║ Result: ~18 tracks                        ║
║                                           ║
║ Target Name: [24 MT Common          ]    ║
║                                           ║
║         [Cancel]  [Create →]              ║
╚═══════════════════════════════════════════╝
```

**Logic:**
- Find tracks that appear in ALL selected playlists
- Create new playlist with result
- Add to operation history

#### 5.6 Tag Management

**Trigger:** Select 1+ playlists, click "TAG" or press `Cmd/Ctrl + T`

**Dialog:**
```
╔═══════════════════════════════════════════╗
║ EDIT TAGS                                 ║
╠═══════════════════════════════════════════╣
║                                           ║
║ Editing tags for 3 playlists              ║
║                                           ║
║ Tags (space-separated):                   ║
║ [notmine indie 25                      ]  ║
║                                           ║
║ Common tags in selection:                 ║
║  • indie (3 playlists)                    ║
║  • midtempo (2 playlists)                 ║
║                                           ║
║ [ ] Append to existing tags               ║
║ [x] Replace existing tags                 ║
║                                           ║
║         [Cancel]  [Save]                  ║
╚═══════════════════════════════════════════╝
```

**Logic:**
- Tags stored in local SQLite (not synced to Spotify)
- Space-separated string format
- Can append or replace tags
- Works on both owned and followed playlists

---

### 6. Context Menu (Right-Click)

**Triggered by:** Right-click on playlist row

**Menu Options:**
```
┌───────────────────────────┐
│ Open in Spotify           │
│ ──────────────────────────│
│ Copy Playlist Link        │
│ Copy Playlist ID          │
│ ──────────────────────────│
│ Rename (Cmd+R)            │
│ Delete (Del)              │
│ Edit Tags (Cmd+T)         │
│ ──────────────────────────│
│ Find Duplicates           │
│ Recover Unlinked Tracks   │
│ ──────────────────────────│
│ Export to CSV             │
└───────────────────────────┘
```

**Implementation:**
- Show menu at mouse position
- Close on click outside or `Escape`
- Execute action for single playlist (even if multiple selected)

---

### 7. Keyboard Shortcuts

**Global:**
- `Cmd/Ctrl + F` - Focus search bar
- `Cmd/Ctrl + A` - Select all (filtered)
- `Escape` - Clear selection / Close dialogs
- `Cmd/Ctrl + ,` - Open settings

**Operations:**
- `Cmd/Ctrl + M` - Merge selected playlists
- `Cmd/Ctrl + R` - Rename selected playlists
- `Cmd/Ctrl + T` - Edit tags
- `Cmd/Ctrl + -` - Subtract (A - B)
- `Cmd/Ctrl + &` - Intersect
- `Delete` - Delete selected playlists

**Navigation:**
- `↑/↓` - Navigate rows
- `Space` - Toggle selection
- `Shift + ↑/↓` - Extend selection
- `Enter` - Open in Spotify

**Show shortcuts overlay:** `Cmd/Ctrl + /`

---

### 8. Settings Panel

**Trigger:** Click "SETTINGS" button or press `Cmd/Ctrl + ,`

**Settings:**
```
╔═══════════════════════════════════════════╗
║ SETTINGS                                  ║
╠═══════════════════════════════════════════╣
║                                           ║
║ [Spotify Account]                         ║
║  Connected: your_username                 ║
║  [Disconnect]                             ║
║                                           ║
║ [Sync]                                    ║
║  Last synced: 2025-11-01 14:32            ║
║  [Sync Now]  [Auto-sync: Every 1h ▼]     ║
║                                           ║
║ [Display]                                 ║
║  [x] Show duration column                 ║
║  [x] Show created date column             ║
║  [x] Show followers column                ║
║  [ ] Compact mode (smaller rows)          ║
║                                           ║
║ [Advanced]                                ║
║  Database location: ~/Library/...         ║
║  [Export Database]                        ║
║  [Clear Cache]                            ║
║                                           ║
║                      [Close]              ║
╚═══════════════════════════════════════════╝
```

---

### 9. CLI Utilities

#### 9.1 Generate Monthly Liked Songs

**File:** `src/cli/generate-monthly-likes.ts`

**Usage:**
```bash
npm run generate-monthly-likes -- --month 2025-06
# or
npm run generate-monthly-likes -- --auto  # Current month
```

**Logic:**
- Fetch all tracks from "Liked Songs"
- Filter by `added_at` date matching specified month
- Create playlist named "YYMM Liked" (e.g., "2506 Liked")
- Add tracks sorted by `added_at` ascending
- Ignore if playlist already exists (idempotent)

**Output:**
```
[2025-11-01 14:45:32] Authenticating...
[2025-11-01 14:45:33] Fetching liked songs...
[2025-11-01 14:45:38] Found 1,247 liked songs
[2025-11-01 14:45:38] Filtering for 2025-06...
[2025-11-01 14:45:38] Found 89 tracks for June 2025
[2025-11-01 14:45:39] Creating playlist "2506 Liked"...
[2025-11-01 14:45:40] Adding 89 tracks...
[2025-11-01 14:45:42] ✓ Done! Playlist created: https://open.spotify.com/playlist/...
```

**Cron Job Setup (example):**
```bash
# Run on 1st of each month at 2am
0 2 1 * * cd /path/to/app && npm run generate-monthly-likes -- --auto
```

#### 9.2 Fix Unlinked Tracks

**File:** `src/cli/fix-unlinked-tracks.ts`

**Usage:**
```bash
npm run fix-unlinked -- --playlist "23 Classics Oldschool"
# or by ID
npm run fix-unlinked -- --playlist-id 3cEYpjA9oz9GiPac4AsH4n
```

**Logic:**
1. Fetch all tracks from specified playlist
2. Identify unlinked tracks (tracks with `is_playable: false` or null URIs)
3. For each unlinked track:
   - Extract track name + artist name
   - Search Spotify for `"track: {name} artist: {artist}"`
   - Sort results by popularity (descending)
   - Select most popular match
4. Create new playlist: "{original_name} - Recovered"
5. Add recovered tracks to new playlist
6. Print report of successful/failed recoveries

**Output:**
```
[2025-11-01 14:50:15] Fetching playlist "23 Classics Oldschool"...
[2025-11-01 14:50:16] Found 89 tracks (12 unlinked)
[2025-11-01 14:50:16] Attempting recovery...
[2025-11-01 14:50:18] ✓ "Gangsta's Paradise" by Coolio (popularity: 87)
[2025-11-01 14:50:19] ✓ "Jump Around" by House of Pain (popularity: 79)
[2025-11-01 14:50:20] ✗ "Old Track" by Unknown Artist (no matches found)
...
[2025-11-01 14:50:30] Recovered 10 / 12 tracks
[2025-11-01 14:50:31] Creating playlist "23 Classics Oldschool - Recovered"...
[2025-11-01 14:50:32] ✓ Done! https://open.spotify.com/playlist/...
```

---

## Error Handling

### Spotify API Errors

**Rate Limiting (429):**
- Implement exponential backoff
- Show toast notification: "Rate limited. Retrying in X seconds..."
- Queue operations and retry automatically

**Network Errors:**
- Show toast: "Connection lost. Retrying..."
- Retry up to 3 times with 2s delay
- If fails, show error dialog with option to retry manually

**Insufficient Permissions:**
- Show dialog: "Missing permissions. Please re-authenticate."
- Redirect to OAuth flow

**Playlist Not Found (404):**
- Remove from local database
- Show toast: "Playlist was deleted on Spotify. Removing from cache."

### Local Database Errors

**Database Corruption:**
- Show error dialog: "Database corrupted. Recreate?"
- Offer to delete and re-sync from Spotify

**Write Failures:**
- Show warning: "Failed to save tags. Retry?"
- Keep in-memory changes until save succeeds

---

## Performance Optimizations

### Virtualized List Rendering

Use `react-window` to render only visible rows:
- Render ~50 rows at a time
- Smooth scrolling with 600+ playlists
- Estimate row height: 30px

### Debounced Search

- Debounce search input by 150ms
- Show loading spinner if search takes >500ms

### Lazy Loading Metadata

- Initial load: fetch only playlist IDs and names
- Load full metadata (duration, followers) on-demand when scrolling
- Cache in SQLite for 1 hour

### Batch API Requests

- Fetch playlists in batches of 50 (Spotify API limit)
- Fetch tracks in batches of 100
- Use Promise.all() for parallel requests (max 5 concurrent)

---

## Visual Design Specification

### Color Palette

```css
--bg-primary: #000000;
--bg-secondary: #0a0a0a;
--bg-hover: #111111;
--bg-selected: #1a1a1a;

--text-primary: #0f0;        /* Bright green */
--text-secondary: #0a0;      /* Dim green */
--text-tertiary: #050;       /* Very dim green */

--border: #0f0;
--border-dim: #333;

--error: #f00;
--warning: #ff0;
```

### Typography

```css
font-family: 'Courier New', 'Fira Code', monospace;
font-size: 11px;
line-height: 1.4;
```

### Spacing

```css
--spacing-xs: 4px;
--spacing-sm: 8px;
--spacing-md: 12px;
--spacing-lg: 16px;
--spacing-xl: 24px;
```

### Animations

Minimal animations only:
- Hover states: instant
- Modal open/close: 100ms fade
- Toast notifications: 200ms slide from bottom

---

## Development Phases

### Phase 1: Core MVP (Week 1-2)
- [ ] Electron + React + TypeScript setup
- [ ] Spotify OAuth authentication
- [ ] Fetch and display playlists in table
- [ ] SQLite database setup
- [ ] Basic search/filter
- [ ] Selection (single, multi, range)
- [ ] Sync functionality

### Phase 2: Basic Operations (Week 2-3)
- [ ] Delete playlists
- [ ] Rename (single)
- [ ] Tag management
- [ ] Merge playlists
- [ ] Context menu
- [ ] Settings panel

### Phase 3: Advanced Operations (Week 3-4)
- [ ] Bulk regex rename
- [ ] Subtract operation
- [ ] Intersect operation
- [ ] Duplicate detection
- [ ] Export to CSV
- [ ] Keyboard shortcuts

### Phase 4: CLI Utilities (Week 4)
- [ ] Generate monthly liked songs script
- [ ] Fix unlinked tracks script
- [ ] Operation history
- [ ] Unlinked track detection in UI

### Phase 5: Polish & Optimization (Week 5)
- [ ] Virtualized list rendering
- [ ] Performance optimizations
- [ ] Error handling improvements
- [ ] Loading states and progress bars
- [ ] Toast notifications
- [ ] Keyboard shortcuts overlay

---

## Testing Strategy

### Unit Tests
- Spotify API wrapper functions
- Regex rename logic
- Set operations (merge, subtract, intersect)
- Tag parsing and storage

### Integration Tests
- OAuth flow
- Database operations
- Full operation workflows (merge → delete → undo)

### Manual Testing Checklist
- [ ] Test with 600+ playlists (performance)
- [ ] Test rate limiting handling
- [ ] Test network disconnection
- [ ] Test with followed (non-owned) playlists
- [ ] Test keyboard shortcuts
- [ ] Test on macOS and Windows

---

## Distribution

### Build Configuration

**electron-builder.json:**
```json
{
  "appId": "com.dj.spotify-playlist-manager",
  "productName": "Spotify Playlist Manager",
  "directories": {
    "output": "dist"
  },
  "files": [
    "build/**/*",
    "node_modules/**/*"
  ],
  "mac": {
    "category": "public.app-category.music",
    "target": ["dmg", "zip"]
  },
  "win": {
    "target": ["nsis", "portable"]
  },
  "linux": {
    "target": ["AppImage", "deb"]
  }
}
```

### Packaging
- macOS: DMG + auto-updater
- Windows: NSIS installer
- Linux: AppImage

---

## Security Considerations

1. **Token Storage:**
   - Store refresh token encrypted using `electron-store` with encryption
   - Never log tokens or credentials

2. **API Keys:**
   - Store Spotify Client ID in environment variables
   - Use PKCE flow (no client secret needed)

3. **Database:**
   - Local SQLite file with proper permissions (user read/write only)
   - No sensitive data stored (only public Spotify IDs and user-generated tags)

---

## Future Enhancements (Post-MVP)

- [ ] Playlist templates (create from templates)
- [ ] Smart playlists (auto-update based on rules)
- [ ] BPM and key analysis (via Spotify Audio Features API)
- [ ] Genre/mood visualization
- [ ] Backup/restore playlists
- [ ] Cloud sync for tags (optional)
- [ ] Plugin system for custom operations
- [ ] Dark/light/custom themes

---

## Dependencies

### Production
```json
{
  "electron": "^27.0.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "spotify-web-api-node": "^5.0.2",
  "better-sqlite3": "^9.0.0",
  "electron-store": "^8.1.0",
  "react-window": "^1.8.10"
}
```

### Development
```json
{
  "typescript": "^5.2.0",
  "@types/react": "^18.2.0",
  "@types/node": "^20.0.0",
  "electron-builder": "^24.6.0",
  "vite": "^5.0.0",
  "@vitejs/plugin-react": "^4.2.0"
}
```

---

## Open Questions & Decisions Needed

1. **Undo functionality:** Should we attempt to implement undo for operations? (Complex due to Spotify API limitations)
   - **Recommendation:** Log operations in history, but no true undo. User must manually revert.

2. **Offline mode:** Should the app work offline with cached data?
   - **Recommendation:** No offline mode for MVP. Show connection error if offline.

3. **Auto-sync frequency:** How often should we sync with Spotify?
   - **Recommendation:** Manual sync by default, with option for auto-sync every 1h/6h/24h

4. **Duplicate detection:** How to define "duplicate" tracks?
   - **Recommendation:** Same Spotify URI = duplicate. Ignore remixes/live versions unless URI matches.

5. **Export format:** CSV only, or also JSON/M3U?
   - **Recommendation:** CSV for MVP. JSON for power users (future enhancement).

---

## Notes for Claude Code

- **Prioritize performance:** With 600+ playlists, use virtualized rendering and debouncing
- **Regex validation:** Wrap regex operations in try-catch and show helpful error messages
- **Spotify API rate limits:** Be conservative with API calls. Batch operations where possible
- **Type safety:** Use strict TypeScript throughout. Define interfaces for all API responses
- **Error messages:** Use clear, actionable error messages in the hacker theme
- **Testing:** Test with large datasets. Include mock data generator for testing

---

## Success Criteria

The application is successful if:
1. ✅ Can load and filter 600+ playlists in <2 seconds
2. ✅ Regex bulk rename works on 50+ playlists simultaneously
3. ✅ Merge operation handles 10+ playlists with 2000+ total tracks
4. ✅ Unlinked track recovery has >80% success rate
5. ✅ UI remains responsive during long operations
6. ✅ No data loss (all operations are reliable)
7. ✅ Keyboard shortcuts work as expected
8. ✅ CLI utilities can be run via cron jobs

---

## Contact & Questions

For any questions during implementation:
- **Project Owner:** DJ / Power User
- **Preference:** TypeScript for learning
- **Style:** Challenge assumptions, ask questions, propose better approaches
- **Communication:** Clear, technical, no hand-holding needed
