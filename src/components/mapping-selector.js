import React from 'react';
import {Form, Container, Row} from 'react-bootstrap';

/**
 * Mapping Selector Component
 */
class MappingSelector extends React.Component {

    /**
     *
     * @param props
     */
    constructor(props) {
        super(props)
        this.label = props.label
        this.options = props.options
        if(props.hasOwnProperty('handleChange')) {
            console.log("MappingSelector initialized with handleChange in props")
            this.handleChange = props.handleChange.bind(this)
        }
    }

    /**
     *
     * @param e
     */
    handleChange(e) {
        console.log("@MappingSelector.handleChange... e: ", e)
    }

    /**
     *
     * @param option
     * @returns {JSX.Element}
     */
    renderOption(option) {
        return (
            <option key={option.value} value={option.value}>{option.label}</option>
        );
    }

    /**
     *
     * @returns {JSX.Element}
     */
    render(){
        return (
            <Container className="mapping-selector">
                <Row>
                    <Form>
                        <Form.Group controlId="exampleForm.SelectCustom">
                            <Form.Label>{this.label}</Form.Label>
                            <Form.Control
                                as="select" custom
                                onChange={(e)=>{this.handleChange(e)
                            }}>
                                {this.options.map(o => this.renderOption(o))}
                            </Form.Control>
                        </Form.Group>
                    </Form>
                </Row>
            </Container>
        );
    }

}
export default MappingSelector;