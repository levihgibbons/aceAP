# Accessibility

Target: **WCAG 2.1 Level AA**. This document records what has been tested,
what was found and fixed, and what has *not* been tested.

> **This is not a conformance claim.** It is not a VPAT / Accessibility
> Conformance Report and it is not a third-party audit. Automated checkers find
> only part of the barriers real users meet (commonly quoted: roughly a third to
> a half of WCAG issues). Before a school procurement, commission an expert
> audit that includes assistive-technology testing by disabled users, then
> publish an ACR.

Last audit: 2026-11-17 (automated + keyboard, Chrome, production build).

## How it is tested

### Automated: axe-core in Playwright — `e2e/a11y.spec.ts`

`@axe-core/playwright` runs on every scan with the tags `wcag2a`, `wcag2aa`,
`wcag21a`, `wcag21aa`, plus axe's `best-practice` rules (headings, landmarks)
as advisory checks. Helper: `e2e/helpers/a11y.ts`.

- **Fails** the test: any *serious* or *critical* WCAG violation on a page this
  workstream owns (soft assertions, so one run reports every page).
- **Reported only**: moderate/minor WCAG findings, every best-practice finding,
  and pages owned by other workstreams (auth/account pages, LTI pages,
  integrations). Each test prints a summary and attaches the full results as
  `axe-results.json` to the Playwright report.
- Scans run with `prefers-reduced-motion: reduce` and after client islands and
  dynamic imports have settled (no visible `aria-busy`), so entry animations
  don't skew contrast results.
- Themes: the theme is set the same way `ThemeToggle` stores it (localStorage
  `aceap-theme` + `data-theme` on `<html>`).

Scope — **72 scans** (light theme everywhere; the dark theme on a representative
subset marked ◐):

| Area | Screens |
|---|---|
| Public | landing ◐; login ◐, signup ◐, forgot password, reset password, LTI account link (report only) |
| Student — learning | home ◐, catalog, course page, unit page, chain-rule lesson with KaTeX + Derivative Explorer simulation + a check question showing feedback ◐, practice intro, practice attempt with feedback ◐, quiz intro, quiz question, quiz review screen, quiz submit dialog, quiz results ◐, skill page, progress, search results, exam prep, exam prep course, assignments, account settings (report only) |
| Student — vault | workspace ◐, workspace with note preview, note editor, new note, concept page, graph canvas (@xyflow/react) ◐, graph list view, export |
| Teacher | overview ◐, classes, class page, engagement, interventions, shared notes, class settings, mastery heatmap ◐, heatmap evidence drawer ◐, student profile, student skill evidence page, gradebook ◐, gradebook grade drawer ◐, grading policy, assignments, new assignment, new class, integrations (report only), account settings (report only) |
| Admin | overview ◐, content review, licensing, audit log, mastery policy |

Student flows that create evidence run as the independent demo learner (Casey
Fox) so the other specs' seeded expectations are unaffected.

### Keyboard — `e2e/a11y.spec.ts` › keyboard

