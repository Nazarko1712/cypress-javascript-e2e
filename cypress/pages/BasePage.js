/**
 * Shared behaviour for every page object.
 *
 * THE ONE RULE THAT MAKES A CYPRESS PAGE OBJECT DIFFERENT
 * ------------------------------------------------------
 * Elements are exposed as GETTERS, never stored in the constructor:
 *
 *     get username() { return cy.get('[data-test="username"]'); }   // correct
 *     this.username = cy.get('[data-test="username"]');             // wrong
 *
 * In Selenium or WebdriverIO a page object field holds an element reference.
 * In Cypress it cannot, because `cy.get()` does not return an element — it
 * ENQUEUES a command. A value assigned in the constructor is a queued command
 * that already ran (or worse, ran against the previous page), not something you
 * can act on later.
 *
 * A getter re-enqueues the query at the moment it is used, which is also what
 * makes Cypress's automatic retry-ability work: the element is looked up again
 * on every attempt until the assertion passes or the timeout expires.
 *
 * The same reasoning is why no method here returns an element for the caller to
 * hold. Methods either perform an interaction or return a chainer that the
 * caller immediately asserts on.
 */
class BasePage {
    /**
     * @param {string} path - route this page lives at, e.g. '/inventory.html'
     */
    constructor(path) {
        this.path = path;
    }

    visit() {
        cy.visit(this.path);
        return this;
    }

    /**
     * Assert the browser is actually on this page.
     *
     * Deliberately asserts on the URL *and* nothing else — see
     * `expectLoaded()` in the subclasses for the content check. The two are
     * separate because on this application they are genuinely separate events:
     * for `performance_glitch_user` the URL changes 5 seconds before the
     * content renders, so a suite that only checks the URL passes against a
     * blank page.
     */
    expectUrl() {
        cy.url().should('include', this.path);
        return this;
    }
}

module.exports = BasePage;
