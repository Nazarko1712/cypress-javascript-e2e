const { LoginPage, USERS } = require('../pages/LoginPage');
const { InventoryPage } = require('../pages/InventoryPage');

const loginPage = new LoginPage();
const inventoryPage = new InventoryPage();

describe('Login', () => {
    beforeEach(() => {
        loginPage.visit().expectLoaded();
    });

    it('signs in a valid user and lands on the inventory', () => {
        loginPage.login(USERS.standard);

        inventoryPage.expectUrl().expectLoaded();
    });

    it('rejects a wrong password', () => {
        loginPage.login(USERS.standard, 'definitely-wrong');

        loginPage.expectError('Username and password do not match');
        cy.url().should('not.include', '/inventory.html');
    });

    it('rejects an unknown user', () => {
        loginPage.login('no_such_user');

        loginPage.expectError('Username and password do not match');
    });

    it('refuses a locked-out account with a distinct message', () => {
        loginPage.login(USERS.lockedOut);

        // A DIFFERENT message from the wrong-password case. That matters:
        // the two are distinguishable to a user, so the test should prove
        // they stay distinguishable.
        loginPage.expectError('this user has been locked out');
    });

    it('requires a username', () => {
        loginPage.login('', '');

        loginPage.expectError('Username is required');
    });

    it('requires a password', () => {
        loginPage.login(USERS.standard, '');

        loginPage.expectError('Password is required');
    });

    it('does not leak which field was wrong on a failed login', () => {
        loginPage.login('no_such_user', 'also-wrong');

        // Same message as a valid username with a bad password. An API that
        // answered "no such user" here would be a user-enumeration finding:
        // an attacker could confirm which accounts exist without a password.
        loginPage.expectError('Username and password do not match');
    });

    it('keeps the session across a direct visit — which answers 404', () => {
        loginPage.login(USERS.standard);
        inventoryPage.expectLoaded();

        // `failOnStatusCode: false` is NOT papering over a flake here. The app
        // is hosted on GitHub Pages, which has no server-side routing: every
        // path except `/` returns a genuine HTTP 404 together with a redirect
        // shim that rewrites the URL client-side and hands over to the SPA.
        //
        //     GET /                -> 200
        //     GET /inventory.html  -> 404   (page still renders)
        //     GET /cart.html       -> 404   (page still renders)
        //
        // A human sees a working page; curl, a crawler and an uptime check all
        // see a 404. See the README — this is the finding, not the workaround.
        cy.visit('/inventory.html', { failOnStatusCode: false });

        inventoryPage.expectLoaded();
    });

    it('blocks the inventory for an anonymous visitor', () => {
        cy.clearAllCookies();
        cy.clearAllLocalStorage();

        cy.visit('/inventory.html', { failOnStatusCode: false });

        // The guard sends you back to the login screen with an explanation.
        loginPage.expectError('You can only access');
    });
});