| Check | Result |
|---|---|
| First Tab focuses a visible "Skip to content" link; Enter moves focus into `<main>` | Pass |
| Tab alone reaches the primary navigation (student sidebar → Courses) | Pass |
| Sign-in form: email, password and "Sign in" reachable in order by Tab | Pass |
| Account menu (native popover): Enter opens, Esc closes, focus returns to the trigger | Pass |
| Mastery heatmap: Arrow keys move cell to cell, Home/End jump to row ends, arrows stop at the grid edge | Pass |
| Heatmap evidence drawer: Enter opens it with focus inside; Tab/Shift+Tab never reach the page behind it (the page is inert — focus stays in the drawer or goes to the browser's own UI); Esc closes; focus returns to the cell | Pass |
| Quiz "Submit your answers?" dialog: focus moves in, Esc cancels, focus returns to "Submit answers" | Pass |

Modals use the native `<dialog>` element (`src/components/ui/Dialog.tsx`):
`showModal()` makes the rest of the page inert, Esc closes, and focus is
restored to the trigger explicitly.

### Manual review (code and browser)

- Charts and graphics: every data SVG has `role="img"` and a text summary
  (`LevelHistoryChart`, both `Sparkline`s, simulation plots); decorative icons
  are `aria-hidden`. The vault graph has an equivalent **List view**.
- Tables: heatmap and gradebook use `<caption>`, `scope` on row/column headers,
  and real buttons for cells; both scroll regions are focusable and labelled.
- Mastery levels are never colour-only: each level has a distinct glyph and a
  text label.
- Forms: fields are labelled through `Field`/`RadioGroup`/`Checkbox`; hints and
  errors are tied with `aria-describedby`; errors use `aria-invalid`.
- Live regions: save status ("Saved"), toasts and feedback use status/alert
  roles; route changes are announced by Next.js's route announcer.
- Motion: `prefers-reduced-motion` disables animations and transitions.
- Zoom/reflow: the smoke suite checks no horizontal scroll at 360 px (`/app`,
  `/teacher`).

## Results

### Before → after (automated, WCAG tags, enforced pages)

| Rule | Impact | Affected nodes before | After |
|---|---|---|---|
| `color-contrast` (1.4.3) | serious | 154 | 0 |
| `label-content-name-mismatch` (2.5.3) | serious | 49 | 0 |
| `link-in-text-block` (1.4.1) | serious | 3 | 0 |
| `label` (1.3.1 / 4.1.2) | critical | 4 | 0 |
| **Total** | | **210** across 46 scans with findings | **0** across 62 enforced scans |

(The first run timed out partway through the vault, so the "before" count
covers only 2 of its 10 scans.) Best-practice advisories found after the WCAG
fixes — `region` (content outside landmarks, on every signed-in page) and
`heading-order` (4 pages) — are also fixed: 0 remain on enforced pages.

### What was fixed

- **Contrast — design tokens** (`src/app/globals.css`), minimal shifts that keep
  the palette:
  - light `--muted` `#6f6c63` → `#64615a` (was 4.48:1 on sunken/tinted
    surfaces) and `--faint` `#9a968b` → `#6f6b60` (was 2.5–2.9:1; it is used for
    small text such as sidebar section labels, metadata, form hints). Faint
    stays a step lighter than muted.
  - dark `--faint` `#76736d` → `#928f89` (was 3.0–3.9:1) and `--muted`
    `#a09d96` → `#a9a69f` to keep the hierarchy.
  - light `--warn` `#a15c07` → `#9c5907` and `--m-review` `#c2410c` → `#bd3f0c`
    (both were 4.42:1 on tinted backgrounds).
- **Label in Name**: the account-menu avatar initials are drawn with CSS
  `content` (they are a picture, not the button's label), so the name "Account
  menu for …" no longer conflicts with visible text (`UserMenu.tsx`). The
  student home's "Open" buttons are now named "Open exam preparation for …".
- **Links in text** are underlined, not colour-only (student home, course page).
- **Multiple-choice / multi-select options** whose text is pure math had no
  accessible name for checkers (KaTeX's visual HTML is `aria-hidden`; only
  MathML remains). Each option now starts with a screen-reader-only "Choice A:"
  prefix (`questions/inputs.tsx`).
- **Landmarks**: the demo-account notice is a labelled region (`DemoBanner.tsx`).
- **Heading outline**: empty/error states render an `h2` by default with a
  `headingLevel` prop for nested use (`ui/States.tsx`); lesson block headings
  (worked examples, simulations, key points, note prompt) are `h2` under the
  lesson `h1`; the teacher evidence panel's headings follow its host (drawer →
  under the dialog's `h2`; evidence page → under the page `h1`).

### Issues in other workstreams' files (reported, not changed here)

- `src/app/teacher/integrations/page.tsx` ~line 468 — the inline link
  "return to the connection settings" (`className="text-accent hover:underline"`)
  is distinguished from the surrounding text only by colour (`link-in-text-block`,
  serious, WCAG 1.4.1). Fix: add `underline` (or `font-medium` plus underline).
- `/lti/link` without a valid token renders no `<h1>` (best-practice
  `page-has-heading-one`, moderate). The error state should carry the page
  heading.
- Login, signup, forgot/reset password and account settings pages: no
  violations after the shared token changes.

## Known gaps (not tested)

- **Screen readers**: no testing with NVDA, JAWS, VoiceOver (macOS/iOS) or
  TalkBack. In particular, how math (KaTeX MathML) is read, the simulations'
  live readouts, and the heatmap grid's verbosity need real AT testing.
- **Other browsers and devices**: only desktop Chrome was automated. Not tested:
  Safari, Firefox, mobile browsers, Windows High Contrast / forced colours,
  200–400 % zoom and text-spacing overrides beyond the 360 px reflow check.
- **Cognitive and low-vision review**: plain-language review of lesson content,
  time limits on timed assessments (accommodations exist; the UX was not
  reviewed), consistent help.
- **Simulations**: sliders are native range inputs with labels and visible
  numeric readouts, but drag-only interactions and canvas content were not
  reviewed in depth.
- **WCAG 2.2** criteria (target size, focus not obscured, dragging movements,
  accessible authentication) were not evaluated.
- Dark theme was scanned for a subset of screens only; mobile layouts were not
  scanned with axe.
- Contrast of non-text UI (focus rings, control borders, chart strokes; WCAG
  1.4.11) was not systematically measured — axe does not check it.

## Running it

```bash
npm run build:e2e
npx playwright test e2e/a11y.spec.ts      # add --reporter=html for the JSON attachments
```
