import { Component, type ReactNode } from 'react';
import { IconButton, MoreIcon } from 'ui-kit';
import { v4 } from 'uuid';
import $windows from 'components/WindowsCMP/windows.helper';
import './FormText.css';
import { FormInputWrapper } from 'components/Inspector/helpers/FormBuilderComponents/FormInputWrapper';
import type { FormComponentProps } from 'components/Inspector/types';
import { CodeArea } from 'components/AdminUiKit/CodeArea';

interface FormJsonState {
    windowId: string;
}

export class FormJson extends Component<FormComponentProps, FormJsonState> {
    constructor(props: FormComponentProps) {
        super(props);

        this.state = {
            windowId: '',
        };
    }

    componentDidMount(): void {
        this.setState({
            windowId: v4(),
        });
    }

    handleChange = (value: string): void => {
        this.props?.onChange?.(this.props.data.name, value);
    };

    onClick = (): void => {
        $windows.open(
            this.props.data.description ?? 'Редактировать запрос',
            <CodeArea
                value={this.props.value as string | undefined}
                showToolbar={false}
                modeType="js"
                style={{ height: '500px' }}
                onChange={this.handleChange}
            />,
            { uuid: this.state.windowId },
        );
    };

    render(): ReactNode {
        return (
            <FormInputWrapper description={this.props.data.description}>
                <IconButton icon={MoreIcon} onClick={this.onClick} color="controlled" disabled={this.props.disabled} />
            </FormInputWrapper>
        );
    }
}
