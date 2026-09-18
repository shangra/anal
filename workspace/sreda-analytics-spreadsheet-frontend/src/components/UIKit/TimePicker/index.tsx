import { Component } from 'react';
import { TimePicker as TimePickerComponent, TimePickerProps as TimePickerComponentProps} from 'ui-kit'

export class TimePicker extends Component<TimePickerComponentProps> {
    ender = () => (
        <TimePickerComponent {...this.props} />
    )
}

export type TimePickerProps = TimePickerComponentProps;