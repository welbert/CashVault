# Versioning

The app follows [Semantic Versioning](https://semver.org): `MAJOR.MINOR.PATCH`.

| Change type | Example | When to bump |
|-------------|---------|--------------|
| `PATCH` | `0.1.0 → 0.1.1` | Bug fixes, no new features |
| `MINOR` | `0.1.0 → 0.2.0` | New features, backwards compatible |
| `MAJOR` | `0.1.0 → 1.0.0` | Breaking changes or major milestones |

## Files to update

The version must be kept in sync across **3 files**:

| File | Field | Line |
|------|-------|------|
| `package.json` | `"version"` | 5 |
| `src-tauri/Cargo.toml` | `version` | 3 |
| `src-tauri/tauri.conf.json` | `"version"` | 4 |

All three must always have the same value. The version shown in the sidebar
(`getVersion()` from `@tauri-apps/api/app`) is read from `tauri.conf.json` at
build time.

## Bumping the version

Edit each file manually at the indicated line:

| File | Line | Example |
|------|------|---------|
| `package.json` | 5 | `"version": "0.2.0"` |
| `src-tauri/Cargo.toml` | 3 | `version = "0.2.0"` |
| `src-tauri/tauri.conf.json` | 4 | `"version": "0.2.0"` |

> **Note:** avoid using PowerShell `Set-Content` to replace the version — it writes UTF-8 with BOM in PS 5.1, which breaks the Tauri JSON parser at build time.

## Release Notes

`RELEASE.md` (repo root) tracks changes per version, grouped under `## Features` / `## Fixes` (only add the subheadings a version actually has entries for):
- `**Fix:**` for bug fixes, under `## Fixes`
- `**Feature:**` for new functionality, under `## Features`

Work in progress always lives under a `# CashVault — Unreleased` section at the top of the file — created the first time a fix/feature needs it.

**Closing a release never renames or removes the `Unreleased` header.** In the release commit that bumps the version:
1. Keep the `# CashVault — Unreleased` header, but empty out its content (the `## Features` / `## Fixes` entries move out of it).
2. Right below it, add a new `# CashVault — vX.Y.Z` section containing exactly that content.

Before (about to release `0.3.2`):
```
# CashVault — Unreleased

## Fixes
- **Fix:** ...

---

# CashVault — v0.3.1
```

After:
```
# CashVault — Unreleased

---

# CashVault — v0.3.2

## Fixes
- **Fix:** ...

---

# CashVault — v0.3.1
```

`RELEASE.md` must always start with an `Unreleased` header — empty or not — followed by the versioned sections newest-first. If a release commit ever leaves `RELEASE.md` without an `Unreleased` header at the top, that's a mistake to fix immediately, not a valid state to build on.
