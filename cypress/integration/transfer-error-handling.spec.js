describe('Transfer Error Handling', () => {
    it('Should show the default mapping option and a warning when unable to fetch the mappings metadata', () => {

        // Internal Server Error response mock
        const internalServerError = {
            statusCode: 500
        }

        // Visit root
        cy.visit('/')

        // Assert that the default mapping option is present in the selector
        cy.get('[data-test=mapping-selector] > option:first').contains('Select a mapping')

        // Assert that a warning is shown that contains Error
        cy.get('[data-test=alert-box]')
            .contains('Error')
            .log('Alert-box message informs user that an error occurred while fetching the metadata of the mappings')
    })

    it('Should show an alert when an error occurred when logging out the data providers', () => {
        // Intercept POST calls to /logout endpoint
        cy.intercept('/logout', {
            statusCode: 500,
            status: 500
        }).as('postCallLogout')

        cy.visit('/')

        // Find & expand the Settings card
        cy.get('[data-test=card-header-settings]')
            .click()
            .log('Expanded Settings card')

        // Click the button for logging out and assert that the POST call has been made
        cy.get('[data-test=button-logout]')
            .click()
            .wait('@postCallLogout')

        cy.get('[data-test=alert-box]').should('contain.text', 'Error')

    })
})
