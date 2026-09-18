import { PureComponent } from 'react';

import MyButton from '../../ui/MyButton/MyButton';

export class AndOrSelected extends PureComponent {
    types = {
        or: 'ИЛИ',
        and: 'И',
    };

    values = ['or', 'and'];

    constructor(props) {
        super(props);

        this.state = {
            value: props.value ?? this.values[0],
        };

        this.state.indexValue = this.values.indexOf(this.state.value);
    }

    onClick = () => {
        if (!this.props.disabled) {
            this.setState(
                (prevState) => {
                    const newIndex = prevState.indexValue + 1 >= this.values.length ? 0 : prevState.indexValue + 1;
                    return {
                        indexValue: newIndex,
                        value: this.values[newIndex],
                    };
                },
                () => {
                    this.props?.onChange?.(this.state.value);
                },
            );
        }
    };

    render() {
        return <MyButton onClick={this.onClick}>{this.types[this.state.value]}</MyButton>;
    }
}
