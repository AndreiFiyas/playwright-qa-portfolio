# Case studies

These are real problems from my work on a large SaaS document platform: a real-time web editor plus
independently deployed micro-frontends, worked on by three product teams. Product names, systems and
numbers that could identify the employer are left out. Each case links to the generic re-implementation
in this repository.

---

## 1. Migrating legacy Selenium suites to Playwright

**Context.** Hundreds of legacy Java/Selenium UI tests and Java API tests needed to move to a
TypeScript/Playwright framework. Many of them overlapped, depended on fixed sleeps, or were bound to A/B
experiments that had since ended.

**What I did**
- Migrated 40+ suites: editor features, export flows, mobile and tablet layouts, multi-user editing, and the matching API suites.
- Deduplicated before porting. One typical suite had 21 legacy cases that collapsed into 6 Playwright tests: the other 15 repeated what existing tests already covered, and the mapping document for review said so explicitly.
- Matched legacy steps to new page-object methods **by the selector and behaviour they touch, not by method name**. Similarly named methods often did different things, and some were only reachable behind an experiment flag.
- Wrote AI-assisted conversion guides (skills) that encode these rules, so other engineers could run migrations with the same result.

**Result.** Faster, parallel-safe suites, with each test linked to its test-management id. The legacy
framework went into maintenance-only mode.

**In this repo:** the overall shape (`tests/`, `src/`, fixtures, `meta().testId()`).

---

## 2. Attributing flakiness by statistics, not by one run

**Context.** A change is often blamed for a red test because the test failed right after the change.

**Practice**
- Never attribute a flake from one or two runs. Run the test **N ≥ 4 times on the baseline and N ≥ 4 times on the change**, then compare. Running `--repeat-each` locally or a dedicated CI suite makes this cheap.
- Find the root cause instead of adding a retry. Two classic cases are recreated here:
  - **A debounced undo stack.** The app commits history about 400 ms after the last edit. A test that clicks Undo immediately does nothing, and the old fix was a sleep. The real signal is the Undo button becoming enabled (`Toolbar.clickOnUndo`).
  - **A late layout rescale.** The editor applies "fit width" after the first paint and resets the scroll, so a test that scrolled too early ended up back on page 1. The fix waits for the layout-ready class and retries the whole intent ("scroll there and be in the viewport") with `expect(...).toPass()` (`DocumentArea.scrollToPage`).
- When fixing a test, keep its intent. Changing `toHaveCount(3)` to `toHaveCount(0)` to make it green usually hides a product bug.

**In this repo:** `Toolbar.ts`, `DocumentArea.ts`, `reporters/flaky-reporter.ts`.

---

## 3. Asserting server truth over WebSockets

**Context.** The editor syncs over a WebSocket. After a reconnect, the versions table could briefly
show stale rows, so DOM-only checks were flaky and sometimes asserted the wrong thing.

**What I did**
- Built a helper that subscribes to WebSocket frames **before** the action, matches a typed operation (`group` / `type`), races it against a timeout, and always cleans up.
- Page objects return the server's answer, so the test checks what the server holds as well as what the UI renders.
- At the protocol level, wrote Node-client tests for broadcast and ack semantics, resume-after-reconnect and refusal. They use collectors armed before the trigger, confirm-by-id, and "absence" recorders that prove an operation did *not* arrive.

**In this repo:** `src/ui/utils/ws-monitor.ts`, `VersionsPanel.saveVersion`, `src/ws/ws-client.ts`,
`tests/ws/collaboration-protocol.spec.ts`.

---

## 4. Testing micro-frontends in isolation

**Context.** Export and sharing features ship as separate micro-frontends inside a host shell. E2E
tests through the whole product were slow, and a failure could not be traced to a single module.

**The harness**
- **Mount the module alone** on a harness page, with a **typed config** imported from the module's own public contract. A contract change breaks compilation instead of drifting silently. Hosts use the reserved `.invalid` TLD, so nothing can reach a real system.
- **Deny networking by default.** One catch-all route plus a `routeWebSocket` counterpart, with an allow-list where every entry states why it is there. Anything that escapes is aborted and recorded, and the test fails at teardown with "add a mock for this request".
- **Detect mock drift.** A route handler that throws makes the request hang. Instead, the handler records the mismatch, answers 500, and teardown fails the test with a readable message.
- **Record host stand-ins.** Host services such as feedback and logger are `Proxy` objects that record every call, so tests assert "the widget asked the host to open feedback" exactly at the boundary. `then` is excluded so the proxy is not treated as a promise.
- **Script the WebSocket server** with `page.routeWebSocket`, which can push server-initiated events.
- **Fail on any uncaught page error.**

**In this repo:** `tests/fixtures/component.fixture.ts`, `src/mocks/share-widget/*`,
`tests/component/share-widget.spec.ts`.

---

## 5. Conventions as code: custom ESLint rules

**Context.** The same review comments came up again and again across three teams: raw clicks in specs,
`expect` in tests, `test.skip` with no reason, `networkidle`, `assert…` method names.

**What I did**
- Sorted every written convention into three groups: those a tool can enforce, those that need human judgement, and those that need cross-file or runtime analysis. Then I implemented the enforceable ones as **25 custom ESLint rules**, rolled out gradually with a suppressions baseline.
- Made rules **type-aware** where a name-based rule would give false positives. `no-raw-actions-in-tests` flags `.click()` only when the receiver's TypeScript type is a Playwright `Locator`, `Page` or similar, so a page-object method called `click()` is never reported.

**In this repo:** 7 representative rules in `eslint-rules/`, tested with `RuleTester` (`npm run test:lint-rules`).

---

## 6. Deterministic visual baselines

**Context.** An export baseline broke every day because the rendered stamp contained today's date. A
loose colour threshold had been hiding a stale date in the old baselines.

**Fix.** Freeze the browser clock (`page.clock.setFixedTime`) before the date is rendered, tighten the
pixel tolerance, regenerate the baselines, and only ever generate them in CI on the same OS. Local
baselines never match by design.

**In this repo:** `tests/visual/stamp.spec.ts`, `BrowserMocks.freezeTime`, `.github/workflows/update-snapshots.yml`.

---

## 7. Making failures cheap to read

- **Screenshot plus "cue" on the first failing step.** `test.step` is patched so the first failing step attaches a screenshot and a `mm:ss` offset from test start, which lets the reader jump straight to that moment in the video or trace. A marker on the error prevents duplicate attachments from nested steps (`tests/fixtures/step-failure.ts`).
- **A video for every extra session** in multi-user tests (`openSession`).
- **`x-autotest-id` on every request**, so a backend log line leads back to the exact test and CI run.
- **Flaky metrics in the merge stage.** Shards only emit blob reports; the merge job runs the flaky reporter once, so each flaky test is counted exactly once.

---

## 8. When feature flags graduate

A recurring maintenance task was the moment an A/B experiment became the default. The work was to remove
the experiment enrolment from the tests, update flows and baselines, and delete the old branch's
coverage. Experiments are also why legacy steps were mapped by behaviour rather than by name (case 1).
Some code paths only existed in one experiment arm.
