import { Component } from 'react';
import { Accordion as UIAccordion } from 'ui-kit';

export class Accordion extends Component {
    render() {
        const tabs = this.props.tabs ?? [];
        const accordionItems = tabs.map((tab) => ({ title: tab.name, defaultOpened: true, content: tab.content }));
        return <UIAccordion items={accordionItems} allowMultipleOpen multiple />;
    }
}
