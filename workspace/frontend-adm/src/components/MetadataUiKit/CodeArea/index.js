import { Component } from 'react';
import { CodeEditorCMP } from '../../index';

export class CodeArea extends Component {
    constructor(props) {
        super(props);

        this.state = {
            data: '',
        };
    }

    onChange = (data) => {
        this.setState(
            {
                data,
            },
            () => {
                this.props?.onChange(this.state.data);
            },
        );
    };

    editTemplate = (data) => {
        this.setState(
            {
                data,
            },
            () => {
                this.props?.onChange(this.state.data);
            },
            // this.saveTemplateHandler,
        );
    };

    render() {
        return <CodeEditorCMP {...this.props} onChange={this.onChange} onSave={this.editTemplate} />;
    }
}
