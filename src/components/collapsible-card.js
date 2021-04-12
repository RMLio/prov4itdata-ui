import {Accordion, Button, Card} from "react-bootstrap";
import React from "react";

/**
 * A Bootstrap Accordion Card that can be expanded/collapsed
 * @param header
 * @param headerId
 * @param children
 * @returns {JSX.Element}
 * @constructor
 */
export default function CollapsibleCard({id, header, headerId, children}) {
    const eventKey = 'ek-'+headerId

    return (<Card data-test={id}>
        <Card.Header>
            <Accordion.Toggle as={Button} variant="link" eventKey={eventKey} data-test={headerId}>
                {header}
            </Accordion.Toggle>
        </Card.Header>
        <Accordion.Collapse eventKey={eventKey}>
            <Card.Body>
                {children}
            </Card.Body>
        </Accordion.Collapse>
    </Card>);
}

