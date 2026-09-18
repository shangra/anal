import { Component } from 'react';
import { Checkbox as CheckboxComponent, CheckboxProps as CheckboxComponentProps } from 'ui-kit';

export class Checkbox extends Component<CheckboxComponentProps> {
    render() {
        return <CheckboxComponent {...this.props} />;
    }
}

export type CheckboxProps = CheckboxComponentProps;
