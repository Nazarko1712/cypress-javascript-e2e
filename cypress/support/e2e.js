/**
 * Support file: loaded before every spec.
 *
 * Note how little is here compared with the TypeScript project. That is the
 * point of the Page Object Model — the reusable interaction logic lives in
 * `cypress/pages/`, as ordinary classes, instead of in custom commands bolted
 * onto the `cy` namespace.
 *
 * What remains here is genuinely global: things that must apply to every spec
 * regardless of which page it touches.
 */

/**
 * The application throws an unhandled promise rejection on some navigations
 * that has nothing to do with the test.
 *
 * The handler is NARROWED, not blanketed. A bare `return false` silences the
 * application's real exceptions along with the noise, and then a genuine
 * regression looks like a passing test. This matches one known message and
 * lets everything else fail the run.
 */
Cypress.on('uncaught:exception', (err) => {
    if (err.message.includes('ResizeObserver loop')) {
        return false;
    }
    return true;
});
