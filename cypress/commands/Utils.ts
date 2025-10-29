export default class Utils {
    loginTimeoutInSeconds = 30_000;

    login(url: string, username: string, password: string): void {
        cy.clearAllCookies();
        cy.visit(url);
        cy.contains('Welcome to SNOMED International', {timeout: 15000});
        cy.get('#username').clear();
        cy.get('#username').type(username);
        cy.get('#password').clear();
        cy.get('#password').type(password, {log: false});
        cy.get('input#kc-login', {timeout: this.loginTimeoutInSeconds}).click({force: true});
    }

    logout(): void {
        cy.contains('Logout', {timeout: 10000}).should('be.visible').click();
        cy.get('input#kc-logout').click();
        cy.clearAllCookies();
    }
}
