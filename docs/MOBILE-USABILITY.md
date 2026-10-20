# Mobile usability release

The site now uses a compact phone header with a visible quiz-code shortcut and a collapsible menu for classes, resources, account actions and theme selection. It keeps the existing desktop layout and green visual identity.

## Changes

- Phone and tablet navigation uses one set of links and authentication state, closes after choosing a link, exposes expanded states, and supports Escape. A skip link opens the page content.
- Responsive grids can shrink below their previous 220–480px minimums. Larger fixed-column forms, revision summaries, answer comparisons and builder settings stack on phones.
- Resource descriptions wrap instead of disappearing behind ellipses. Actions, input fields and controls have comfortable phone sizing; editable fields use 16px text to avoid iOS focus zoom.
- Student and teacher dashboards use compact two-column metrics and visible wrapping tabs. Admin and teacher profile panels, filters, account controls and answer reviews fit the phone width.
- The quiz question area flexes into the remaining viewport. Previous/next controls stay at the bottom, include safe-area padding and remain reachable; completed reports use the dynamic viewport height. Question jumps have at least 44px cells.
- Dialogs lock background scrolling, including nested dialogs, and fit dynamic phone heights. Existing focus trapping and restoration remain in place.
- Builder actions reflow, settings stack and the touch toolbar remains accessible. Large tables and math expressions retain horizontal scrolling within their own containers.
- Long breadcrumbs, archive unit selectors and catalogue search fields no longer force sideways page scrolling at 320px.
- Light-theme secondary text, availability labels, resource metadata and the permanent dark footer use stronger contrast. Dark-theme tokens are retained.

## Verification

Read-only DOM layout checks cover the home page, boards/classes, subject hubs, model papers, syllabus, MCQ hub, books, practicals, resources, legacy physics pages, quiz catalogue, account, policies, dashboards, builder, admin directory and detailed learner reviews. Narrow layouts were checked at 320 and 360px, with additional 390/430px phone, 768px tablet and 1280px desktop checks. Findings were fixed and affected states checked again. The machine-readable record is `verification/mobile-layout-audit.json`.

Phone interactions checked with isolated local review accounts: expand/close menu and class selection; sign in/out; scroll locked authentication; teacher sharing settings; teacher student progress; admin learner profile and answer review; builder question/settings controls; and a two-question practice attempt through score reporting (2/2). No real student submissions or production account settings were modified.

Validation: 52 existing tests, lint, TypeScript, production build and HTTP assessment checks (including queued submission, authorization, answer validation and frozen scoring). Text contrast was sampled in both themes using the existing read-only audit; gradients require visual review and the audit is not a complete accessibility certification.

These are browser viewport checks. Physical iOS/Android devices, virtual keyboards, assistive technology and third-party PDF viewers still warrant real-device acceptance checks. No database migration or hosting configuration change is required.
