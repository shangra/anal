import { Component } from 'react';
import { GridElement as GridElementComponent, GridElementProps as GridElementComponentProps } from 'ui-kit';

export class GridElement extends Component<GridElementComponentProps> {
    render() {
        return <GridElementComponent {...this.props} />;
    }
}

export type GridElementProps = GridElementComponentProps;
