# Setup Guide

## Prerequisites

1. Node.js 18+ and npm installed
2. Spotify account
3. Spotify Developer App credentials

## Step 1: Get Spotify API Credentials

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create app"
4. Fill in the details:
   - **App name:** Spotify Playlist Manager
   - **App description:** Desktop app for advanced playlist management
   - **Redirect URI:** `http://localhost:8888/callback`
   - **APIs used:** Web API
5. Click "Save"
6. Copy your **Client ID** (you'll need this next)

## Step 2: Configure Environment Variables

1. Open the `.env` file in the project root
2. Replace `your_client_id_here` with your actual Spotify Client ID:

```env
VITE_SPOTIFY_CLIENT_ID=your_actual_client_id_here
```

## Step 3: Install Dependencies

```bash
npm install
```

## Step 4: Run the Application

```bash
npm run electron:dev
```

## Step 5: Authenticate

1. The app will open with a terminal-style interface
2. Click the **"Connect with Spotify"** button
3. Your browser will open to Spotify's authorization page
4. Review the permissions and click **"Agree"**
5. You'll be redirected to a success page (you can close it)
6. The app will now show "✓ Authenticated"

## Authentication Features

### What's Implemented

✅ **OAuth 2.0 with PKCE** - Secure authentication without client secret
✅ **Token Storage** - Encrypted storage using electron-store
✅ **Auto-Refresh** - Tokens automatically refresh when expired
✅ **Logout** - Clear stored credentials
✅ **Persistent Auth** - Stays logged in between app restarts

### How It Works

1. **PKCE Flow:**
   - Generates cryptographically secure code verifier
   - Creates SHA-256 code challenge
   - Exchanges authorization code for tokens

2. **Local Callback Server:**
   - Runs on `localhost:8888`
   - Receives OAuth callback
   - Styled with terminal aesthetic

3. **Secure Storage:**
   - Tokens encrypted with electron-store
   - Stored in OS-specific location
   - Auto-loads on app startup

4. **Token Refresh:**
   - Checks expiration before each API call
   - Automatically refreshes with 5-minute buffer
   - Seamless re-authentication if refresh fails

## Troubleshooting

### "VITE_SPOTIFY_CLIENT_ID not found"

Make sure:
- `.env` file exists in project root
- Client ID is set correctly
- No extra spaces or quotes around the value

### "Redirect URI mismatch"

Make sure:
- You added `http://localhost:8888/callback` to your Spotify app settings
- The URI is exactly as shown (no trailing slash)

### "Authentication failed"

Try:
- Checking your internet connection
- Verifying your Spotify account is active
- Restarting the app
- Clearing tokens: Delete `~/Library/Application Support/spotify-playlist-manager/` (macOS)

### Browser doesn't open

- Check if the app has permission to open URLs
- Try copying the URL from the console and opening manually

## Next Steps

After successful authentication, you can:

1. **Fetch Playlists** (TODO: Not yet implemented)
2. **Search & Filter** (TODO: Not yet implemented)
3. **Bulk Operations** (TODO: Not yet implemented)

See [CLAUDE.md](./CLAUDE.md) for the full development roadmap.

## File Structure

```
src/main/
├── auth.ts          # OAuth authentication logic
├── pkce.ts          # PKCE code generation
├── ipc-handlers.ts  # IPC communication
├── preload.ts       # Secure API exposure
└── index.ts         # Main process entry

src/renderer/
├── App.tsx          # Main UI component
└── electron.d.ts    # TypeScript declarations
```

## Security Notes

- Client ID is public and safe to commit (no secret needed with PKCE)
- Tokens are encrypted at rest
- Context isolation enabled
- No Node.js integration in renderer
- All IPC communication validated

## Development Commands

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Build for production
npm run build

# Build for specific platform
npm run build:mac
npm run build:win
npm run build:linux
```
