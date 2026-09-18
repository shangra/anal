import { Component, type ReactNode, type ChangeEvent } from 'react';
import { IconButton, MoreIcon } from 'ui-kit';
import { v4 } from 'uuid';
import $windows from 'components/WindowsCMP/windows.helper';
import './FormText.css';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import type { FormComponentProps } from 'components/Inspector/types';

interface FormTextState {
    windowId: string;
    value: string;
}

export class FormText extends Component<FormComponentProps, FormTextState> {
    constructor(props: FormComponentProps) {
        super(props);

        this.state = {
            windowId: '',
            value: (props.value as string) ?? '',
        };
    }

    componentDidMount(): void {
        this.setState({
            windowId: v4(),
        });
    }

    handleChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
        const { value } = e.target;
        this.props?.onChange?.(this.props.data.name, value);
        this.setState({ value });
    };

    onClick = (): void => {
        $windows.open(
            this.props.data.description ?? 'Редактировать запрос',
            <textarea
                name={this.props.data.name}
                defaultValue={this.state.value}
                placeholder={this.props.data.template}
                className="textarea"
                onChange={this.handleChange}
            />,
            { uuid: this.state.windowId },
        );
    };

    render(): ReactNode {
        return (
            <FormInputWrapper description={this.props.data.description}>
                <div style={{ display: 'flex', width: '66.67%' }}>
                    <div className="inputShortText">
                        {this.state.value ? (
                            <span style={{ color: 'var(--ui-kit-input-input-color)' }}>{this.state.value}</span>
                        ) : (
                            this.props.data.template
                        )}
                    </div>
                    <IconButton
                        icon={MoreIcon}
                        onClick={this.onClick}
                        color="controlled"
                        className="textInputButton"
                        disabled={this.props.disabled}
                    />
                </div>
            </FormInputWrapper>
        );
    }
}
