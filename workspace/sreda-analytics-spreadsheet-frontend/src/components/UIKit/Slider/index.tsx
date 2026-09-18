import { Component } from 'react';
import { RangeSliderProps as RangeSliderComponentProps, SingleSliderProps as SingleSliderComponentProps, Slider as SliderComponent } from "ui-kit"

export class Slider extends Component<RangeSliderComponentProps | SingleSliderComponentProps> {
    render = () => (
        <SliderComponent {...this.props} />
    )
}

export type SliderProps = RangeSliderComponentProps | SingleSliderComponentProps;