# AI_VIDEOEDITOR

Phase 0 establishes the foundation for a CLI-first, command-driven documentary assembly system.

Week 1 scope:

- TypeScript workspace setup
- Canonical core model files
- JSON schemas and validation
- SRT parsing
- SRT-to-scene generation
- Saving and loading `project.json`
- Unit tests for the foundation

Out of scope for Week 1:

- GUI
- rendering
- FFmpeg integration
- command journal replay
- Electron application setup

## Current Status

Task 001 is complete. Task 002 adds the `@aide/core` package scaffold so the root TypeScript project reference has a concrete package target.

## Verification

After Task 002 and Task 003 create the referenced core package and test config, the standard verification commands will be:

```sh
npm install
npm run typecheck
npm test
```

Task 001 intentionally creates only the root workspace files. The root `tsconfig.json` references the future `packages/core` package so Task 002 can attach the core implementation without changing root configuration.
