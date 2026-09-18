import { Component } from 'react';
import { Accordion as AccordionComponent, AccordionProps as AccordionComponentProps } from 'ui-kit';

export class Accordion extends Component<AccordionComponentProps> {
    render() {
        return <AccordionComponent {...this.props} />;
    }
}

export type AccordionProps = AccordionComponentProps;
