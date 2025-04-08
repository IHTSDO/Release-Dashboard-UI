export class StartPage {

    urlRad = Cypress.env('URL_RAD');
    username = Cypress.env('TEST_LOGIN_USR');
    password = Cypress.env('TEST_LOGIN_PSW');

    clearCookies() {
        cy.clearCookies()
    }

    visit() {
        cy.visit(this.urlRad);
    }

    login() {
        // fill in the form
        cy.get('#username').type(this.username, {log:false})
        cy.get('#password').type(this.password, {log:false})

        // submit the form
        cy.get('button').contains('Sign me in!').click()
        cy.contains('span', 'Logout').should('be.visible')
    }
}
