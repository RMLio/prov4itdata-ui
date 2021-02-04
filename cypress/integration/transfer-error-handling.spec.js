describe('Transfer Error Handling', () => {
    it('Should show the default mapping option and a warning when unable to fetch the mappings metadata', () => {

        // Internal Server Error response mock
        const internalServerError = {
            statusCode: 500
        }

        // Intercepts calls for the RML Mapping data and mock an internal server error
        cy.intercept('**/mappings-metadata.json', internalServerError);

        // Visit root
        cy.visit('/')

        // Assert that the default mapping option is present in the selector
        cy.get('[data-test=mapping-selector] > option:first').contains('Select a mapping')

        // Assert that a warning is shown that contains Error
        cy.get('[data-test=alert-box]')
            .contains('Error')
            .log('Alert-box message informs user that an error occurred while fetching the metadata of the mappings')
    })
})
