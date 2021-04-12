/// <reference types="Cypress" />

import {createOptionRecordsFromConfigurationRecords, filterRecordsByType} from "../../src/lib/configuration-helpers";


describe('Transfer Component', {retries:3}, () => {


    /**
     * Tests for the minimal required elements of
     * the collapsable cards
     * @param {*} selector
     */
    function testMinimalCollapseCardStructure(selector) {
        cy.get(selector).find('.card-header')
        cy.get(selector).find('.card-body')
        cy.get(selector).find('.card-body > pre')
    }

    /**
     * Tests for the minimal collapsable card structure that contains a download element
     * @param {*} selector
     */
    function testDownloadCollapseCard(selector) {
        testMinimalCollapseCardStructure(selector)
        cy.get(selector).contains('a', 'Download')
    }

    function selectOption(selectId, nthOption) {
        cy.get(selectId).then((options)=>{
            cy.get(selectId).select(options.children('option').eq(nthOption).val())
        })
    }

    beforeEach(() => {

        cy.intercept('GET', '/configuration/configuration.json', {fixture: 'configuration.json'})

        cy
            .fixture('configuration')
            .then((config)=>config['configurationRecords'])
            .then((records)=>filterRecordsByType(records, 'pipeline'))
            .as('pipelines')

        cy.visit('/')

        cy
            .fixture('configuration')
            .then((config)=>config['configurationRecords'])
            .then(createOptionRecordsFromConfigurationRecords, (error) => console.log("error while creating options from metadata"))
            .then(options => [{ value: 'default' }, ...options])
            .as('optionRecords')


        cy.intercept({
            method: 'GET',
            path: '/rml/*/*'

        }, { 'fixture': 'example-mapping.ttl' })


    })

    it('The transfer component exists', () => {
        cy.get('[data-test=transfer]')
    })

    it('The mapping-selector exists', () => {
        cy.get('[data-test=mapping-selector]')
    })

    it('Contains the execute button', () => {
        cy.get('[data-test=execute-mapping]')
    })

    it('Contains the RML Mapping card', () => {
        testDownloadCollapseCard('[data-test=card-rml-mapping]')

    })

    it('Contains the Generated RDF card', () => {
        testDownloadCollapseCard('[data-test=card-generated-rdf]')
    })

    it('Contains the provenance card', () => {
        testDownloadCollapseCard('[data-test=card-provenance]')
    })

    it('Contains the Solid card', () => {
        cy.get('[data-test=card-solid] > .card-header > .btn').click()
        cy.get('[data-test=card-solid')
        cy.get('[data-test=button-solid-fetch]')
        cy.get('[data-test=button-solid-clear]')
    })

    it('Mapping selector contains options', () => {
        cy.get('[data-test=mapping-selector]').children('option').should('have.length.at.least', 1)
    })

    it.skip('Shows the content of the selected RML Mapping', () => {

    })

    it('Successfully executes a mapping', () => {

        // Pretend that the provider is connected
        cy.intercept('GET', '/status/**', (req) => {
            req.reply({ provider: 'stub', connected: true })
        })

        // POST calls to /rmlmapper will get the example-output.json as response
        cy.intercept('POST', '/rmlmapper/**', { fixture: 'example-output.json' }).as('postCallForMappingExecution')

        // Select the first RML Mapping
        const idSelect = '[data-test=mapping-selector]'
        selectOption(idSelect, 1)

        // Execute RML Mapping
        cy.get('[data-test=execute-mapping]').click()

        // Expand card: generated rdf
        cy.get('[data-test=card-generated-rdf] > .collapse > .card-body > pre').should('not.be.visible')
        cy.get('[data-test=card-generated-rdf] > .card-header > .btn').click()
        cy.get('[data-test=card-generated-rdf] > .collapse > .card-body > pre').should('be.visible')

        // Expand card: provenance
        cy.get('[data-test=card-provenance] > .collapse > .card-body > pre').should('not.be.visible')
        cy.get('[data-test=card-provenance] > .card-header > .btn').click()
        cy.get('[data-test=card-provenance] > .collapse > .card-body > pre').should('be.visible')

    })

    it('Correctly renders the Query card',()=>{
        // Test whether the query card exists
        cy.get('[data-test=card-query]').log('Query card exists');

        // Find query card header & expand the query card
        cy.get('[data-test=card-header-query]')
            .click()

        // Test whether the syntax component for the query result exists
        cy.get('[data-test=query-result]').log('Query result syntax component exists')
    })

})
