const { defineConfig } = require('cypress');

/**
 * Cypress configuration.
 *
 * This project is the JavaScript counterpart to cypress-typescript-e2e, and the
 * two differ on purpose in one thing: how the suite is ORGANISED.
 *
 *   cypress-typescript-e2e   custom commands (cy.login, cy.byTestId)
 *   this repo                the Page Object Model
 *
 * Same framework, same runner, two structures — so the trade-off is visible
 * rather than theoretical. See the README for which one to reach for when.
 *
 * The target is saucedemo.com, a demo shop that ships DELIBERATE defects behind
 * named accounts (problem_user, performance_glitch_user, error_user). That is
 * rare and valuable: the bugs are intentional and stable, so a suite can assert
 * them without being flaky, and `known-defects.cy.js` reads as a bug report
 * rather than as a list of complaints about someone's staging environment.
 */
module.exports = defineConfig({
    e2e: {
        baseUrl: 'https://www.saucedemo.com',
        specPattern: 'cypress/e2e/**/*.cy.js',
        supportFile: 'cypress/support/e2e.js',

        /**
         * Reporter.
         *
         * Cypress runs Mocha underneath and ships `spec`, `junit` and
         * `teamcity` with no extra dependency. `junit` in CI is what makes a
         * failure appear as a named test in the GitHub Actions summary instead
         * of a line in a long log.
         *
         * `[hash]` is not decoration: Cypress starts a fresh reporter per spec
         * file, so a fixed filename means every spec overwrites the previous
         * one and the report describes only the last file that ran.
         */
        reporter: process.env.CI ? 'junit' : 'spec',
        reporterOptions: {
            mochaFile: 'reports/junit-[hash].xml',
            toConsole: false,
        },

        viewportWidth: 1440,
        viewportHeight: 900,

        // Generous because `performance_glitch_user` takes ~5 seconds to render
        // the inventory, and that account is deliberately exercised in
        // known-defects.cy.js. The default 4s would fail it for the wrong
        // reason — a timeout rather than the documented slowness.
        defaultCommandTimeout: 10000,

        video: false,
        screenshotOnRunFailure: true,

        // One retry in CI only. Locally a flake should be seen, not hidden;
        // in CI a retry is cheaper than a re-run of the whole job. Zero on
        // `openMode` keeps the interactive runner honest while debugging.
        retries: { runMode: process.env.CI ? 1 : 0, openMode: 0 },

        /**
         * `expose`, not `env` — a Cypress 16 breaking change worth knowing.
         *
         * `Cypress.env()` was REMOVED in 16.0.0 and split into two APIs, so
         * that the sensitive/non-sensitive distinction has to be stated rather
         * than assumed:
         *
         *   Cypress.expose('KEY')   public config, readable in the browser
         *   cy.env('KEY')           secrets, resolved in Node and never
         *                           serialised into the browser context
         *
         * This password belongs in `expose`: the application prints it on its
         * own login screen, so treating it as a secret would be theatre. A real
         * credential would go through `cy.env()` instead — the whole point of
         * the split is that the choice is now explicit at the call site.
         *
         * The sibling TypeScript project is still on Cypress 13 and uses
         * `Cypress.env()`, which is why the two repos differ here.
         */
        expose: {
            PASSWORD: 'secret_sauce',
        },
    },
});
