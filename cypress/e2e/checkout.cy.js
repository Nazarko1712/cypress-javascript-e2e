const { LoginPage, USERS } = require('../pages/LoginPage');
const { InventoryPage } = require('../pages/InventoryPage');
const CartPage = require('../pages/CartPage');
const CheckoutPage = require('../pages/CheckoutPage');

const loginPage = new LoginPage();
const inventoryPage = new InventoryPage();
const cartPage = new CartPage();
const checkoutPage = new CheckoutPage();

const BACKPACK = 'Sauce Labs Backpack';
const BIKE_LIGHT = 'Sauce Labs Bike Light';

describe('Checkout', () => {
    beforeEach(() => {
        loginPage.visit();
        loginPage.login(USERS.standard);
        inventoryPage.expectLoaded();
    });

    it('completes an order end to end', () => {
        inventoryPage.addToCart(BACKPACK).openCart();
        cartPage.expectContains(BACKPACK).checkout();
        checkoutPage.fillCustomerInfo().continue();
        checkoutPage.finish();

        checkoutPage.expectComplete();
    });

    it('empties the cart after a completed order', () => {
        inventoryPage.addToCart(BACKPACK).openCart();
        cartPage.checkout();
        checkoutPage.fillCustomerInfo().continue().finish();
        checkoutPage.expectComplete();

        // The badge is the user-visible signal that the order really was
        // handed over rather than just acknowledged.
        inventoryPage.cartBadge.should('not.exist');
    });

    describe('customer information form', () => {
        beforeEach(() => {
            inventoryPage.addToCart(BACKPACK).openCart();
            cartPage.checkout();
        });

        it('requires a first name', () => {
            checkoutPage.fillCustomerInfo({ first: '', last: 'User', zip: '12345' }).continue();

            checkoutPage.expectError('First Name is required');
        });

        it('requires a last name', () => {
            checkoutPage.fillCustomerInfo({ first: 'Test', last: '', zip: '12345' }).continue();

            checkoutPage.expectError('Last Name is required');
        });

        it('requires a postal code', () => {
            checkoutPage.fillCustomerInfo({ first: 'Test', last: 'User', zip: '' }).continue();

            checkoutPage.expectError('Postal Code is required');
        });

        it('reports the FIRST missing field, not all of them', () => {
            checkoutPage.fillCustomerInfo({ first: '', last: '', zip: '' }).continue();

            // Documented rather than judged. A form that reveals one problem at
            // a time makes a user submit three times to learn three things; the
            // test pins the current behaviour so a change to it is visible.
            checkoutPage.expectError('First Name is required');
            checkoutPage.error.should('not.contain.text', 'Last Name');
        });

        it('stays on the form when validation fails', () => {
            checkoutPage.fillCustomerInfo({ first: '', last: '', zip: '' }).continue();

            cy.url().should('include', '/checkout-step-one.html');
        });
    });

    describe('order summary arithmetic', () => {
        beforeEach(() => {
            inventoryPage.addToCart(BACKPACK).addToCart(BIKE_LIGHT).openCart();
            cartPage.checkout();
            checkoutPage.fillCustomerInfo().continue();
        });

        it('shows every item that was added', () => {
            cy.get('[data-test="inventory-item-name"]').should('have.length', 2);
        });

        it('adds the item prices into the subtotal', () => {
            cy.get('[data-test="inventory-item-price"]')
                .then(($els) => [...$els].map((el) => Number(el.textContent.replace('$', ''))))
                .then((prices) => {
                    const expected = prices.reduce((sum, p) => sum + p, 0);
                    checkoutPage.totals().then(({ subtotal }) => {
                        expect(subtotal).to.be.closeTo(expected, 0.01);
                    });
                });
        });

        it('charges 8% tax on the subtotal', () => {
            checkoutPage.totals().then(({ subtotal, tax }) => {
                // closeTo, not equal: the application rounds to cents, so an
                // exact float comparison would fail on arithmetic that is in
                // fact correct.
                expect(tax).to.be.closeTo(subtotal * 0.08, 0.01);
            });
        });

        it('sums subtotal and tax into the total', () => {
            checkoutPage.totals().then(({ subtotal, tax, total }) => {
                expect(total).to.be.closeTo(subtotal + tax, 0.01);
            });
        });
    });

    describe('abandoning the flow', () => {
        it('returns to the inventory from the cart', () => {
            inventoryPage.addToCart(BACKPACK).openCart();

            cartPage.continueShoppingButton.click();

            inventoryPage.expectUrl().expectLoaded();
        });

        it('keeps the cart when the customer form is cancelled', () => {
            inventoryPage.addToCart(BACKPACK).openCart();
            cartPage.checkout();

            cy.get('[data-test="cancel"]').click();

            cartPage.expectContains(BACKPACK);
        });

        it('removes the last item and leaves the cart empty', () => {
            inventoryPage.addToCart(BACKPACK).openCart();

            cartPage.removeFromCart(BACKPACK);

            cartPage.expectEmpty();
        });
    });
});
