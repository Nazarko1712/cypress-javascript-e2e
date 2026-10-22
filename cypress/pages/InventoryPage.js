const BasePage = require('./BasePage');

/** The four orderings the sort control offers, keyed by its option values. */
const SORT = {
    nameAsc: 'az',
    nameDesc: 'za',
    priceAsc: 'lohi',
    priceDesc: 'hilo',
};

class InventoryPage extends BasePage {
    constructor() {
        super('/inventory.html');
    }

    get items() {
        return cy.get('[data-test="inventory-item"]');
    }

    get names() {
        return cy.get('[data-test="inventory-item-name"]');
    }

    get prices() {
        return cy.get('[data-test="inventory-item-price"]');
    }

    get sortSelect() {
        return cy.get('[data-test="product-sort-container"]');
    }

    get cartLink() {
        return cy.get('[data-test="shopping-cart-link"]');
    }

    get cartBadge() {
        return cy.get('[data-test="shopping-cart-badge"]');
    }

    get images() {
        return cy.get('.inventory_item_img img');
    }

    /**
     * Build the data-test attribute from a product name.
     *
     * The application derives these itself — "Sauce Labs Backpack" becomes
     * `add-to-cart-sauce-labs-backpack` — so deriving them the same way keeps
     * the tests readable (`addToCart('Sauce Labs Backpack')`) without hiding
     * what they actually select.
     *
     * @param {string} product
     */
    static slug(product) {
        return product.toLowerCase().replace(/\s+/g, '-');
    }

    addToCart(product) {
        cy.get(`[data-test="add-to-cart-${InventoryPage.slug(product)}"]`).click();
        return this;
    }

    removeFromCart(product) {
        cy.get(`[data-test="remove-${InventoryPage.slug(product)}"]`).click();
        return this;
    }

    sortBy(order) {
        this.sortSelect.select(order);
        return this;
    }

    openCart() {
        this.cartLink.click();
        return this;
    }

    /**
     * Wait for the CONTENT, not just the URL.
     *
     * Cypress happens to make this hard to get wrong — it waits for the page
     * `load` event after a navigation, so `cy.url()` does not resolve early.
     * The habit is still right, and portable: driving the same
     * `performance_glitch_user` account with Playwright, the URL settles at
     * ~35ms while the first product appears ~5100ms later, so a URL-only
     * assertion passes against a blank page. See known-defects.cy.js for the
     * measurement in both runners.
     */
    expectLoaded() {
        this.items.should('have.length.greaterThan', 0);
        return this;
    }

    /**
     * Read the visible prices as numbers.
     *
     * Returns a Cypress chainer, not an array — `cy.get()` is asynchronous, so
     * a page object cannot hand back a plain value. The caller consumes it with
     * `.then()`, which keeps the command queue intact.
     */
    priceValues() {
        return this.prices.then(($els) =>
            [...$els].map((el) => Number(el.textContent.replace('$', ''))),
        );
    }

    nameValues() {
        return this.names.then(($els) => [...$els].map((el) => el.textContent.trim()));
    }
}

module.exports = { InventoryPage, SORT };
