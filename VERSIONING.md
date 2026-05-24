# Versioning

Recommended workflow for Running Academy HUB CRM:

## Source of Truth

- The current working version lives in the project root:
  - `src/`
  - `docs/`
  - `README.md`
  - `appsscript.json`
- Stable snapshots live in `versions/`.

## Version Names

Use semantic version names:

- `v1.0.0-free-google-apps-script` - first working Apps Script CRM scaffold.
- `v1.1.0-*` - new features without breaking setup.
- `v1.2.0-*` - larger feature additions.
- `v2.0.0-*` - major architecture change.

## GitHub Workflow

Best practice:

1. Keep the latest code in the repository root.
2. Commit every meaningful change.
3. Create a GitHub release/tag for stable versions.
4. Keep `versions/` only for handoff snapshots that should be easy to download or copy.

This avoids having the same code duplicated many times as the project grows, while still giving you named versions you can return to.

## Current Snapshot

The first local snapshot is:

```text
versions/v1.0.0-free-google-apps-script/
```

It contains the Apps Script backend, UI, manifest, and setup docs.

## Sync Status

GitHub connector write access was verified on 2026-05-24.
