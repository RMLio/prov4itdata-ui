import React from 'react';
import {Form} from 'react-bootstrap';



export default function MappingSelector({ 
    options,
    selectedOptionValue,
    handleChange = f => f}) {


    // Creates a JSX element for the given option
    const renderOption = (option) => {
            return (
                <option key={option.value} value={option.value}>{option.label}</option>
            );
        }


    // Render options and keep the default option as the first option.
    const renderedOptions = options ? options.map(renderOption) : null

    return (
        <Form >
                <Form.Group controlId="exampleForm.SelectCustom">
                    <Form.Control
                        as="select" custom
                        value={selectedOptionValue}
                        onChange={(e)=>{handleChange(e)}}
                        data-test="mapping-selector"
                    >
                        {renderedOptions}
                    </Form.Control>
                </Form.Group>
            </Form>
    );
}
