---
name: TaskFlow
description: A quiet personal task workspace with clear deadlines.
colors:
  ground: "#f7f8fa"
  surface: "#fff"
  raised: "#f0f2f5"
  ink: "#202329"
  muted: "#626874"
  border: "#e3e6ec"
  rule: "#eef0f4"
  control: "#b9c0cb"
  accent: "#285bd4"
  accent-soft: "#edf2ff"
  accent-ink: "#2047a4"
  negative: "#b33b39"
  negative-soft: "#fceeed"
  positive: "#36664d"
  overlay: "#151b294d"
  primary-ink: "#fff"
  dark-ground: "#151618"
  dark-surface: "#1c1e21"
  dark-raised: "#26292e"
  dark-ink: "#f1f3f6"
  dark-muted: "#b2b8c3"
  dark-border: "#353940"
  dark-rule: "#2b2e34"
  dark-control: "#69717e"
  dark-accent: "#9cb8ff"
  dark-accent-soft: "#252f48"
  dark-accent-ink: "#c1d0f7"
  dark-negative: "#ffaaa5"
  dark-negative-soft: "#3c2728"
  dark-positive: "#a5ccb4"
  dark-overlay: "#0009"
  dark-primary-ink: "#17191d"
typography:
  headline:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.035em"
  section:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  task-title:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.5
  metadata:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  count:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1
rounded:
  compact: "4px"
  field: "6px"
  control: "7px"
  list: "12px"
  panel: "14px"
  sheet: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  panel: "20px"
  gutter: "24px"
  sheet: "28px"
  section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.primary-ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  button-danger-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.negative}"
    rounded: "{rounded.control}"
    padding: "9px 14px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
  date-filter:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    padding: "6px 10px"
  task-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.list}"
    padding: "18px"
  rail-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "20px"
---

# Design System: TaskFlow

## Overview

**Creative North Star: "Achromatic ledger"**

TaskFlow uses the Achromatic ledger world as a calm working surface. Ink establishes hierarchy; aligned metadata and flat grouped containers keep tasks readable. Top navigation supports personal work without account or collaboration ornament.

Light and dark are equal saved preferences. Self-hosted Geist, native controls, stroke SVG icons and an accessible native dialog keep the interface direct. The focus-week strip represents real open-task deadlines.

**Key Characteristics:**
- Neutral chrome and inverse-ink primary actions.
- Compact type and regular tabular numerals.
- Flat containers, fine rules and semantic color.
- Visible focus and native status alternatives to dragging.

## Colors

The palette is cool neutral paper and ink, with restrained semantic signals. Frontmatter records the shipped light values and corresponding dark values under the dark- prefix. Source variables switch together through the root theme attribute.

### Primary

Ink supplies action fill, task identity, active navigation and progress. Primary ink is its inverse text. Blue accent marks today, due-count data, selected date state, focus, text actions, selection and caret; accent soft and accent ink form the selected-date pair. Ordinary task due labels remain muted, including today and future dates.

Negative and negative soft support overdue dates/group headings, validation, notices and destructive affordances. Positive supports completed controls and the saved-state dot. These are semantic signals rather than additional brand accents.

### Neutral

Ground is the workspace canvas. Surface carries header, lists, cards, fields and dialogs. Raised distinguishes hover, active view buttons, board lanes and progress tracks. Muted carries description and metadata. Border defines containers; rule divides rows; control strengthens input outlines. Overlay dims the page behind modal dialogs.

**The Deadline Signal Rule.** Within task metadata, negative color identifies overdue dates; High priority remains ink with a flag and explicit label. Errors and destructive actions use the negative channel in their own contexts.

## Typography

**Display Font:** Geist, with system-ui and sans-serif fallbacks; there is no separate decorative display face.
**Body Font:** The same self-hosted variable family.

The frontmatter records reused roles. Main headings tighten tracking; task titles retain body size at medium weight. Metadata is secondary. Localized 11px calendar/key labels do not establish a smaller body size. All numbers inherit tabular numerals. Brand text is 21px/600 with -0.04em tracking; sheet titles are 22px/600 with -0.02em tracking. Phone page headings step to 26px and sheet titles to 21px.

**The Single Family Rule.** Use Geist for text and numbers, with tabular numerals inherited from the body; do not add decorative display or monospace roles.

## Layout

Header and workspace share a centered outer maximum of 1320px with 40px horizontal padding, yielding a 1240px inner grid at a 1440px viewport. The desktop top bar is at least 76px tall. A flexible task column sits beside a 290px rail with a 24px gutter. Desktop task rows align completion, identity, priority, due date, status and edit action; normal rows are at least 78px tall. Settings split description and panel with a 70px gap.

