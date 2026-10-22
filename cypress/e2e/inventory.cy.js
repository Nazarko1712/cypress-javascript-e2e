const { LoginPage, USERS } = require('../pages/LoginPage');
const { InventoryPage, SORT } = require('../pages/InventoryPage');
const CartPage = require('../pages/CartPage');

const loginPage = new LoginPage();
const inventoryPage = new InventoryPage();
const cartPage = new CartPage();

const BACKPACK = 'Sauce Labs Backpack';
const BIKE_LIGHT = 'Sauce Labs Bike Light';

describe('Inventory', () => {
    beforeEach(() => {
        loginPage.visit();
        loginPage.login(USERS.standard);
        inventoryPage.expectLoaded();
    });

    describe('catalogue', () => {
        it('lists every product', () => {
            inventoryPage.items.should('have.length', 6);
        });

        it('shows a name, a description and a price on each card', () => {
            inventoryPage.items.each(($item) => {
                cy.wrap($item).find('[data-test="inventory-item-name"]').should('not.be.empty');
                cy.wrap($item).find('[data-test="inventory-item-desc"]').should('not.be.empty');
                cy.wrap($item)
                    .find('[data-test="inventory-item-price"]')
                    .invoke('text')
                    .should('match', /^\$\d+\.\d{2}$/);
            });
        });
    });

    describe('sorting', () => {
        it('orders names A to Z', () => {
            inventoryPage.sortBy(SORT.nameAsc);

            inventoryPage.nameValues().then((names) => {
                expect(names).to.deep.equal([...names].sort());
            });
        });

        it('orders names Z to A', () => {
            inventoryPage.sortBy(SORT.nameDesc);

            inventoryPage.nameValues().then((names) => {
                expect(names).to.deep.equal([...names].sort().reverse());
            });
        });

        it('orders prices low to high', () => {
            inventoryPage.sortBy(SORT.priceAsc);

            inventoryPage.priceValues().then((prices) => {
                expect(prices).to.deep.equal([...prices].sort((a, b) => a - b));
            });
        });

        it('orders prices high to low', () => {
            inventoryPage.sortBy(SORT.priceDesc);

            inventoryPage.priceValues().then((prices) => {
                expect(prices).to.deep.equal([...prices].sort((a, b) => b - a));
            });
        });

        it('compares prices numerically, not as strings', () => {
            inventoryPage.sortBy(SORT.priceAsc);

            // The trap this guards: "$49.99" < "$7.99" is TRUE as a string
            // comparison, so a lexicographic sort looks almost right and is
            // wrong exactly where it matters.
            inventoryPage.priceValues().then((prices) => {
                expect(prices[0]).to.be.lessThan(prices[prices.length - 1]);
                expect(prices.some((p) => p >= 10)).to.equal(true);
                expect(prices.some((p) => p < 10)).to.equal(true);
            });
        });
    });

    describe('cart', () => {
        it('has no badge before anything is added', () => {
            inventoryPage.cartBadge.should('not.exist');
        });

        it('adds one product and counts it', () => {
            inventoryPage.addToCart(BACKPACK);

            inventoryPage.cartBadge.should('have.text', '1');
        });

        it('counts several products', () => {
            inventoryPage.addToCart(BACKPACK).addToCart(BIKE_LIGHT);

            inventoryPage.cartBadge.should('have.text', '2');
        });

        it('swaps the button to Remove once added', () => {
            inventoryPage.addToCart(BACKPACK);

            cy.get('[data-test="remove-sauce-labs-backpack"]').should('be.visible');
            cy.get('[data-test="add-to-cart-sauce-labs-backpack"]').should('not.exist');
        });

        it('removes a product and drops the badge', () => {
            inventoryPage.addToCart(BACKPACK);
            inventoryPage.removeFromCart(BACKPACK);

            inventoryPage.cartBadge.should('not.exist');
        });

        it('carries the selection through to the cart page', () => {
            inventoryPage.addToCart(BACKPACK).openCart();

            cartPage.expectLoaded().expectContains(BACKPACK);
            cartPage.quantities.should('have.text', '1');
        });

        it('keeps the cart across a page reload', () => {
            inventoryPage.addToCart(BACKPACK);

            cy.reload();

            // Asserting persistence explicitly: a cart that silently empties on
            // refresh is a bug users hit constantly and suites rarely cover.
            inventoryPage.cartBadge.should('have.text', '1');
        });
    });
});
