/// <reference types="Cypress" />

import * as configHelpers from "../../src/lib/configuration-helpers";
import {createOptionRecordsFromConfigurationRecords} from "../../src/lib/configuration-helpers";
import {mockSolidSession} from "./helpers";

// stub status status response body that indicates the provider is connected
const statusProviderIsConnected = {
    body: {
        provider: 'stub-provider',
        connected: true
    }
}

// stub status response body that indicates the provider is NOT connected
const statusProviderIsNotConnected = {
    body: {
        provider: 'stub-provider',
        connected: false
    }
}


/**
 * Test whether the correct API calls are made when interacting with the Transfer Component
 */
describe('Transfer Component API calls', {retries: 3}, () => {

    beforeEach(() => {
        localStorage.clear()
        mockSolidSession()

        cy.intercept('GET', '/configuration/configuration.json', {fixture: 'configuration.json'})
        cy.intercept('GET', '/rml/*/*.ttl', {fixture : 'example-mapping.ttl'}).as('getContentsOfRMLMapping')
        cy.visit('/')

        cy
            .fixture('configuration')
            .then((records)=>records['configurationRecords'])
            .as('configurationRecords');

        cy
            .get('@configurationRecords')
            .then(configRecords => configHelpers.filterRecordsByType(configRecords, 'pipeline'))
            .as('pipelineRecords');

        cy
            .get('@configurationRecords')
            .then(createOptionRecordsFromConfigurationRecords, (error) => console.log("error while creating options from metadata"))
            .then(options => [{ value: 'default' }, ...options])
            .as('optionRecords')

    })

    it('Should GET the content of a selected RML Mapping', () => {

        // Select option 1 (option 0 is NOT an RML Mapping)
        cy.get('@optionRecords')
            .then(optionRecords => cy.get('[data-test=mapping-selector]').select(optionRecords[1].value))
            .wait('@getContentsOfRMLMapping')
    })

    it('Should NOT make a GET request to check whether the provider is connected when clicking Execute and no RML Mapping is selected', () => {

        // Returns that the stub-provider is connected
        cy.intercept('/status/*/connected', (res) => {
            expect("Unexpected GET request to /status/*/connected").to.be.false
        }).as('getCallForStatusProviderConnectedNotAllowed')


        // Click execute
        cy.get('[data-test=execute-mapping]')
            .click().log('Clicked execute')
    })



    it('Should make a GET request to check whether the provider is connected when clicking Execute', () => {

        // Returns that the stub-provider is connected
        cy.intercept('/status/*/connected', statusProviderIsConnected).as('returnStatusProviderConnected')

        // Select a pipeline that will execute a mapping as its first step.
        // Executing a mapping requires the check whether the corresponding provider is connected.
        cy
            .get('@pipelineRecords')
            .then(pipelineRecords => {
                const pipelineRecordsWithMappingAsFirstStep = pipelineRecords.filter(pr => pr.steps[0].type === 'mappingConfiguration')
                const pipelineIdToSelect = pipelineRecordsWithMappingAsFirstStep[0].id
                cy.get('[data-test=mapping-selector]').select(pipelineIdToSelect)
            })

        // Click execute
        cy.get('[data-test=execute-mapping]').click().log('Clicked execute').wait('@returnStatusProviderConnected')
    })

    it('Should show an alert that the user has to authorize when the provider is NOT connected', () => {

        // Returns that the stub-provider is NOT connected
        cy.intercept('/status/*/connected', statusProviderIsNotConnected).as('returnStatusNotConnected')

        // Fail when intercepting a POST call to /rmlmapper
        cy.intercept('POST', '/rmlmapper/**', (res) => {
            expect("Unexpected POST call to /rmlmapper").to.be.false
        }).as('postCallToRMLMapperNotAllowed')


        // Select option 1(option 0 is NOT an RML Mapping)
        cy.get('@optionRecords').then(optionRecords => cy.get('[data-test=mapping-selector]').select(optionRecords[1].value)).log('Selected option')

        // Click execute
        cy.get('[data-test=execute-mapping]').click().log('Clicked execute')

        // Assert that the Alert box is shown and contains the "Required"
        cy.get('[data-test=alert-box]')
            .contains('Required')
            .log('Alert-box message informs user that authorization with provider is required')

    })

    /**
     * Skip reason: flaky test.
     * Passes locally, but not on CI.
     */
    it.skip('Should make a POST request when executing an RML Mapping when the provider is connected', () => {

        // Returns that the stub-provider is connected
        cy.intercept('/status/*/connected', statusProviderIsConnected).as('returnStatusProviderConnected')
        // Replaces any POST calls to /rmlmappper with the example output response (see /fixtures)
        cy.intercept('POST', '**/rmlmapper', { fixture: 'example-output.json' }).as('postCallToRMLMapper')

        // Select option 1(option 0 is NOT an RML Mapping)
        cy.get('@optionRecords').then(optionRecords => cy.get('[data-test=mapping-selector]').select(optionRecords[1].value)).log('Selected option')

        // Click execute
        cy.get('[data-test=execute-mapping]').click().log('Clicked execute').wait('@postCallToRMLMapper',{timeout: 3000})
    })


    it('Clicking Disconnect Providers should make the appropriate POST call', () => {

        // Intercept POST calls to /logout endpoint
        cy.intercept('/logout', {
            statusCode: 200
        }).as('postCallLogout')

        // Find & expand the Settings card
        cy.get('[data-test=card-header-settings]')
            .click()
            .log('Expanded Settings card')

        // Click the button for logging out the data providers and assert that the POST call has been made
        cy.get('[data-test=button-logout]')
            .click()
            .wait('@postCallLogout')
    })

})
