# Testing GitHub Actions Workflows

This guide explains how to test the CI/CD workflows locally and on GitHub.

## YAML Validation ✅

The workflow files have been validated using `yamllint`:
- `build.yml` - ✅ Valid (minor style warnings only)
- `release.yml` - ✅ Valid (minor style warnings only)

## Local Testing

### 1. Test Build Scripts

Before pushing to GitHub, test that the build scripts work locally:

```bash
# Test TypeScript compilation
npm run typecheck

# Test local build for your platform
npm run electron:build

# Or test specific platforms
npm run build:mac     # macOS only
npm run build:win     # Requires Wine or Windows
npm run build:linux   # Requires Linux or Docker
```

**Expected output:**
- Build artifacts in `release/` directory
- No TypeScript errors
- No build failures

### 2. Test with Act (Optional)

[Act](https://github.com/nektos/act) allows you to run GitHub Actions locally:

```bash
# Install act (macOS)
brew install act

# Run the build workflow locally
act -j build

# Run specific platform
act -j build --matrix os:ubuntu-latest
```

**Note**: Act has limitations with native dependencies like `better-sqlite3`.

## GitHub Testing

### Test the Build Workflow

1. **Create a test branch:**
   ```bash
   git checkout -b test-ci-build
   ```

2. **Commit and push the workflows:**
   ```bash
   git add .github/
   git commit -m "Add CI/CD workflows for multi-platform builds"
   git push origin test-ci-build
   ```

3. **Monitor the workflow:**
   - Go to: https://github.com/YOUR_USERNAME/spotify-power-playlists/actions
   - Click on the "Build" workflow run
   - Watch each platform build (macOS, Windows, Linux)

4. **Check artifacts:**
   - After successful build, click on the workflow run
   - Scroll to "Artifacts" section
   - Download and test the builds:
     - `mac-build` - .dmg and .zip files
     - `windows-build` - .exe installer
     - `linux-build` - .AppImage and .deb files

5. **Verify builds work:**
   - Test the downloaded artifacts on respective platforms
   - Ensure the app launches correctly
   - Check that Spotify authentication works

### Test the Release Workflow

⚠️ **Warning**: This will create a real GitHub release. Test carefully!

**Option A: Test with a pre-release tag**

1. **Create and push a test tag:**
   ```bash
   git tag v0.0.1-test
   git push origin v0.0.1-test
   ```

2. **Monitor the release workflow:**
   - Go to: https://github.com/YOUR_USERNAME/spotify-power-playlists/actions
   - Click on the "Release" workflow run
   - Verify all three platforms build successfully

3. **Check the release:**
   - Go to: https://github.com/YOUR_USERNAME/spotify-power-playlists/releases
   - Verify the release was created with all artifacts
   - Test downloading and installing from the release

4. **Clean up test release:**
   ```bash
   # Delete the test release from GitHub UI or use gh CLI
   gh release delete v0.0.1-test

   # Delete the local tag
   git tag -d v0.0.1-test

   # Delete the remote tag
   git push origin :refs/tags/v0.0.1-test
   ```

**Option B: Test with a draft release (Recommended)**

Modify `release.yml` temporarily to create draft releases:

```yaml
- name: Upload Release Assets
  uses: softprops/action-gh-release@v1
  with:
    files: release/${{ matrix.artifact_pattern }}
    draft: true  # Change to true for testing
```

Then create a test release as above. Draft releases won't notify users.

## Troubleshooting

### Build fails on GitHub but works locally

**Common causes:**
1. **Missing environment variables**: Check if `.env` is needed (it's gitignored)
2. **Platform-specific issues**: Test locally if possible or check workflow logs
3. **Node version mismatch**: Ensure local Node version matches workflow (18.x)

**Solution:**
```bash
# Use same Node version as CI
nvm install 18
nvm use 18
npm ci  # Clean install like CI does
```

### SQLite build errors on Linux

**Error**: `better-sqlite3` fails to build

**Solution**: The workflow installs `libsqlite3-dev`, but if issues persist:
```yaml
# Add to Linux build step:
- name: Install system dependencies (Linux)
  if: runner.os == 'Linux'
  run: |
    sudo apt-get update
    sudo apt-get install -y libsqlite3-dev build-essential
```

### Artifacts not uploading

**Error**: Artifact upload fails or files not found

**Debugging:**
```yaml
# Add debug step before artifact upload:
- name: Debug - List release directory
  run: |
    ls -la release/
    file release/*
```

### Release not triggering

**Checklist:**
- [ ] Tag follows pattern `v*.*.*` (e.g., `v1.0.0`, not `1.0.0`)
- [ ] Tag is pushed to remote: `git push origin v1.0.0`
- [ ] Workflow file is on the branch that the tag points to
- [ ] Repository has Actions enabled

**Verify:**
```bash
# Check tag format
git tag -l

# Check if tag is on remote
git ls-remote --tags origin
```

## Performance Notes

### Build Times (Approximate)

Based on typical Electron app builds on GitHub Actions:

- **macOS**: 8-12 minutes
- **Linux**: 6-10 minutes
- **Windows**: 8-15 minutes

**Total parallel build time**: ~12-15 minutes (runs concurrently)

### Cost Considerations

GitHub Actions minutes:
- **Public repositories**: Unlimited free minutes
- **Private repositories**: 2,000 free minutes/month, then paid

Approximate minutes per full build cycle:
- Build workflow: ~30 minutes (10 min × 3 platforms)
- Release workflow: ~30 minutes (10 min × 3 platforms)

## CI Badge

After confirming workflows work, add a badge to README.md:

```markdown
[![Build](https://github.com/YOUR_USERNAME/spotify-power-playlists/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/spotify-power-playlists/actions/workflows/build.yml)
```

## Next Steps

1. ✅ Workflows created and validated
2. ⏳ **Commit and push workflows** to trigger first build
3. ⏳ **Create app icons** (see `build/README.md`)
4. ⏳ **Test build workflow** with a PR or push
5. ⏳ **Test release workflow** with a test tag
6. ⏳ **Configure code signing** (optional, for production)
7. ⏳ **Add CI badge** to main README

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [electron-builder Documentation](https://www.electron.build/)
- [Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Act - Run workflows locally](https://github.com/nektos/act)
