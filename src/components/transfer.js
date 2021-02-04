import {Accordion, Button, Card} from "react-bootstrap";
import React from "react";
import SyntaxHighlighter from "react-syntax-highlighter";
import MappingSelector from "./mapping-selector";
import DownloadButton from './download-button';


function clientDownload(data, filename){
    // Let the client download the provenance
    const a = document.createElement('a')
    const file = new Blob([data], {type: 'text/turtle'})
    a.href = URL.createObjectURL(file)
    a.download = filename
    a.click()
    // release the object URL again
    URL.revokeObjectURL(a.href)
}

export default function Transfer({mappings,
                                     selectedOptionValue,
                                     mappingContent,
                                     generatedOutput,
                                     provenance,
                                     solidData,
                                     handleOnMappingChange = f => f,
                                     handleOnExecute = f => f,
                                     handleSolidFetch = f => f,
                                     handleSolidClear = f => f,
                                     handleDownload = f => f
                                    }
                                     ) {

    const btnDownloadRMLMapping =
        (<DownloadButton
            data-test="download-rml-mapping"
            onClick={(e) => {
                console.log("clicked download RML Mapping")
                clientDownload(mappingContent, 'mapping.ttl')
            }}>

        </DownloadButton>)

    const btnDownloadGeneratedOutput =
        (<DownloadButton
            data-test="download-generated-output"
            onClick={(e) => {
                console.log("clicked download generated output ")
                clientDownload(generatedOutput, 'out.ttl')
            }}>

        </DownloadButton>)

    const btnDownloadProvenance =
    (<DownloadButton
        data-test="download-provenance"
        onClick={(e) => {
            console.log("clicked download Provenance ")
            clientDownload(provenance, 'prov.ttl')
        }}>

    </DownloadButton>)

    return (
        <div data-test="transfer">
            <Accordion defaultActiveKey="0">

                {/*MAPPING SELECTOR*/}
                <Card>
                    <Card.Header>
                       Mapping Selector
                    </Card.Header>

                        <Card.Body>
                            <MappingSelector
                                options={mappings}
                                selectedOptionValue={selectedOptionValue}
                                handleChange={(e)=>{
                                    handleOnMappingChange(e)
                                }}

                            />

                            <Button onClick={(e)=>handleOnExecute(e)} data-test="execute-mapping">Execute</Button>
                        </Card.Body>
                </Card>

                {/*RML MAPPING*/}
                <Card data-test="card-rml-mapping">
                    <Card.Header>
                        <Accordion.Toggle as={Button} variant="link" eventKey="1" data-test="card-header-RMLMapping">
                            RML Mapping
                        </Accordion.Toggle>
                        {btnDownloadRMLMapping}
                    </Card.Header>
                    <Accordion.Collapse eventKey="1">
                        <Card.Body>

                            <SyntaxHighlighter
                                language="turtle"
                                wrapLines={true}
                                lineNumberContainerStyle={true}
                            >{mappingContent}</SyntaxHighlighter>
                        </Card.Body>
                    </Accordion.Collapse>
                </Card>

                {/*GENERATED RDF*/}
                <Card data-test="card-generated-rdf">
                    <Card.Header>
                        <Accordion.Toggle as={Button} variant="link" eventKey="2" data-test="card-header-generated-rdf">
                            Generated RDF
                        </Accordion.Toggle>
                        {btnDownloadGeneratedOutput}
                    </Card.Header>
                    <Accordion.Collapse eventKey="2">
                        <Card.Body>
                            <SyntaxHighlighter
                                language="turtle"
                                wrapLines={true}
                                lineNumberContainerStyle={true}
                            >{generatedOutput}</SyntaxHighlighter>

                        </Card.Body>
                    </Accordion.Collapse>
                </Card>

                {/*PROVENANCE*/}
                <Card data-test="card-provenance">
                    <Card.Header>
                        <Accordion.Toggle as={Button} variant="link" eventKey="3">
                            Provenance
                        </Accordion.Toggle>
                        {btnDownloadProvenance}
                    </Card.Header>
                    <Accordion.Collapse eventKey="3">
                        <Card.Body>
                            <SyntaxHighlighter
                                language="turtle"
                                wrapLines={true}
                                lineNumberContainerStyle={true}
                            >{provenance}</SyntaxHighlighter>

                        </Card.Body>
                    </Accordion.Collapse>
                </Card>

                {/*SOLID*/}
                <Card data-test="card-solid">
                    <Card.Header>
                        <Accordion.Toggle as={Button} variant="link" eventKey="4">
                            Solid
                        </Accordion.Toggle>
                    </Card.Header>
                    <Accordion.Collapse eventKey="4">

                        <Card.Body>
                            <Button data-test="button-solid-fetch" onClick={(e)=>handleSolidFetch(e)}>Fetch</Button>
                            <Button data-test="button-solid-clear" onClick={(e)=>handleSolidClear(e)}>Clear</Button>
                            <SyntaxHighlighter
                                language="turtle"
                                wrapLines={true}
                                lineNumberContainerStyle={true}
                            >{solidData}</SyntaxHighlighter>

                        </Card.Body>
                    </Accordion.Collapse>
                </Card>

            </Accordion>
        </div>);
}
