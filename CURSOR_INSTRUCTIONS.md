# Cursor / Agent Instructions for this Repository

Purpose
-------
This file documents the project architecture conventions and the workflow rules that the Cursor agent (and any contributor) should follow when making changes in this repository. Treat this as the canonical, up-to-date guideline for organizing features, migrating legacy code, and performing safe edits.

High-level architecture (follow these)
------------------------------------
- Feature-first layout: place each major sub-application (HR, Quality, Task Manager, etc.) in its own feature folder:
  - `src/features/<feature-name>/`
    - `index.js` (feature bootstrap / exported init/destroy)
    - `components/` (feature-specific UI components)
    - `styles.css` or CSS module for feature styles
    - `service.js` (feature-specific thin wrapper, importing shared services)
- Shared layers:
  - `src/services/` — one service per database table or domain (already present)
  - `src/utils/` — reusable helpers
  - `src/components/` — shared UI components used by many features
  - `src/core/` — app initialization, navigation, sidebar, modal, auth glue

Feature module contract
-----------------------
Each feature should expose a minimal public API:
- `export function initFeature(container, options)` — mount feature UI and wire handlers
- `export function destroyFeature()` — teardown event listeners and DOM
- Keep direct DB calls inside `src/services/*`; features should call services, not raw DB access.

Performance and build
---------------------
- Use dynamic imports to lazy-load feature code on navigation:
  - `const { initFeature } = await import('../features/hr/index.js');`
- Keep initial bundle small; split large files into smaller components.
- Aim for files < 400–800 LOC where practical.

Migration strategy (safe, incremental)
-----------------------------------
1. Scaffold the `src/features/<name>/` folder and add a minimal `index.js` that re-exports existing functions.
2. Move service-level code first to `src/services/`.
3. Move UI + event handlers next (feature `index.js` + `components/`).
4. Keep `script.js` working during migration; switch feature by feature to the modular loader.
5. Add manual or automated checks after each migrated feature.

Code conventions
----------------
- Prefer descriptive variable and function names (no 1-2 char names).
- Use guard clauses / early returns; avoid deep nesting.
- Don’t add try/catch unless an exception is expected and handled.
- Keep comments for non-obvious rationale only.
- Preserve existing indentation style in any edited file.

Agent / Cursor-specific workflow rules
-------------------------------------
- Before edits that change code structure, update the project's todo list with a task set to `in_progress`.
- After any edit, update the todo list to mark the task `completed`.
- Read any file you will edit at least once before applying an edit.
- When multiple independent read operations are needed, parallelize them where possible.
- When making edits, create feature scaffolding (index + service + component) rather than dumping many functions into one file.
- Run or request lints for modified files; fix clear linter issues before finishing.
- Do not remove legacy `script.js` until all features are migrated and tested.

When to split into separate repositories / micro-frontends
--------------------------------------------------------
- Keep features in the same repo while they share auth, DB schema, and release cadence.
- Consider separate repos only if teams require independent release cycles, different hosting, or very different stacks.

Adding new features (quick checklist)
------------------------------------
1. Create `src/features/<feature>/` scaffold with `index.js` and `components/`.
2. Add thin wrapper service in `src/services/` or reuse existing services.
3. Wire the feature into `src/core/navigation.js` using a dynamic import.
4. Test end-to-end and then mark the migration task completed.

Where this file lives
---------------------
Place this file at the repository root as `CURSOR_INSTRUCTIONS.md`. Agents and contributors should consult and follow it before making structural changes.

Contact / Ownership
-------------------
If something in this file becomes out of date, update it in this repository so future edits follow the current conventions.


