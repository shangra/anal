import { Component } from 'react';
import { Chip as ChipComponent, ChipProps as ChipComponentProps } from 'ui-kit';

export class Chip extends Component<ChipComponentProps> {
    render = () => (
        <ChipComponent {...this.props} />
    )
}

export type ChipProps = ChipComponentProps;
