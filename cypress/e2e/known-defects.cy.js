const { LoginPage, USERS } = require('../pages/LoginPage');
const { InventoryPage, SORT } = require('../pages/InventoryPage');

const loginPage = new LoginPage();
const inventoryPage = new InventoryPage();

/**
 * Defects the application ships ON PURPOSE, behind named accounts.
 *
 * Why assert them as they behave rather than as they should:
 *
 *  - the suite stays green, so a red run always means something changed
 *  - the defect stays VISIBLE in the code rather than living in a wiki
 *  - the day the behaviour is fixed, these tests fail loudly — which is
 *    exactly when somebody should look at them again
 *
 * Each test therefore reads as a bug report with a reproduction attached.
 */
describe('Known defects', () => {
    beforeEach(() => {
        loginPage.visit();
    });

    describe('problem_user', () => {
        beforeEach(() => {
            loginPage.login(USERS.problem);
            inventoryPage.expectLoaded();
        });

        it('serves the same image for every product', () => {
            inventoryPage.images.then(($imgs) => {
                const sources = new Set([...$imgs].map((img) => img.getAttribute('src')));

                // Six products, one distinct image. Worth stating as a count
                // rather than as "the dog picture": the assertion then survives
                // the day somebody swaps the placeholder.
                expect($imgs).to.have.length(6);
                expect(sources.size).to.equal(1);
            });
        });

        it('ignores the Z to A ordering', () => {
            inventoryPage.sortBy(SORT.nameDesc);

            inventoryPage.nameValues().then((names) => {
                const correct = [...names].sort().reverse();
                expect(names).to.not.deep.equal(correct);
            });
        });
    });

    describe('performance_glitch_user', () => {
        it('takes five seconds to show the inventory', () => {
            const marks = {};
            cy.then(() => {
                marks.start = Date.now();
            });

            loginPage.login(USERS.performanceGlitch);
            inventoryPage.expectUrl();

            cy.then(() => {
                marks.url = Date.now() - marks.start;
            });

            inventoryPage.items.should('have.length', 6);

            cy.then(() => {
                marks.content = Date.now() - marks.start;

                // Measured, not guessed: ~5050ms here against ~95ms for
                // standard_user. Asserting a floor rather than a window keeps
                // the test stable on a slow CI machine while still failing the
                // day somebody fixes the account.
                expect(marks.content).to.be.greaterThan(2000);
            });
        });

        it('hides the empty-page window that other runners expose', () => {
            /**
             * A cross-framework finding, and the most interesting thing in this
             * repo.
             *
             * Driving the SAME account with Playwright, the URL settles at
             * ~35ms and the first product appears ~5100ms later. A suite that
             * treats "URL changed" as "page loaded" therefore passes against a
             * blank screen and fails confusingly on the next line.
             *
             * Cypress cannot make that mistake. It waits for the page `load`
             * event after a click-triggered navigation before the queue moves
             * on, so `cy.url()` does not resolve until ~5049ms — by which time
             * the content is already there:
             *
             *            Playwright        Cypress
             *   URL      35ms              5049ms  (not observable earlier)
             *   content  5100ms            5052ms
             *
             * That is a genuine advantage of running inside the browser, and
             * worth knowing in both directions: the same automatic waiting
             * that removes a whole class of flake also means a Cypress suite
             * will NOT notice a five-second regression that a user would.
             * Catching that needs an explicit timing assertion — the test
             * above — not a navigation assertion.
             */
            const marks = {};
            cy.then(() => {
                marks.start = Date.now();
            });

            loginPage.login(USERS.performanceGlitch);
            inventoryPage.expectUrl();

            // Synchronous check, no retrying: by the time Cypress reports the
            // URL, the products are already rendered.
            cy.document().then((doc) => {
                marks.urlAt = Date.now() - marks.start;
                expect(doc.querySelectorAll('[data-test="inventory-item"]')).to.have.length(6);
                expect(marks.urlAt).to.be.greaterThan(2000);
            });
        });
    });

    describe('error_user', () => {
        beforeEach(() => {
            loginPage.login(USERS.error);
            inventoryPage.expectLoaded();
        });

        it('ignores the Z to A ordering as well', () => {
            inventoryPage.sortBy(SORT.nameDesc);

            inventoryPage.nameValues().then((names) => {
                expect(names).to.not.deep.equal([...names].sort().reverse());
            });
        });
    });

    describe('contrast case', () => {
        it('standard_user sorts correctly, so the failures above are the account', () => {
            loginPage.login(USERS.standard);
            inventoryPage.expectLoaded();
            inventoryPage.sortBy(SORT.nameDesc);

            // Without this test the suite only proves "sorting is broken"; with
            // it, the suite proves the defect is SCOPED to those accounts. A
            // bug report that distinguishes the two saves a developer an hour.
            inventoryPage.nameValues().then((names) => {
                expect(names).to.deep.equal([...names].sort().reverse());
            });
        });
    });
});
