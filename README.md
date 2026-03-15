# Bordados — Aime Cross Stitch Tracker

A personal cross-stitch pattern tracker built with Angular 19, Firebase, and a lot of love.
Designed for one person: Aime. Every decision in this codebase exists to make her embroidery
sessions smoother, faster, and more enjoyable.

---

## Purpose

Aime works from digitized cross-stitch patterns exported from FlossCross (.fcjson files).
The app imports those patterns, displays them as an interactive pixel grid, and lets her
track which stitches she has completed — sector by sector, color by color.

The secondary purpose is reducing friction: fewer thread changes, smarter color choices,
and a UI that remembers exactly where she left off so she can pick up her hoop and start
stitching within seconds of opening the app.

---

## Stack

- **Angular 19** — standalone components, signals throughout, no NgModules
- **Firebase / Firestore** — cloud persistence for patterns and progress
- **Angular CDK Overlay** — loading spinner
- **localStorage** — settings, viewport state, thread stash, snapshots, trash
- **efloss API** — on-demand DMC/Anchor thread resolution (results cached in localStorage)

---

## Project structure

```
src/app/
│
├── components/
│   ├── matrix-grid/          # The main embroidery grid. Renders the pattern as
│   │                         # a pixel grid, handles cell taps, manages viewport
│   │                         # save/restore (scroll position persisted across sessions).
│   │
│   ├── project-controls/     # Floating action panel (the 🧵 FAB). Contains all
│   │                         # tabs: Proyecto, Stats, Config, Aime. Entry point for
│   │                         # the color editor and project management.
│   │
│   ├── color-editor/         # Full-screen modal for color operations:
│   │                         # merge, replace, auto-simplify, inventory matching,
│   │                         # configuration management, and snapshot history.
│   │
│   └── loading-spinner/      # CDK overlay spinner shown during async loads.
│
├── services/
│   ├── pattern-manager.ts    # Central service. Owns all signals the app reads:
│   │                         # pattern, progress, stats, activeSymbols,
│   │                         # optimalSequence, activeProjectId, and more.
│   │                         # Handles load, save, import, export, rename, delete
│   │                         # (soft-delete with 48h trash), and color configurations.
│   │
│   ├── color-editor.service.ts  # Color mutation logic: merge, replace, auto-simplify
│   │                            # at a dial threshold, inventory match scoring.
│   │                            # Always snapshots before mutating.
│   │
│   ├── snapshot.service.ts   # Stores up to 10 named snapshots per project in
│   │                         # localStorage. Used by the color editor to provide
│   │                         # a visible undo history. Snapshots are taken
│   │                         # automatically before every color mutation.
│   │
│   ├── thread-stash.service.ts  # Persists Aime's physical thread collection globally
│   │                            # in localStorage (key: aime_thread_stash_v1).
│   │                            # Survives project switches. Updated by bulk input.
│   │
│   ├── dmc-api.service.ts    # Resolves DMC and Anchor codes to hex colors via
│   │                         # the efloss REST API. Results are permanently cached
│   │                         # in localStorage (key: dmc_cache_v1) so each code
│   │                         # is only fetched once across all sessions.
│   │
│   ├── project-ingestor.service.ts  # Parses .fcjson files from FlossCross into
│   │                                # the internal PatternMatrix format. Assigns
│   │                                # symbols, detects background colors, trims
│   │                                # padding around the pattern edges.
│   │
│   └── loading.service.ts    # Thin wrapper around CDK Overlay. show()/hide().
│
├── repositories/
│   ├── cloud-pattern.repository.ts  # All Firestore operations. Firebase SDK is
│   │                                # lazy-loaded (dynamic import) to keep the
│   │                                # initial bundle small. Serializes the 2D grid
│   │                                # as a flat array for Firestore storage.
│   │
│   ├── local-pattern.repository.ts  # localStorage-backed repository using Angular
│   │                                # resource() API. Used when storageMode = 'local'.
│   │
│   └── pattern.repository.ts        # Abstract base class for both repositories.
│
├── models/
│   ├── pattern-matrix.model.ts  # Core data types:
│   │                            #   PatternMatrix — the full pattern (grid, legend,
│   │                            #     progress, configurations)
│   │                            #   SymbolDefinition — one color entry (hex, symbol,
│   │                            #     contrast color, DMC name, isBackground flag)
│   │                            #   ColorConfiguration — a named snapshot of the
│   │                            #     legend, used by the color editor config system
│   │
│   └── flosscross.model.ts   # TypeScript shape of a raw .fcjson file as exported
│                              # by FlossCross. Used only during import.
│
└── pipes/
    └── safe-color.pipe.ts    # Reads a color property (b or c) from the legend
                              # safely, with a fallback for missing keys.
```

---

## Data model

The entire pattern lives in one `PatternMatrix` object:

```typescript
{
  m: { r, c, t }             // rows, cols, title (also used as the Firestore document ID)
  l: { [key]: SymbolDef }    // legend — maps symbol keys like "f0" to color definitions
  g: string[][]              // grid — 2D array of symbol keys, never mutated by progress
  progress?: { [coord]: 0|1|2 }  // "row,col" → 0 pending, 1 in-progress, 2 done
  configurations?: { [key]: ColorConfiguration }  // named legend snapshots
  activeConfiguration?: string  // which configuration is currently active
}
```

