import React from 'react';
import {Form, Container, Row, Col, Accordion, Card, Button} from 'react-bootstrap';
import MappingSelector from './mapping-selector';
import SyntaxHighlighter from 'react-syntax-highlighter';

/**
 * Mapping View Component
 */
class MappingView extends React.Component {

    /**
     *
     * @param props
     */
    constructor(props) {
        super(props)

        this.handleExecute = props.onExecute.bind(this)
        this.handleMappingChange = props.onMappingChange.bind(this)

        this.state = {
            mapping: props.mapping
        }
    }


    /**
     *
     * @returns {JSX.Element}
     */
    render() {

        return (


            <>
                <MappingSelector
                    options={this.props.options}
                    handleChange={(e) => {
                        this.handleMappingChange(e)
                    }}
                />

                <Button

                    onClick={(e) => this.handleExecute(e)}>Execute</Button>

            </>


        );
    }
}

export default MappingView;