At 1600px and above, the outer maximum becomes 1440px with 64px padding and a 310px rail. At 1150px and below, padding becomes 28px, rail 250px and gutter 20px; status moves to a second row. At 900px and below, the rail moves beneath tasks in two columns and inline status returns. At 640px and below, navigation wraps into a visible second row, page padding is 20px, rail and cards stack, task metadata/status move below identity, and completion/edit controls become 44px. The phone board shows one selected lane with explicit tabs. The calendar scrolls locally as needed with day controls at least 44px wide. At 360px and below, page padding is 14px.

Spacing is contextual. Reuse the frontmatter steps for common gaps and padding while preserving compact row relationships. The generic Taste sheet measurements are inspiration, not shipping tokens.

## Elevation & Depth

Ordinary surfaces are flat. Tonal fills, hairline borders, spacing and modal dimming establish depth. Only the toast uses the implemented shadow (0 8px 30px #0002). Cards and dialogs have no resting box shadow. There are no authored entrance animations or transitions. Smooth document scrolling becomes auto under reduced motion; that preference also suppresses animations and transitions.

**The Flat Surface Rule.** Use tonal fills and fine borders for ordinary hierarchy. Reserve the implemented shadow for transient toast feedback.

## Shapes

Small controls and fields have tight soft corners; lists/cards and larger panels use the larger frontmatter radii. Date-filter tags use 5px corners, completion controls 6px and toast 10px. Sheets use 16px on exposed corners. Fine borders are normally 1px; active navigation uses a 2px bottom rule. Circles serve completion and small state marks. SVG icons use rounded strokes (normally 18px, stroke 1.65), never icon glyph text.

## Components

### Buttons

Primary actions invert ink and primary ink; hover opacity is 0.85. Secondary actions use surface with a control border and raised hover. Quiet destructive actions use negative text and negative-soft hover. Base buttons are at least 40px high, the page action 42px, and phone buttons at least 44px. Icon buttons are transparent with raised hover. Text actions are blue with an underline on hover. Focus uses a 2px accent outline offset 3px.

### Chips

The selected date-filter tag uses accent-soft fill, accent-ink text and an explicit reset action. Priority is plain text, not a colored pill. Calendar counts use small rectangular fills; nonzero due counts take the accent pair.

### Cards / Containers

Lists and cards use surface, a border and list radius. Final rows omit the bottom rule; row hover uses ground. Grid cards use card padding. Board lanes use raised fill with surface cards. Rail panels use panel radius and padding; settings panels have surface fill without borders. Completed identity is muted and struck through; completed controls use positive.

### Inputs / Fields

Form fields use control borders, field radius, surface fill and at least 44px height. Required/optional labels remain visible. Invalid title fields use a negative border plus text explanation. Field focus is a 2px accent outline offset 2px. Search uses a bordered wrapper with focus-within outline, without a second inner input ring. Native status, priority and date controls remain in use.

### Navigation

Destinations are muted links that become ink on hover. Current navigation uses ink, medium weight and a bottom rule. Phone destinations stay visible in the second header row at a minimum 48px height. View buttons and theme choices use raised selected fill and semantic pressed state.

### Focus week and task sheet

The seven-day strip shows real open-task counts, today's blue numeral and selected-date fill. Hover uses raised fill; selected text retains accent ink. Scope has a visible reset. Progress remains ink on raised fill.

The native task dialog is a right sheet up to 480px wide and 100dvh tall with a titled header, labeled body and separated footer. Phone uses a bottom sheet up to 94dvh with sticky footer. The title receives focus on open; closing restores its invoking control when possible. Destruction uses a centered confirmation with safe-action focus. Escape, modal backdrop and keyboard containment follow the shipped native-dialog workflow. This adapts the inspected 21st shadcn Drawer pattern without React/Vaul code or dependencies.

## Do's and Don'ts

### Do:
- Do retain neutral High-priority text and a flag while overdue dates use the negative signal.
- Do bind new UI to light and dark CSS variables, including inverse primary text.
- Do preserve visible focus, descriptive labels and native status controls beside dragging.
- Do use the established type roles, flat surfaces and SVG stroke icons.

### Don't:
- Don't add saturated navigation, decorative gradients or colored metric tiles.
- Don't make color the only explanation of priority, overdue state or selection.
- Don't add animation or shadows to ordinary task containers.

Not canonized: no craft-floor defect was found in sampled shipping code and final renders. The initial High-priority color conflict is resolved. Generic Taste font-weight/mono/radius suggestions and the surface brief's approximate width do not override shipped values. The finish verdict scores the resolved fix, not a new whole-surface review. This documentation describes local shipping source; deployment is not asserted.
