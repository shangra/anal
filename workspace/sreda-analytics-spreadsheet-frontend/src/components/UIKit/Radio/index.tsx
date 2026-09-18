import { Component } from 'react';
import { Radio as RadioComponent, RadioProps as RadioComponentProps } from 'ui-kit';

export class Radio extends Component<RadioComponentProps> {
    render() {
        return <RadioComponent {...this.props} />;
    }
}

export type RadioProps = RadioComponentProps;
