const BasePage = require('./BasePage');

/**
 * Covers all three checkout steps.
 *
 * One class rather than three, because the steps share a single linear flow and
 * splitting them would mean three files whose only content is one selector
 * each. Page objects map to USER-FACING SURFACES, not one-to-one to URLs — the
 * useful question is "would a tester describe these as separate screens with
 * separate concerns?", and here the answer is no: it is one checkout.
 */
class CheckoutPage extends BasePage {
    constructor() {
        super('/checkout-step-one.html');
    }

    // --- step one: the customer information form ---

    get firstName() {
        return cy.get('[data-test="firstName"]');
    }

    get lastName() {
        return cy.get('[data-test="lastName"]');
    }

    get postalCode() {
        return cy.get('[data-test="postalCode"]');
    }

    get continueButton() {
        return cy.get('[data-test="continue"]');
    }

    get error() {
        return cy.get('[data-test="error"]');
    }

    // --- step two: the order summary ---

    get subtotalLabel() {
        return cy.get('[data-test="subtotal-label"]');
    }

    get taxLabel() {
        return cy.get('[data-test="tax-label"]');
    }

    get totalLabel() {
        return cy.get('[data-test="total-label"]');
    }

    get finishButton() {
        return cy.get('[data-test="finish"]');
    }

    // --- step three: confirmation ---

    get completeHeader() {
        return cy.get('[data-test="complete-header"]');
    }

    fillCustomerInfo({ first = 'Test', last = 'User', zip = '12345' } = {}) {
        if (first) this.firstName.type(first);
        if (last) this.lastName.type(last);
        if (zip) this.postalCode.type(zip);
        return this;
    }

    continue() {
        this.continueButton.click();
        return this;
    }

    finish() {
        this.finishButton.click();
        return this;
    }

    expectError(message) {
        this.error.should('be.visible').and('contain.text', message);
        return this;
    }

    expectComplete() {
        cy.url().should('include', '/checkout-complete.html');
        this.completeHeader.should('contain.text', 'Thank you for your order');
        return this;
    }

    /** Parse a money label such as "Item total: $29.99" into a number. */
    static amount(text) {
        return Number(text.replace(/[^0-9.]/g, ''));
    }

    /**
     * Hand the three money values to the caller as numbers.
     *
     * The arithmetic itself stays in the TEST, not here. A page object that
     * asserted "tax is 8%" would be encoding a business rule, and the next
     * person to change the rate would have to find it inside a page object
     * instead of in the test that claims it.
     */
    totals() {
        return this.subtotalLabel.invoke('text').then((sub) =>
            this.taxLabel.invoke('text').then((tax) =>
                this.totalLabel.invoke('text').then((total) => ({
                    subtotal: CheckoutPage.amount(sub),
                    tax: CheckoutPage.amount(tax),
                    total: CheckoutPage.amount(total),
                })),
            ),
        );
    }
}

module.exports = CheckoutPage;
