const BasePage = require('./BasePage');

class CartPage extends BasePage {
    constructor() {
        super('/cart.html');
    }

    get items() {
        return cy.get('[data-test="inventory-item"]');
    }

    get names() {
        return cy.get('[data-test="inventory-item-name"]');
    }

    get quantities() {
        return cy.get('[data-test="item-quantity"]');
    }

    get checkoutButton() {
        return cy.get('[data-test="checkout"]');
    }

    get continueShoppingButton() {
        return cy.get('[data-test="continue-shopping"]');
    }

    removeFromCart(product) {
        const slug = product.toLowerCase().replace(/\s+/g, '-');
        cy.get(`[data-test="remove-${slug}"]`).click();
        return this;
    }

    checkout() {
        this.checkoutButton.click();
        return this;
    }

    expectLoaded() {
        this.checkoutButton.should('be.visible');
        return this;
    }

    expectContains(product) {
        this.names.should('contain.text', product);
        return this;
    }

    expectEmpty() {
        this.items.should('not.exist');
        return this;
    }
}

module.exports = CartPage;
