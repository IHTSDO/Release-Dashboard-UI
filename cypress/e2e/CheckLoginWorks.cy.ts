import Utils from '../commands/Utils';

const utils = new Utils();

const url = Cypress.env('URL_RAD');
const username = Cypress.env('TEST_LOGIN_USR');
const password = Cypress.env('TEST_LOGIN_PSW');

describe('Login/Logout Test', () => {

    it('Login attempt with invalid password', () => {
        utils.login(url, username, 'Invalid Password');
        cy.contains("Invalid username or password").should('be.visible');
    });

    it('Login attempt with invalid username', () => {
        utils.login(url, 'Invalid username', password);
        cy.contains("Invalid username or password").should('be.visible');
    });

    it('Login attempt with good credentials', () => {
        utils.login(url, username, password);
        cy.contains("SNOMED CT Release Dashboard", {timeout: 15000}).should('be.visible');
    });

    it('Logout', () => {
        utils.logout();
        cy.contains('Welcome to SNOMED International', {timeout: 15000}).should('be.visible');
        cy.contains('Sign In').should('be.visible');
    });
});
