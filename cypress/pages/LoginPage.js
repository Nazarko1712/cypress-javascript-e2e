const BasePage = require('./BasePage');

/** Credentials the application publishes on its own login screen. */
const USERS = {
    standard: 'standard_user',
    lockedOut: 'locked_out_user',
    problem: 'problem_user',
    performanceGlitch: 'performance_glitch_user',
    error: 'error_user',
    visual: 'visual_user',
};

class LoginPage extends BasePage {
    constructor() {
        super('/');
    }

    get username() {
        return cy.get('[data-test="username"]');
    }

    get password() {
        return cy.get('[data-test="password"]');
    }

    get submitButton() {
        return cy.get('[data-test="login-button"]');
    }

    get error() {
        return cy.get('[data-test="error"]');
    }

    /**
     * @param {string} user
     * @param {string} [pass] - defaults to the demo password exposed in config
     */
    login(user, pass = Cypress.expose('PASSWORD')) {
        // Both fields are guarded because `cy.type('')` throws outright:
        // "cy.type() cannot accept an empty string". Leaving a field untouched
        // is the only way to test a MISSING value, and that is a different
        // thing from typing nothing into it.
        if (user) {
            this.username.type(user);
        }
        // `log: false` keeps the password out of the command log and out of
        // the screenshot attached to a failure.
        if (pass) {
            this.password.type(pass, { log: false });
        }
        this.submitButton.click();
        return this;
    }

    expectError(message) {
        this.error.should('be.visible').and('contain.text', message);
        return this;
    }

    /**
     * A page object exposes STATE and performs ACTIONS; it does not assert on
     * behalf of the test... with one deliberate exception, which these
     * `expect*` helpers are.
     *
     * The distinction worth defending in an interview: an assertion that is
     * part of the page's own CONTRACT ("this page shows errors here, in this
     * shape") belongs with the page. An assertion about what a particular test
     * cares about belongs in the test. Mixing the two is how page objects grow
     * into a second test suite that nobody reads.
     */
    expectLoaded() {
        this.submitButton.should('be.visible');
        return this;
    }
}

module.exports = { LoginPage, USERS };
