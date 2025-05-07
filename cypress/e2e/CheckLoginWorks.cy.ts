import Utils from '../commands/Utils';

const utils = new Utils();

describe('Login/Logout Test', () => {
    const url = Cypress.env('URL_RAD');
    const username = Cypress.env('TEST_LOGIN_USR');
    const password = Cypress.env('TEST_LOGIN_PSW');

    it('Login attempt with invalid password', () => {
        utils.login(url, username, 'Invalid Password');
        cy.contains("Error").should('be.visible');
        cy.contains("Invalid username or password").should('be.visible');
    });

    it('Login attempt with invalid username', () => {
        utils.login(url, 'Invalid username', password);
        cy.contains("Error").should('be.visible');
        cy.contains("Invalid username or password").should('be.visible');
    });

    it('Login attempt with good credentials', () => {
        utils.login(url, username, password);
        cy.contains("SNOMED CT Release Dashboard").should('be.visible');
    });

    it('Logout', () => {
        utils.logout();
        cy.contains("Please Log In").should('be.visible');
    });
});
