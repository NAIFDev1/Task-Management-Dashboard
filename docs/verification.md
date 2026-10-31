# TaskFlow redesign verification

Checked 31 October 2026 on the development branch. This record describes local checks, not a production deployment or physical-device certification.

## Automated domain checks

`npm run check` validates both JavaScript modules. `npm test` runs nine domain tests for legacy data, record normalization, bounded backups, ID merging, local calendar dates, combined filters, grouped statistics, conflict-aware undo and workspace capacity. All passed.

## Browser checks

47 checks passed in headless Chrome through the DevTools protocol:

- First-visit sample truth, computed totals, validation, create/edit/complete/delete, safe confirmation defaults and Escape cancellation.
- Status/delete/clear/import undo, and preservation of unrelated changes from another tab.
- Actual downloaded JSON content, malformed import rejection, ID-based merge and import rollback.
- Description search, priority filtering, date filtering/reset, route content and browser Back.
- Board drag/drop event handlers and native status alternative, mobile column tabs.
- N and / shortcuts, no shortcut during typing, modal Tab cycle and restored trigger focus.
- Real storage events between two tabs, stale-form conflict protection and theme persistence.
- Intentionally empty storage, corrupt storage recovery, denied storage and visit-only task creation.
- No runtime exceptions; inbox document fits widths 320, 390, 640, 768, 1024 and 1440px. Mobile sheet fits 390px.

Four additional edge checks passed: the 320px calendar scroll exposes the seventh day, 120-character unbroken titles fit, a legacy 2,000-character description remains editable, and the 1,000-task limit blocks creation with an explanation.

Mobile results use viewport emulation. Drag/drop was tested with DOM DataTransfer events, rather than a physical mouse drag; native status changes were independently exercised. Backup export used trusted mouse input and verified the actual downloaded file.

## Visual review

Inspected populated inboxes at 1440, 768, 390 and 320px, both themes, grid, desktop/mobile board, desktop/mobile task sheets, settings and empty state. Taste app inspection reported zero failures and warnings for small secondary text and a neutral progress bar. Static lint reported zero failures and the notification-overlay shadow warning. Impeccable's single detector run reported Geist font warnings; the assigned app direction deliberately uses that self-hosted font.

An independent finish reviewer inspected 14 final captures and the incumbent. It requested one material correction: neutral High-priority flags/labels, so overdue dates alone carry the red task warning. After the change and same-view recaptures, its verdict was `ship`: that finding was resolved. The verdict pass assessed the listed correction rather than repeating the full review. No separate quality-bar image was supplied; review used the persisted Operate direction and craft floor.

The independent documenter records the shipping tokens in DESIGN.md and .impeccable/design.json. No raster assets or generated imagery ship.
