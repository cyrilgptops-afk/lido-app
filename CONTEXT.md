# Context Summary (Admin Bots Builder)

Date: 2026-03-07

## Goals Implemented
- Added dual builder modes: Blockly and Code (Ace editor).
- Added JS lint diagnostics and save-blocking on JS errors.
- Added global toast notifications for save/upload/deploy/delete/settings errors and success.
- Added fullscreen builder mode with body scroll lock and higher z-index.
- Added Live Preview panel with collapse toggle and persistence.
- Added Live Edit Preview toggle (auto-run preview on edits) and hides right-side panels when enabled.
- Fixed AppRenderer preview handling for application vs chat content.
- Fixed AlertBanner action safety (no onAction crash when undefined).

## Key Behaviors
- Code mode uses Ace editor with linting (errors/warnings).
- Save is blocked if JS errors exist or missing version.
- Preview intent dropdown triggers re-run of preview.
- Live Edit Preview auto-runs preview (debounced) when editing in JS mode and forces preview source to JS.
- Live Preview collapse state and builder mode are stored in localStorage.

## Files Modified
- apps/web/pages/admin/bots/[id].tsx
- apps/web/components/app-renderer/AlertBanner.tsx
- apps/web/package.json (react-ace and ace-builds added)

## Current UI Sections (Builder Tab)
- Left: Blockly editor or Ace editor.
- Right: Live Preview panel (collapsible, live toggle), Save New Version panel, JS Preview Loader panel.
- When Live toggle is ON: Save New Version + JS Preview Loader panels are hidden.

## Notable Fixes
- Removed stray JSX injection into ChatPreview.
- Restored PreviewPanel helper for rendering AppRenderer or Chat preview fallback.
- Fixed parsing errors from accidental literal \n sequences in JSX.

## Known Patterns / Details
- Preview source toggles between 'blocks' and 'js'.
- handleRunJsPreview now refreshes intents and uses a valid selected intent.
- Preview payload uses block preview payload if source = blocks; otherwise JS preview payload.
- Application preview shows AppRenderer if layout array exists; otherwise info + chat fallback.

## LocalStorage Keys Used
- lido.builder.mode
- lido.builder.livePreview
- lido.builder.liveEditPreview
- lido.blockly.<botId>

## Pending Checks (Suggested)
- Run dev server and ensure no Turbopack parse errors.
- Verify fullscreen allows editor input and dropdowns.
- Verify Live Edit Preview updates preview correctly on code edits.
- Validate Save New Version + JS Preview Loader hidden when Live is ON.
