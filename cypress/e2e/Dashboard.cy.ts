import {it} from "mocha";


import {StartPage} from "../pages/StartPage";

const startPage = new StartPage();

it(`Cleaer all cookies`, () => {
    startPage.clearCookies();
})

it(`Launch browser at ${startPage.urlBrowser}`, () => {
    startPage.visit();
})

it(`Login`, () => {
    startPage.login();
})

it(`Verify INT release center`, () => {
    cy.contains('div', 'International Release Center').should('be.visible')
})

it(`Verify INT daily build product`, () => {
    cy.contains('td', 'Int Daily Build').should('be.visible')
})

it(`Select INT daily build product`, () => {
    cy.get('table td').contains('Int Daily Build').click()
})

it(`Click on Back button`, () => {
    cy.get('button').contains('BACK').click()
})

it(`Open the product config modal`, () => {
    cy.get('table button').contains('EDIT').click()
    cy.contains('#update-product-modal h3', 'Product Configurations').should('be.visible')
    
})

