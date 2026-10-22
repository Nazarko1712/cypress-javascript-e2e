# cypress-javascript-e2e

Cypress end-to-end suite in **plain JavaScript**, organised with the **Page Object
Model**.

This is the deliberate counterpart to
[cypress-typescript-e2e](https://github.com/Nazarko1712/cypress-typescript-e2e):
same framework, same runner, two different ways of organising a suite. With the
tool held constant, every difference in the test code is attributable to the
structure rather than to the framework.

**43 tests, 4 specs.** Target: [saucedemo.com](https://www.saucedemo.com).

## Prerequisites

| Requirement        | Notes                                   |
| ------------------ | --------------------------------------- |
| **Node 22**        | `.nvmrc` is committed — `nvm use`       |
| **Network access** | `www.saucedemo.com`                     |
| **Nothing else**   | no Docker, no database, no local server |

Cypress downloads its own browser on first install; no separate browser setup is
needed.

## Setup

```bash
nvm use
npm install
```

## Running

Cypress is headless by default. Both modes, explicitly:

```bash
npm test                  # headless, all 43 tests  (cypress run)
npm run test:headed       # HEADED — watch the browser  (cypress run --headed --no-exit)
npm run open              # interactive runner, time-travel debugging
```

Per spec:

```bash
npm run test:login        # 9  — authentication, validation, session
npm run test:inventory    # 14 — catalogue, sorting, cart
npm run test:checkout     # 14 — full order flow and the money arithmetic
npm run test:defects      # 6  — the deliberate defects, documented
```

Anything the npm scripts do not cover:

```bash
npx cypress run --spec 'cypress/e2e/checkout.cy.js' --browser firefox
npx cypress run --headed --no-exit --spec 'cypress/e2e/login.cy.js'
```

## Why the Page Object Model here, and custom commands there

Both repos test with Cypress. They differ in where the reusable logic lives:

|                 | cypress-typescript-e2e     | this repo                   |
| --------------- | -------------------------- | --------------------------- |
| Reuse lives in  | custom commands on `cy`    | classes in `cypress/pages/` |
| Call site       | `cy.login(user)`           | `loginPage.login(user)`     |
| Discoverable by | knowing the command exists | autocomplete on the object  |
| Natural for     | cross-cutting actions      | multi-page flows            |

**Custom commands are the Cypress-idiomatic default**, and for a good reason:
they compose with the command queue and they are available everywhere without an
import. For a cross-cutting concern — logging in, setting a test id convention —
they are the lighter answer.

**The Page Object Model earns its place on multi-page flows.** This suite walks
login → inventory → cart → three checkout steps → confirmation. Six surfaces,
each with its own selectors and its own vocabulary. As custom commands that
becomes `cy.checkoutFillForm()`, `cy.checkoutContinue()`, `cy.checkoutFinish()` —
a flat namespace with a prefix doing the work a class would do properly.

Neither is "correct". Knowing _why_ you picked one is the thing worth being able
to defend.

### The one rule that makes a Cypress page object different

```js
get username() { return cy.get('[data-test="username"]'); }   // correct
this.username = cy.get('[data-test="username"]');             // wrong
```

In Selenium or WebdriverIO a page object field holds an element reference. In
Cypress it cannot, because **`cy.get()` does not return an element — it enqueues
a command**. A value assigned in a constructor is a queued command that already
ran, against whatever page was open at the time.

A getter re-enqueues the query at the moment it is used, which is also what makes
Cypress's retry-ability work: the element is looked up again on every attempt
until the assertion passes or the timeout expires.

`eslint-plugin-cypress` enforces exactly this with
`cypress/no-assigning-return-values`, and the Page Object Model is the structure
that makes the mistake easiest to write — a field assigned in a constructor looks
completely right.

### Where assertions live

Page objects expose state and perform actions. The `expect*` helpers on them are
a deliberate, bounded exception: an assertion that is part of the page's own
**contract** ("this page reports errors here, in this shape") belongs with the
page. An assertion about what a particular test cares about belongs in the test.

Concretely, `CheckoutPage.totals()` hands back three numbers and asserts nothing.
The claim that tax is 8% lives in `checkout.cy.js`, because that is a business
rule — and the next person to change the rate should find it in a test that
states it, not buried in a page object.

## Findings

### Every route but `/` returns HTTP 404

```
GET /                -> 200
GET /inventory.html  -> 404   (page still renders)
GET /cart.html       -> 404   (page still renders)
```

The application is hosted on GitHub Pages, which has no server-side routing. A
deep link returns a genuine 404 together with a redirect shim that rewrites the
URL client-side and hands over to the SPA.

Why it matters beyond tidiness:

- a human sees a working page; **curl, a crawler and an uptime check all see a
  404**
- a monitoring check on `/inventory.html` reports the site as down while it is up
- search engines will not index any route except the home page

In the suite this is why `login.cy.js` passes `failOnStatusCode: false` on one
`cy.visit` — not to paper over a flake, but because the 404 is the finding.

### Cypress hides an empty-page window that other runners expose

The same `performance_glitch_user` account, measured in two runners:

|                 | Playwright | Cypress                          |
| --------------- | ---------- | -------------------------------- |
| URL settles     | 35 ms      | 5049 ms (not observable earlier) |
| Content visible | 5100 ms    | 5052 ms                          |

Playwright reports the URL change immediately, so a suite that treats "URL
changed" as "page loaded" passes against a blank screen and then fails
confusingly on the next line.

Cypress cannot make that mistake: it waits for the page `load` event after a
click-triggered navigation before the queue moves on. That is a real advantage of
running inside the browser — and it is worth knowing in **both** directions,
because the same automatic waiting means a Cypress suite will **not** notice a
five-second regression that a user would. Catching that needs an explicit timing
assertion, not a navigation assertion. `known-defects.cy.js` has both.

### A retrying assertion cannot express "not yet"

```js
inventoryPage.items.should('not.exist');
// AssertionError: Timed out retrying after 10000ms: Expected not to exist
//                 in the DOM, but it was continuously found.
```

Cypress assertions retry until they pass or time out, so `should('not.exist')`
means **"eventually absent"**, never "absent right now". Against a page whose
content arrives late it retries for the full timeout and then fails.

A point-in-time check needs an escape hatch from the retry machinery:

```js
cy.document().then((doc) => {
  expect(doc.querySelectorAll('[data-test="inventory-item"]')).to.have.length(0);
});
```

### `Cypress.env()` was removed in Cypress 16

A breaking change worth knowing, and the reason this repo reads differently from
its TypeScript sibling (which is still on Cypress 13):

```js
Cypress.env('PASSWORD'); // removed in 16.0.0
Cypress.expose('PASSWORD'); // public config, readable in the browser
cy.env('PASSWORD'); // secrets, resolved in Node, never sent to the browser
```

The split forces the sensitive/non-sensitive decision to be **stated at the call
site** rather than assumed. The demo password here belongs in `expose` — the
application prints it on its own login screen, so treating it as a secret would
be theatre.

### Deliberate defects behind named accounts

The target ships intentional bugs behind specific usernames, which is rare and
useful: the behaviour is stable, so a suite can assert it without being flaky.

| Account                   | Defect                              | Asserted in           |
| ------------------------- | ----------------------------------- | --------------------- |
| `locked_out_user`         | distinct lockout message            | `login.cy.js`         |
| `problem_user`            | one image served for all 6 products | `known-defects.cy.js` |
| `problem_user`            | Z→A sort order ignored              | `known-defects.cy.js` |
| `error_user`              | Z→A sort order ignored              | `known-defects.cy.js` |
| `performance_glitch_user` | ~5s to render the inventory         | `known-defects.cy.js` |

Asserted **as they behave**, not as they should. That keeps the run green so a
red run always means something changed, keeps the defect visible in code rather
than in a wiki, and fails loudly the day somebody fixes it — exactly when these
tests should be revisited.

A **contrast case** is included deliberately: `standard_user` sorts correctly.
Without it the suite only proves "sorting is broken"; with it, it proves the
defect is _scoped to those accounts_. A bug report that distinguishes the two
saves a developer an hour.

### Validation reports one missing field at a time

The checkout form reports `First Name is required` and stops, even when all three
fields are empty. A user learns about three problems by submitting three times.
Documented rather than judged — the test pins the current behaviour so a change
to it is visible.

## Conventions

**Prices compared as numbers, never as strings.** `"$49.99" < "$7.99"` is `true`
lexicographically, so a string sort looks almost right and is wrong exactly where
it matters. `inventory.cy.js` has a test whose only job is to prove the
comparison is numeric.

**Money asserted with `closeTo`, not `equal`.** The application rounds to cents;
an exact float comparison would fail on arithmetic that is in fact correct.

**Passwords typed with `{ log: false }`,** so they stay out of the command log and
out of the screenshot attached to a failure.

**`cy.type()` is never given an empty string** — it throws outright. Testing a
_missing_ value means leaving the field untouched, which is a different thing
from typing nothing into it.

**`uncaught:exception` is narrowed, not blanketed.** A bare `return false`
silences the application's real exceptions along with the noise; this handler
matches one known message and lets everything else fail the run.

**Retries only in CI.** Locally a flake should be seen, not hidden; in CI one
retry is cheaper than re-running the whole job. `openMode: 0` keeps the
interactive runner honest while debugging.

## Linting and reports

```bash
npm run lint          # ESLint 9, flat config
npm run lint:fix      # auto-fixable rules only
npm run format        # Prettier, writes
npm run format:check  # Prettier, reports (this is what CI runs)
```

This repo is plain JavaScript on purpose, which costs the single most valuable
rule in a test suite: `@typescript-eslint/no-floating-promises` needs type
information, so it cannot exist here. **Cypress softens that more than most
frameworks** — its commands are queued rather than awaited, so there is no
promise to forget in the first place. The Cypress-specific rules cover what
remains:

| Rule                                 | What it catches                                                               |
| ------------------------------------ | ----------------------------------------------------------------------------- |
| `cypress/no-assigning-return-values` | `const el = cy.get(...)` — the mistake the Page Object Model makes easiest    |
| `cypress/unsafe-to-chain-command`    | chaining off an action command re-queries a detached element                  |
| `cypress/no-async-tests`             | `async/await` mixed with the queue: the body finishes before the commands run |
| `cypress/no-unnecessary-waiting`     | a fixed sleep instead of the real condition                                   |

### Pre-push hook

```bash
npm install    # wires the hook up via npm's `prepare` lifecycle script
```

`.husky/pre-push` runs lint and the formatting check before the push leaves the
machine. If either fails, **the push is aborted and nothing reaches the remote**:

```
  push blocked — ESLint found problems
  fix:     npm run lint:fix
  bypass:  git push --no-verify
```

It deliberately does **not** run the suite: 40 seconds of real browser against a
public demo site would make every push slow and would block whenever that site is
having a bad day. That belongs in CI, where a retry is free.

It never fixes anything either — only the reporting variants. A hook that
rewrites files during `git push` pushes a version you never reviewed and leaves
the corrections uncommitted in your working tree.

### Reports

Cypress runs Mocha underneath and ships `spec`, `junit` and `teamcity` with no
extra dependency. CI uses `junit` and writes `reports/junit-[hash].xml`; `spec`
locally.

The `[hash]` is load-bearing: Cypress starts a fresh reporter per spec file, so a
fixed filename means every spec overwrites the previous one and the report
describes only the last file that ran.

### Where this runs in CI

Linting is its **own job**, not a step inside the test job. It needs no browser,
no network and no secrets and finishes in seconds, so as a separate job it runs
concurrently with the suite: a formatting failure does not wait behind a browser
run, and a real test failure is not hidden behind a formatting failure.

CI runs the `--check` variants, never the formatter itself. A pipeline reports on
the branch it was asked to verify; it does not rewrite it.

## Layout

```
cypress/
  e2e/
    login.cy.js           9 tests
    inventory.cy.js      14 tests
    checkout.cy.js       14 tests
    known-defects.cy.js   6 tests
  pages/
    BasePage.js          shared navigation and URL assertion
    LoginPage.js         + the six demo accounts
    InventoryPage.js     + the four sort orders
    CartPage.js
    CheckoutPage.js      all three checkout steps in one class
  support/
    e2e.js               only what is genuinely global
```

`CheckoutPage` covers three URLs on purpose. Page objects map to **user-facing
surfaces**, not one-to-one to routes: the useful question is "would a tester
describe these as separate screens with separate concerns?", and for a single
linear checkout the answer is no.

## What this suite does not do

**No visual regression.** `visual_user` ships deliberate layout defects, and
catching them needs screenshot comparison with a baseline — a different tool and
a different maintenance story.

**No API-level setup.** Every test logs in through the UI. On a real project that
would be wasteful and `cy.session` or a token endpoint would replace it; here the
login flow is part of what is under test, and the whole suite runs in 40 seconds.

**No cross-browser matrix in CI.** The suite runs in Electron on CI, and
`--browser firefox` works locally. A matrix would triple the CI time to re-prove
the same application logic; browser differences on this app are a visual concern,
which is covered by the point above.
