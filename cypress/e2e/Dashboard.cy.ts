import Utils from '../commands/Utils';

const utils = new Utils();

describe('Release Dashboard', () => {

    const url = Cypress.env('URL_RAD');
    const username = Cypress.env('TEST_LOGIN_USR');
    const password = Cypress.env('TEST_LOGIN_PSW');

    it(`Launch release dashboard at ${url}`, () => {
        utils.login(url, username, password);
    })

    it(`Verify All release centers are loaded`, () => {
        cy.get('.centers').first().find('div').each((element) => {
            expect(element).to.exist
            cy.wrap(element).click()
            cy.wait(3000)
            cy.get('table').first().should('exist').and('be.visible')
                .within(() => {
                    cy.get('tbody').children('tr').should('have.length.at.least', 1);
                    cy.get('tbody').children('tr').first().find('td').should('not.include.text', 'Loading')
                })
        });
    })

    it(`Verify INT release center`, () => {
        cy.contains('div', 'International Release Center').should('be.visible')
        cy.get('.centers').first().find('div').first().click()
        cy.wait(3000)
        cy.get('table').first().should('exist').and('be.visible')
            .within(() => {
                cy.get('tbody').children('tr').should('have.length.at.least', 2)
            });
    })

    it(`Verify INT daily build product and its' builds, then back`, () => {
        cy.get('.centers').first().find('div').first().click()
        cy.wait(3000)
        cy.contains('td', 'Int Daily Build').should('be.visible')
        cy.get('table td').contains('Int Daily Build').click()
        cy.wait(10000)
        cy.get('table').first().should('exist').and('be.visible')
            .within(() => {
                cy.get('tbody').children('tr').should('have.length.at.least', 2)
            });

        cy.get('button').contains('BACK').click()
        cy.wait(3000)
        cy.get('table').first().should('exist').and('be.visible')
            .within(() => {
                cy.get('tbody').children('tr').should('have.length.at.least', 2)
            });
    })

    it(`Open the product config modal`, () => {
        cy.get('.centers').first().find('div').first().click()
        cy.wait(3000)
        cy.get('table button').contains('EDIT').click()
        cy.contains('#update-product-modal h3', 'Product Configurations').should('be.visible')
    })

    /*it('Logout', () => {
        utils.logout();
        cy.contains('Please Log In').should('be.visible');
    });*/

})
