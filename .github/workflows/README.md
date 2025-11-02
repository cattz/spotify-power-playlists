# GitHub Actions Workflows

This directory contains CI/CD workflows for building and releasing the Spotify Playlist Manager app.

## Workflows

### 1. Build (`build.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**What it does:**
- Builds the app for all three platforms (macOS, Windows, Linux) in parallel
- Runs TypeScript type checking
- Uploads build artifacts for testing (retained for 7 days)

**Artifacts produced:**
- **macOS**: `.dmg` and `.zip` files
- **Windows**: `.exe` installer and portable `.exe`
- **Linux**: `.AppImage` and `.deb` packages

### 2. Release (`release.yml`)

**Triggers:**
- Push tags matching pattern `v*.*.*` (e.g., `v0.1.0`, `v1.2.3`)

**What it does:**
- Builds the app for all three platforms
- Creates a GitHub release with auto-generated release notes
- Uploads all build artifacts to the release

**How to create a release:**

```bash
# Tag the current commit
git tag v0.1.0

# Push the tag to GitHub
git push origin v0.1.0
```

This will automatically trigger the release workflow and create a new GitHub release.

## Platform-Specific Notes

### macOS
- Requires `macos-latest` runner
- Produces `.dmg` (installer) and `.zip` (portable)
- Icon: `build/icon.icns` (must be provided)

### Windows
- Requires `windows-latest` runner
- Produces NSIS installer and portable `.exe`
- Icon: `build/icon.ico` (must be provided)

### Linux
- Requires `ubuntu-latest` runner
- Installs `libsqlite3-dev` system dependency
- Produces AppImage (universal) and `.deb` (Debian/Ubuntu)
- Icon: `build/icon.png` (must be provided)

## Build Matrix Strategy

Both workflows use a matrix strategy to build for all platforms in parallel:

```yaml
strategy:
  matrix:
    os: [macos-latest, ubuntu-latest, windows-latest]
```

This ensures:
- Faster builds (parallel execution)
- Consistent build environment
- Easy to add/remove platforms

## Requirements

### Required Files
- `electron-builder.json` - Build configuration (✅ already exists)
- `build/icon.icns` - macOS icon (TODO: add if missing)
- `build/icon.ico` - Windows icon (TODO: add if missing)
- `build/icon.png` - Linux icon (TODO: add if missing)

### Environment Variables
- `CI=true` - Prevents Electron from spawning extra processes during build

### Optional: Code Signing (for production)
To enable code signing, add these secrets to your GitHub repository:

**macOS:**
- `CSC_LINK` - Base64-encoded p12 certificate
- `CSC_KEY_PASSWORD` - Certificate password

**Windows:**
- `CSC_LINK` - Base64-encoded pfx certificate
- `CSC_KEY_PASSWORD` - Certificate password

Uncomment the relevant lines in `release.yml` to enable code signing.

## Testing Locally

To test builds locally before pushing:

```bash
# Build for your current platform
npm run electron:build

# Build for specific platforms
npm run build:mac
npm run build:win
npm run build:linux
```

## Troubleshooting

### Build fails on Linux with SQLite errors
The workflow automatically installs `libsqlite3-dev`. If issues persist, check `better-sqlite3` compatibility.

### Artifacts not uploading
- Verify the `release/` directory contains the expected files
- Check the artifact patterns in the workflow match the output files

### Release not creating
- Ensure the tag follows the pattern `v*.*.*`
- Check repository permissions (workflow needs `contents: write`)
- Verify `GITHUB_TOKEN` has sufficient permissions

## Future Enhancements

- [ ] Add automated testing before builds
- [ ] Enable code signing for macOS and Windows
- [ ] Add auto-update functionality
- [ ] Create nightly builds
- [ ] Add build badges to main README
