# Changelog

All notable changes to `@haruhimemoe/vcs` are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). While on 0.x, a change to merge results or change shapes is a minor version.

## [Unreleased]

### Changed

- CI runs CodeQL and a gitleaks scan of the full git history, and Dependabot covers dependencies and pinned actions. Dependencies are on their latest versions.

## [0.1.0] - 2026-10-05

### Added

- `diffText`, `diffChars`, `applyTextDiff`: Myers line and character diffs with a `maxEdits` cap.
- `mergeText`: diff3 merge by line, with conflict chunks.
- `defineCodec`, `diffValue`, `mergeValue`, `withoutIgnored`: JSON diffs and 3-way merges aware of keyed lists, text paths and ignored paths.
- `canonicalJson`, `hashValue`: canonical JSON and its SHA-256.
- `VcsError`, `REVISION_KINDS` and the `Revision`, `RevisionMeta`, `RevisionRef` types.
