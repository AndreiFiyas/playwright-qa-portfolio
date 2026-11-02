# Playwright QA Portfolio

A production-style **Playwright + TypeScript** test automation framework, built around a small
collaborative document editor that ships in this repository. Everything runs locally and in CI with no
external services.

It recreates, from scratch and in generic form, the patterns I designed and used day to day as a QA
Automation Engineer on a large SaaS document platform: a real-time web editor plus a family of
independently deployed micro-frontends.

> **About this code.** Everything here was written for this portfolio. The system under test (`demo-app/`)
> is a stand-in. The repository contains no proprietary code, endpoints, credentials or data. See
> [docs/case-studies.md](docs/case-studies.md) for the real-world problems behind each pattern.

---

## What it shows

| Area | Where to look | Highlights |
| --- | --- | --- |
| **Layered fixtures** | `tests/fixtures/` | `base → api → ui` chain; a disposable user for every test; API login plus cookie injection; declarative skips |
| **Page objects** | `src/ui/` | A composite `EditorPage` built from components; separate locator files; `@step` on every public method; `checkThat…` naming; opt-in soft checks |
| **API testing** | `src/api/`, `tests/api/` | Thin services; an `ApiClient` with Zod schema validation; `ComplexSteps` for setup flows that never assert; data-driven negative cases |
| **WebSocket protocol** | `src/ws/`, `tests/ws/` | A Node client with *arm-before-trigger* collectors, confirm-by-ack and absence recorders; reconnect and resume |
| **Server-truth UI checks** | `src/ui/utils/ws-monitor.ts` | UI tests assert the server's WebSocket answer (for example the versions list) as well as the DOM |
| **Component isolation** | `tests/component/`, `src/mocks/` | A micro-frontend mounted alone. Covers deny-by-default networking, mock-drift detection, a typed injected config, recording host stand-ins and a scripted WebSocket server via `routeWebSocket` |
| **Flake-proofing** | `Toolbar.clickOnUndo`, `DocumentArea.scrollToPage` | Wait for the app's own signal, not a timer. Retry the whole intent with `toPass` |
| **Multi-session** | `openSession` fixture | Two devices editing the same document; a video per session on failure |
| **Visual testing** | `tests/visual/` | A frozen clock for date-dependent renders, masks, baselines generated only in CI |
| **Conventions as code** | `eslint-rules/` | 7 custom ESLint rules, one of them type-aware, with RuleTester tests |
| **Reporting** | `tests/fixtures/step-failure.ts`, `reporters/` | A screenshot plus a video "cue" on the first failing step; an `x-autotest-id` header on every request; a flaky-test reporter that runs in the merge stage |
| **CI** | `.github/workflows/` | Lint, types, lint-rule tests, a sharded run, merged blob reports, a baseline-update workflow |

## Architecture

```text
tests/                     specs: intent only, no raw actions, no plain expect
  ├─ api/                  REST tests (no browser)
  ├─ ws/                   WebSocket protocol tests (no browser)
  ├─ ui/                   E2E, desktop + mobile
  ├─ component/            micro-frontend in isolation
  ├─ visual/               pixel baselines (Linux/CI)
  └─ fixtures/             base → api → ui   |   component (separate chain)

src/
  ├─ api/                  ApiClient (Zod) · services (thin) · models · ComplexSteps
  ├─ ws/                   protocol client + frame parser
  ├─ ui/                   pages · components · modals · utils (WsMonitor, BrowserMocks)
  ├─ mocks/                harness mocks: network guard, drift, realtime, host services
  └─ utils/                @step · expectWithStep · meta() · skip annotations · constants

demo-app/                  system under test: REST + WebSocket server, editor, share widget
eslint-rules/              custom ESLint plugin + RuleTester tests
reporters/                 flaky-test reporter
```

**Layer rules:** specs talk to page objects and API facades only. Page objects own locators and
checks. Setup helpers return ids and never assert. Services return raw responses and never parse.

## Quick start

```bash
nvm use                     # Node 22
npm ci
npx playwright install chromium

npm test                    # every project; the demo app starts automatically
npm run test:api            # REST + WebSocket protocol only (seconds)
npm run test:ui             # desktop Chromium E2E
npm run test:component      # isolated share widget
npm run lint && npm run typecheck && npm run test:lint-rules
```

To explore the app by hand, run `npm run app` and open `http://localhost:4310/login`. Create a user
first with `curl -X POST localhost:4310/api/users`.

## A test, end to end

```ts
test('each saved version remembers the document state', meta().testId('UI-VER-001').severity('critical').build(),
  async ({ pages, steps }) => {
    const document = await steps.createDocument('Versioned');          // API setup, no UI cost
    await pages.editor.open(document.id);                              // waits for the app's ready signal

    await pages.editor.addElement(TOOLS.text);
    await pages.editor.versions.saveVersion();
    await pages.editor.addElement(TOOLS.checkmark, 2);
    const versions = await pages.editor.versions.saveVersion();        // returns the server's WS answer

    await pages.editor.versions.checkServerVersionsList(versions, [2, 1]);
    await pages.editor.versions.checkThatRowCountIs(2);
  });
```

The report reads like the test plan: every page-object call is a named step, and
`expectWithStep(...)` turns API assertions into steps too.

## Conventions (enforced where possible)

- **Selectors:** `getByTestId` on a dedicated `data-qa` attribute with camelCase values (`printButton`). A bare `locator('[data-qa=…]')` is a lint error and is auto-fixed.
- **Naming:** actions are verbs (`clickOnUndo`, `shareWith`). Checks are `checkThat…(expected, isSoft = false)`. Every page has `isOpened()`. `assert…` and `verify…` are lint errors.
- **No sleeps and no `networkidle`:** wait for a UI state, an enabled control or a WebSocket frame.
- **No `test.skip()`:** use `skipOnIssue(key, reason)` or `skipOnBrowser(...)` annotations, so every mute carries a reason and an owner.
- **Isolation:** each test creates its own user and documents, so tests run fully in parallel with nothing to clean up.

## Case studies

[docs/case-studies.md](docs/case-studies.md) covers the problems behind these patterns:
- migrating large legacy Selenium suites;
- attributing flakiness by statistics rather than by a single run;
- asserting server truth over WebSockets;
- isolating micro-frontends;
- turning review comments into lint rules.

## License

MIT
