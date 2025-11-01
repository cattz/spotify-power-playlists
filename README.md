# Spotify Playlist Manager

Advanced Spotify playlist management desktop app for DJs and power users managing 600+ playlists.

## Features

- **Bulk Operations**: Merge, subtract, intersect playlists
- **Regex Bulk Rename**: Rename multiple playlists with regex patterns
- **Advanced Filtering**: Search with regex support across names and tags
- **Local Tagging**: Custom tags stored locally
- **Unlinked Track Recovery**: Detect and recover unavailable tracks
- **CLI Utilities**: Generate monthly liked songs, fix unlinked tracks
- **Terminal Aesthetic**: Hacker-inspired UI with maximum information density

## Tech Stack

- **Electron** - Desktop framework
- **TypeScript** - Type-safe development
- **React** - UI framework
- **SQLite** - Local metadata storage
- **Vite** - Build tool
- **spotify-web-api-node** - Spotify API wrapper

## Prerequisites

- Node.js 18+ and npm
- Spotify account
- Spotify Developer App (for Client ID)

## Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd spotify-playlist-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Spotify API**
   - Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   - Create a new app
   - Add `http://localhost:8888/callback` to Redirect URIs
   - Copy the Client ID

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env and add your VITE_SPOTIFY_CLIENT_ID
   ```

## Development

```bash
# Run in development mode
npm run electron:dev

# Type check
npm run typecheck

# Lint
npm run lint
```

## Build

```bash
# Build for your current platform
npm run build

# Build for specific platforms
npm run build:mac
npm run build:win
npm run build:linux
```

## CLI Utilities

```bash
# Generate playlist from monthly liked songs
npm run generate-monthly-likes -- --month 2025-06
npm run generate-monthly-likes -- --auto  # Current month

# Fix unlinked tracks in a playlist
npm run fix-unlinked -- --playlist "Playlist Name"
npm run fix-unlinked -- --playlist-id 3cEYpjA9oz9GiPac4AsH4n
```

## Project Structure

```
spotify-playlist-manager/
├── src/
│   ├── main/           # Electron main process
│   ├── renderer/       # React application
│   ├── cli/            # Standalone utilities
│   └── shared/         # Shared types and constants
├── database/           # SQLite schema
└── ...
```

## Keyboard Shortcuts

- `Cmd/Ctrl + F` - Focus search
- `Cmd/Ctrl + A` - Select all
- `Cmd/Ctrl + M` - Merge playlists
- `Cmd/Ctrl + R` - Rename playlists
- `Cmd/Ctrl + T` - Edit tags
- `Delete` - Delete playlists
- `Escape` - Clear selection

See full list with `Cmd/Ctrl + /`

## License

MIT

## Development Status

🚧 **Work in Progress** - Currently in Phase 1 (MVP setup)

See [CLAUDE.md](./CLAUDE.md) for detailed specification and roadmap.
