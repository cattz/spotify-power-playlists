# Branching Strategy

This project uses a Git Flow-inspired branching strategy optimized for continuous deployment.

## Branch Overview

```
main (production-ready)
  ↑
develop (active development)
  ↑
feature/* (new features)
bugfix/* (bug fixes)
```

---

## Branch Descriptions

### `main`
- **Purpose**: Production-ready code
- **Protection**: Should be protected
- **Deploys**: Automatic releases on version tags
- **Updates**: Only via pull requests from `develop`

**Rules:**
- ✅ All tests must pass
- ✅ Requires code review
- ✅ Must be up-to-date with base branch
- ❌ No direct commits (except hotfixes)

### `develop`
- **Purpose**: Active development and integration
- **Protection**: Optional
- **Deploys**: Builds on every push (for testing)
- **Updates**: Via pull requests from feature/bugfix branches

**Rules:**
- ✅ All tests must pass
- ✅ TypeScript must compile
- ⚠️ Can be less stable than `main`

### `feature/*`
- **Purpose**: New features and enhancements
- **Created from**: `develop`
- **Merged to**: `develop` via PR
- **Naming**: `feature/add-bulk-rename`, `feature/subtract-operation`

**Workflow:**
```bash
git checkout develop
git pull
git checkout -b feature/my-new-feature
# ... work on feature ...
git push -u origin feature/my-new-feature
# Create PR to develop
```

### `bugfix/*`
- **Purpose**: Bug fixes
- **Created from**: `develop`
- **Merged to**: `develop` via PR
- **Naming**: `bugfix/fix-login-error`, `bugfix/broken-sync`

### `hotfix/*`
- **Purpose**: Critical production fixes
- **Created from**: `main`
- **Merged to**: Both `main` AND `develop`
- **Naming**: `hotfix/critical-auth-bug`

**Workflow:**
```bash
git checkout main
git pull
git checkout -b hotfix/critical-bug
# ... fix bug ...
git push -u origin hotfix/critical-bug
# Create PR to main
# After merge to main, also merge to develop
```

---

## Workflow Examples

### Adding a New Feature

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/bulk-regex-rename

# 3. Work on feature
git add .
git commit -m "Add bulk regex rename functionality"
git push -u origin feature/bulk-regex-rename

# 4. Create PR on GitHub: feature/bulk-regex-rename → develop
# 5. After review and approval, merge PR
# 6. Delete feature branch (automatically or manually)
```

### Fixing a Bug

```bash
# Same as feature, but use bugfix/* prefix
git checkout develop
git checkout -b bugfix/fix-duplicate-detection
# ... work ...
git push -u origin bugfix/fix-duplicate-detection
# Create PR to develop
```

### Creating a Release

```bash
# 1. Ensure develop is stable and tested
git checkout develop
git pull

# 2. Merge develop to main
git checkout main
git pull
git merge develop

# 3. Create version tag
git tag v0.2.0
git push origin main --tags

# 4. GitHub Actions automatically:
#    - Builds installers for all platforms
#    - Creates GitHub release
#    - Uploads installers to release
```

### Emergency Hotfix

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Create hotfix branch
git checkout -b hotfix/critical-security-fix

# 3. Fix the bug
git add .
git commit -m "Fix critical security vulnerability"
git push -u origin hotfix/critical-security-fix

# 4. Create PR to main
# 5. After merge, also merge to develop:
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

---

## CI/CD Pipeline

### Builds Trigger On:

**`develop` branch:**
- ✅ Runs tests
- ✅ Builds all platforms
- ✅ Uploads artifacts (7-day retention)
- ❌ Does NOT create releases

**`main` branch:**
- ✅ Runs tests
- ✅ Builds all platforms
- ✅ Uploads artifacts (7-day retention)
- ❌ Does NOT create releases (unless tagged)

**Version tags (`v*.*.*`):**
- ✅ Runs tests
- ✅ Builds all platforms
- ✅ Creates GitHub release
- ✅ Uploads installers to release

**Pull requests:**
- ✅ Runs tests
- ✅ TypeScript type checking
- ❌ Does NOT build installers

---

## Branch Protection Recommendations

### For `main`:

1. Go to: **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Enable:
   - ✅ Require a pull request before merging
     - ✅ Require approvals: 1
     - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
     - ✅ Require branches to be up to date before merging
     - Select: `Build (macos-latest)`, `Build (ubuntu-latest)`, `Build (windows-latest)`
   - ✅ Require conversation resolution before merging
   - ✅ Do not allow bypassing the above settings

### For `develop` (Optional):

1. Branch name pattern: `develop`
2. Enable:
   - ✅ Require status checks to pass before merging
     - Select: Build checks
   - ⚠️ Allow administrators to bypass (for quick fixes)

---

## Current Status

- ✅ `main` branch exists (production-ready)
- ✅ `develop` branch created (active development)
- ⚠️ Branch protection rules: **Not yet configured** (see recommendations above)

**Next Steps:**
1. Configure branch protection on `main`
2. Start using feature branches for new work
3. Use PRs for all changes to `main` and `develop`

---

## Best Practices

### Commit Messages

Follow Conventional Commits format:

```
feat: add bulk regex rename feature
fix: resolve duplicate track detection bug
docs: update setup guide
chore: update dependencies
refactor: simplify playlist sync logic
test: add tests for merge operation
```

### Pull Request Titles

```
[Feature] Add bulk regex rename
[Bugfix] Fix duplicate detection
[Hotfix] Critical auth vulnerability
[Docs] Update branching strategy
```

### Branch Naming

```
✅ feature/add-subtract-operation
✅ bugfix/fix-broken-links-export
✅ hotfix/critical-rate-limit
✅ feature/bulk-regex-rename

❌ my-feature
❌ fix-bug
❌ new-branch
```

---

## Git Commands Cheat Sheet

```bash
# Check current branch
git branch

# Switch branches
git checkout main
git checkout develop

# Create and switch to new branch
git checkout -b feature/my-feature

# Update current branch
git pull

# Push branch to remote
git push -u origin feature/my-feature

# Delete local branch
git branch -d feature/my-feature

# Delete remote branch
git push origin --delete feature/my-feature

# View all branches
git branch -a

# Merge develop into main
git checkout main
git merge develop

# Create and push tag
git tag v0.2.0
git push origin --tags
```

---

## FAQ

### When should I work directly on `develop`?

**Rarely**. For:
- Small documentation updates
- Minor config changes
- Hotfixes that need immediate integration

For everything else, use feature/bugfix branches.

### How do I test a feature before merging?

1. Push your feature branch
2. GitHub Actions will run tests
3. Check the Actions tab for build status
4. Download artifacts to test installers

### Can I merge `main` back to `develop`?

**Yes**, especially after hotfixes:
```bash
git checkout develop
git merge main
```

### What if a build fails on my PR?

1. Check the Actions tab for error details
2. Fix the issue in your feature branch
3. Push the fix - PR will automatically update
4. Wait for checks to pass

---

## Related Documentation

- `.github/workflows/build.yml` - Build workflow
- `.github/workflows/release.yml` - Release workflow
- `PROGRESS.md` - Development progress tracker
- `SETUP.md` - Developer setup guide
