import { Component } from 'react';
import { Tooltip as TooltipComponent, TooltipProps as TooltipComponentProps } from 'ui-kit';

export class Tooltip extends Component<TooltipComponentProps> {
    render() {
        return <TooltipComponent {...this.props} />;
    }
}

export type TooltipProps = TooltipComponentProps;
