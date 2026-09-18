import cn from 'classnames';
import { type ChangeEvent, Component, type ReactNode } from 'react';
import { CommonInput, type CommonInputProps } from 'components/CommonInput';
import { ErrorBoundary } from 'components/ErrorBoundary';
import style from '../style.module.css';
import { generateLogsFileName } from 'components/MetadataForms/Inputs/utils';

interface IStringProps extends Omit<CommonInputProps, 'value' | 'onChange'> {
    value?: string;
    onChange?: (value: string | null) => void;
}

interface IStringState {
    value: string | null;
}

class TextContent extends Component<IStringProps, IStringState> {

    constructor(props: IStringProps) {
        super(props);

        this.state = {
            value: props.value === undefined || props.value === '' ? null : props.value,
        };
    }

    componentDidUpdate(prevProps: IStringProps) {
        if (prevProps.value !== this.props.value && this.props.value !== undefined) {
            this.setState({ value: this.props.value });
        }
    }

    onChange = (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value === undefined || e.target.value === '' ? null : e.target.value;
        this.setState({ value: val }, () => this.props.onChange?.(val));
    };

    onClickDelete = () => {
        this.setState({ value: null }, () => this.props.onClear?.());
        
    };

    render() {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: this.state },
                    fileName: generateLogsFileName('MetadataForms_Inputs_StringContent'),
                }}
            >
                <div className={cn(style.commonInputWrapper, this.props.containerClassName)}>
                    <CommonInput
                        {...this.props}
                        type="multitext"
                        value={this.state.value ?? ''}
                        deleteButton
                        onChange={this.onChange}
                        onClear={this.onClickDelete}
                    />
                </div>
            </ErrorBoundary>
        );
    }
}

export class Text extends Component<IStringProps> {
    render(): ReactNode {
        return (
            <ErrorBoundary
                downloadLogs={{
                    logObj: { props: this.props, state: {} },
                    fileName: generateLogsFileName('MetadataForms_Inputs_String'),
                }}
            >
                <TextContent {...this.props} />
            </ErrorBoundary>
        );
    }
}