`progress` is intentionally separated from `pattern` into its own signal
(`PatternManagerService.progress`) so that stitch taps do not invalidate the
entire computed tree. Only computeds that read `progress()` re-run on each tap.

---

## Storage layers

| What | Where | Key pattern |
|---|---|---|
| Pattern data + legend + grid | Firestore (cloud) or localStorage (local) | `pattern_local_{title}` |
| Progress | Same document as pattern | inside `PatternMatrix.progress` |
| Active project ID | localStorage | `activeProjectId` |
| App settings (pixelSize, storageMode, etc.) | localStorage | `bordados_settings` |
| Viewport scroll position | localStorage | `aime_viewport_v1_{projectId}` |
| Thread stash | localStorage | `aime_thread_stash_v1` |
| DMC API cache | localStorage | `dmc_cache_v1` |
| Color snapshots | localStorage | `snapshot_{title}_{timestamp}` |
| Trash (soft-deleted projects) | localStorage | `trash_{title}` |
| Active sector (last tapped cell) | localStorage | `active_sector_key` |

---

## Key behaviours

**Cell tap lifecycle**
Each tap marks a "sector" — the clicked cell plus all flood-fill connected cells of the
same color. First tap → in-progress (step 1). Second tap → done (step 2). Third tap →
reset to pending. Progress is saved with a 1.2s debounce after the last tap so rapid
tapping does not trigger multiple writes.

**Viewport restore**
Scroll position (container scrollLeft/scrollTop + window scroll) is saved to localStorage
350ms after each scroll event. On app open, `MatrixGridComponent.waitAndRestore()` polls
until `activeProjectId` is set, `loading` is false, the pattern has content, and the DOM
scroll dimensions match the expected grid size — then applies the saved position via a
double `requestAnimationFrame` to guarantee the browser has painted. This works on
localhost, Firebase, refresh, lid close, and tab switch.

**Color configurations**
The legend can be saved under named configurations (Original, Simplificado, Mis hilos,
etc.). Switching configurations swaps `pattern.l` instantly. Progress is shared across
all configurations because it is coordinate-based, not color-based — it reflects what
is physically stitched on the fabric.

**Optimal path**
When enabled, the service computes a nearest-neighbour traversal of all pending cells
in the active sector and animates a highlight along that path at 200ms intervals.
The interval is skipped entirely when the feature is off.

**Color editor auto-simplify dial**
A 0–100 dial maps to an RGB distance threshold via `(dial/100)² × 441`. At dial=0
nothing merges. At dial=100 everything merges to one color. A live preview shows the
thread count reduction before committing. Every mutation takes a named snapshot first.

**Soft delete**
Deleted projects go to a localStorage trash for 48 hours before permanent removal.
A recovery option appears in the Proyecto tab while trash items exist.

**Color celebration**
When Aime completes the last stitch of any color, a pill-shaped toast appears above the
FAB button colored in that thread's exact color, naming it and showing how many colors
remain. It auto-dismisses after 4 seconds.

---

## Development

```bash
ng serve          # localhost:4200
ng build          # production build → dist/
ng test           # Vitest unit tests
```

Deploy to Firebase Hosting:
```bash
ng build && firebase deploy
```

---

## What to tell an AI assistant

This section exists so the project context can be restored quickly in a new conversation.
Paste the README and say "this is the project context."

**Architecture rules that must not be broken:**

- This codebase uses **Angular signals exclusively** — no RxJS observables in the
  application layer (only `firstValueFrom` in the DMC API service for HTTP calls).
  All state lives in `PatternManagerService` signals. Components inject the service
  and read signals directly in templates.

- The `pattern` signal and `progress` signal are **intentionally separate**. Do not
  merge them back into one object — it would cause the entire computed tree to
  re-run on every stitch tap.

- `saveCurrentPattern()` calls `buildCurrentPattern()` which merges `pattern()` and
  `progress()` at call time. Any suggestion that reads `pattern().progress` directly
  is reading stale data — always use `this.progress()` instead.

- Firebase SDK is **dynamically imported** inside repository methods. Do not add static
  firebase imports at the top of any file or the initial bundle will balloon.

**The grid component** (`MatrixGridComponent`) is not always uploaded in sessions.
Describe it as: a scrollable container with `#gridContainer` template ref, renders
cells via `*ngFor` over `pattern.g`, each cell calls `manager.handleCellClick(row, col)`
on click, and the component owns all viewport save/restore logic including the
`waitAndRestore` polling loop, `saveViewport`, `restoreViewport`, and the
`isRestoring` guard flag.

**Known non-obvious things:**
- `loading.set(false)` is inside a `setTimeout(..., 300)` in `loadProjectById` — so
  `loading()` goes false 300ms after the pattern data is set. The viewport restore
  polls on `loading()` being false for this reason.
- `scrollWidth` in production is wider than `pattern.m.c * pixelSize` because the
  grid container has additional width contributors. The DOM size check uses `>=`
  not `===` for this reason.
- The FAB button shows a circular progress gauge (SVG arc) instead of an icon.
  It reads from `overallProgress()` not `stats()` — the latter is expensive and
  only used in the Statistics tab.