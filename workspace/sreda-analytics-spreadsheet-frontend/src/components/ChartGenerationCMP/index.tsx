import { Component } from 'react';

import { ChartGeneration, ChartGenerationProps, ChartTypes } from './src';

interface IChartGenerationCMPState {}

export default class ChartGenerationCMP<T extends ChartTypes> extends Component<
    ChartGenerationProps<T>,
    IChartGenerationCMPState
> {
    constructor(props: ChartGenerationProps<T>) {
        super(props);
    }

    render() {
        return <ChartGeneration type={this.props.type} meta={this.props.meta} chartValues={this.props.chartValues} />;
    }
}
