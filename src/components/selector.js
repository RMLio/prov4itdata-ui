import React from 'react';
import {Form} from 'react-bootstrap';


/**
 *
 * @param options: array of Objects. Every Object should have the properties: key, value, label
 * @param selectedOptionValue
 * @param handleChange
 * @returns {JSX.Element}
 * @constructor
 */
export default function Selector({
    options,
    selectedOptionValue,
    handleChange = f => f}) {


    // Creates a JSX element for the given option
    const renderOption = (option) => {
            return (
                <option key={option.key} value={option.value}>{option.label}</option>
            );
        }


    // Render options and keep the default option as the first option.
    const renderedOptions = options ? options.map(renderOption) : null

    return (
        <Form >
                <Form.Group controlId="selectorForm.Select">
                    <Form.Control
                        as="select" custom
                        value={selectedOptionValue?selectedOptionValue:undefined}
                        onChange={(e)=>{handleChange(e)}}
                        data-test="selector"
                    >
                        {renderedOptions}
                    </Form.Control>
                </Form.Group>
            </Form>
    );
}
