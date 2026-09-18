import { Component } from 'react';
import { CodeEditorCMP } from '../../index';
import type { CodeEditorCMPProps } from 'components/CodeEditorCMP/types';

export interface CodeAreaProps extends CodeEditorCMPProps {}

interface CodeAreaState {
    data: string;
}

export class CodeArea extends Component<CodeAreaProps, CodeAreaState> {
    constructor(props: CodeAreaProps) {
        super(props);

        this.state = {
            data: '',
        };
    }

    onChange = (data: string): void => {
        this.setState({ data }, () => {
            this.props?.onChange?.(this.state.data);
        });
    };

    editTemplate = (data: string): void => {
        this.setState({ data }, () => {
            this.props?.onChange?.(this.state.data);
        });
    };

    render() {
        const { value, subKey, modeType, showToolbar, style } = this.props;
        return (
            <CodeEditorCMP
                value={value}
                subKey={subKey}
                modeType={modeType}
                showToolbar={showToolbar}
                style={style}
                onChange={this.onChange}
                onSave={this.editTemplate}
            />
        );
    }
}
