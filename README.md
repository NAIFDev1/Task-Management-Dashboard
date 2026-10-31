# TaskFlow

A personal task inbox built with HTML, CSS and JavaScript. Grouped rows make overdue work, today's deadlines and upcoming tasks easy to scan. A seven-day planner filters the inbox by due date; grid and Kanban views remain available.

## Run locally

There are no runtime dependencies or build step. Serve this directory over HTTP because the application uses JavaScript modules:

```sh
python -m http.server 8000
```

Open [localhost:8000](http://localhost:8000/). The existing public address is [TaskFlow on GitHub Pages](https://naifdev1.github.io/Task-Management-Dashboard/); a development branch does not update that deployment automatically.

## Working with tasks

- Create, edit, complete, reopen and delete tasks. Task names allow 120 characters, descriptions 2,000.
- Search names and descriptions; combine priority, status and due-date filters. Sort by priority, due date or newest first.
- Use My tasks, Today (including overdue work), Upcoming and Completed as separate hash routes. Settings contains appearance and data controls.
- Switch between grouped list, card grid and Kanban board. Desktop drag/drop and labelled native status selectors change the same data. Mobile board tabs select a column.
- Export JSON or import previous array-based backups. Imports update matching IDs and preserve unrelated tasks; malformed records are skipped. Limits: 1 MB per import, 1,000 tasks per workspace.
- Undo deletion, status movement, import, clearing or sample replacement for 15 seconds. Undo preserves newer or unrelated changes from another tab.
- Choose light or dark mode. Shortcuts: **N** opens a task, **/** focuses search, **Esc** closes a dialog. Shortcuts do not interrupt typing.

Tasks and preferences live in this browser's local storage. They are not synced to a server or another device. Multiple tabs on the same origin receive storage changes; a stale task form cannot overwrite a newer task revision. If storage is unavailable, the app explains its visit-only state and supports export.

The existing `taskflow_tasks`, `taskflow_theme` and `taskflow_view` keys remain compatible. A first visit gets ten explicitly labelled sample tasks. Existing tasks, including an intentionally empty saved workspace, are never replaced by samples. Clearing data or loading samples requires confirmation.

## Verification

Node 22 or newer is needed for developer checks only:

```sh
npm run check
npm test
```

Nine domain tests cover legacy records, bounded imports, ID merging, local calendar dates, combined filters, truthful summaries and conflict-aware undo. Browser review covered 47 interactions/checks in headless Chrome, including actual backup download, storage denial, cross-tab conflicts, keyboard focus, and widths from 320 to 1440px. Mobile tests use viewport emulation, not physical devices. Drag/drop was exercised through DOM DataTransfer events, with its native status alternative tested separately.

## Design and provenance

See [DESIGN.md](DESIGN.md) for tokens and component rules, and [PRODUCT.md](PRODUCT.md) for product scope.

- **Taste:** app direction `achromatic-ledger`, no sidebar, self-hosted Geist and restrained date blue.
- **UI/UX Pro Max:** productivity guidance, keyboard alternatives to dragging, validation and touch targets.
- **Impeccable:** direction contract, craft review, detector and independent finish review/documentation.
- **21st:** inspected [shadcn Drawer / Add task](https://21st.dev/@shadcn/components/drawer), then adapted the header, labelled form, footer and mobile-sheet interaction into native HTML `dialog`. No React/Vaul source or dependencies ship.
- **Geist:** variable font from [Google Fonts](https://github.com/google/fonts/tree/main/ofl/geist), distributed under the bundled SIL Open Font License in `assets/fonts/OFL-Geist.txt`.
- **Icons:** retained the incumbent SVG icon paths in `assets/icons.svg`; the branching favicon is authored as SVG. No raster assets ship.

## Files

| File                 | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `index.html`         | App shell, settings and dialogs                      |
| `style.css`          | Light/dark tokens and responsive components          |
| `script.js`          | Browser interactions, persistence, cross-tab updates |
| `core.js`            | Validation, filtering, backups, summaries, undo      |
| `tests/core.test.js` | Domain regression checks                             |
| `assets/`            | Self-hosted font, license, icons, favicon            |

This project is provided for personal and educational use.
