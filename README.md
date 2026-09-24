# TaskFlow – Task Management Dashboard

A clean, dependency-free task management dashboard built with vanilla HTML, CSS, and JavaScript. Organize tasks by status and priority, switch between grid and Kanban board views, and keep your data locally in the browser.

## Features

- **Full task CRUD** – Add, edit, and (with confirmation) delete tasks.
- **Local persistence** – Tasks are saved to `localStorage` and survive page reloads.
- **Grid & Kanban views** – Toggle between a card grid and a three-column board; drag and drop cards between To Do / In Progress / Completed.
- **Instant search + filters** – Filter by status and priority, search by title or description.
- **Live statistics** – Total, To Do, In Progress, and Completed counters.
- **Export / Import** – Save all tasks to a JSON file and restore them later (smart merge by id).
- **Undo** – Recover a deleted or moved task right after the action.
- **Multi-tab sync** – Changes in one tab are reflected in others instantly.
- **Overdue detection** – Dates in the past are highlighted.
- **Dark / Light mode** – Theme follows your saved preference or the system setting.
- **Accessible** – Keyboard navigation, visible focus states, `aria` labels, and reduced-motion support.
- **Keyboard shortcuts** – `n` new task, `/` focus search, `Esc` close dialogs.

## Getting Started

No build step or dependencies required. Open `index.html` directly in a browser, or serve the folder with any static server:

```bash
# Python (recommended)
python -m http.server 8000

# or VS Code Live Server
```

Then open `http://localhost:8000`.

## Tech Stack

- HTML5 semantic markup
- CSS3 custom properties (design tokens) with a responsive flat-design system
- Vanilla JavaScript (ES5-compatible, no libraries)
- Google Fonts: Plus Jakarta Sans

## Design System

Flat design with clean slate neutrals and an indigo primary:

- Primary: `#4F46E5` (indigo)
- Background: `#F8FAFC` (light) / `#0F172A` (dark)
- Typography: Plus Jakarta Sans
- A11y: text contrast >= 4.5:1, visible focus rings, `prefers-reduced-motion` support

## Keyboard Shortcuts

| Key   | Action           |
| ----- | ---------------- |
| `n`   | New task         |
| `/`   | Focus search     |
| `Esc` | Close dialogs    |

## Project Structure

```
.
├── index.html    # Markup, SVG icon sprite, tab title/meta
├── style.css     # Design tokens, layout, responsive rules
├── script.js     # App logic: CRUD, storage, filters, board, export/import
└── .gitignore
```

## License

This project is provided for personal and educational use.