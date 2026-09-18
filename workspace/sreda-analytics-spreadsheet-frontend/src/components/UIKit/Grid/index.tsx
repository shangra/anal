import { Component } from 'react';
import { Grid as GridComponent, GridProps as GridComponentProps } from 'ui-kit';

export class Grid extends Component<GridComponentProps> {
    render() {
        return <GridComponent {...this.props} />;
    }
}

export type GridProps = GridComponentProps;
