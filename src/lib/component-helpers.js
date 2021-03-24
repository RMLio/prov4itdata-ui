import CollapsibleCard from "../components/collapsible-card";
import Selector from "../components/selector";
import React from "react";
import {Button} from "react-bootstrap";
import {getSelectedPipeline} from "./storage";

/**
 * Creates the Pipeline Selector Card.
 * @param options
 * @param handleOnSelectionChanged
 * @param handleOnExecute
 * @returns {JSX.Element}
 */
export const createPipelineSelectorCard = (options, handleOnSelectionChanged = f=>f, handleOnExecute = f=>f) => {

    const pipelineSelectorCard = ( <CollapsibleCard id="card-selector" header="Pipeline Selector" headerId="card-header-selector">
        <>
            <Selector
                options={options}
                handleChange={handleOnSelectionChanged}>
            </Selector>

            <Button onClick={handleOnExecute} data-test="btn-execute-pipeline">Execute</Button>
        </>

    </CollapsibleCard>)

    return pipelineSelectorCard
}
