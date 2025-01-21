export class StartPage {

    urlBrowser = Cypress.env('URL_RAD');
    username = Cypress.env('TEST_LOGIN_USR');
    password = Cypress.env('TEST_LOGIN_PSW');

    clearCookies() {
        cy.clearCookies()
    }

    visit() {
        cy.visit(this.urlBrowser);
    }

    login() {
        // fill in the form
        cy.get('#username').type(this.username)
        cy.get('#password').type(this.password)

        // submit the form
        cy.get('button').contains('LOG IN').click()
        cy.contains('span', 'Logout').should('be.visible')
    }
}
