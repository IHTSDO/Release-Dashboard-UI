export default class Utils {
    loginTimeoutInSeconds = 30_000;

    login(url: string, username: string, password: string): void {
        cy.clearAllCookies();
        cy.visit(url);
        cy.contains('Please Log In');
        cy.get('#username').clear();
        cy.get('#username').type(username);
        cy.get('#password').clear();
        cy.get('#password').type(password, {log: false});
        cy.get('button#submit', {timeout: this.loginTimeoutInSeconds}).click({force: true});
    }

    logout(): void {
        cy.contains('Logout').click();
        cy.clearAllCookies();
    }
}
