import { Component } from 'react';
import { DateRangePicker as DateRangePickerComponent, DateRangePickerProps as DateRangePickerComponentProps} from "ui-kit"

export class DateRangePicker extends Component<DateRangePickerComponentProps> {
    render = () => (
        <DateRangePickerComponent {...this.props} />
    )
}

export type DateRangePickerProps = DateRangePickerComponentProps