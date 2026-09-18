import { Component, ReactNode } from 'react';
import { DatePicker as DatePickerComponent, DatePickerProps as DatePickerComponentProps } from 'ui-kit';

export class DatePicker extends Component<DatePickerComponentProps> {
    render() {
        return <DatePickerComponent {...this.props} />;
    }
}

export type DatePickerProps = DatePickerComponentProps;
