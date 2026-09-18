import { Component } from 'react';
import { RenderFormBuilder } from 'components/Inspector/helpers/FormBuilder';
import './RightSidebar.css';
import { NormalizedNode } from 'components/MetadataHier/types';
import type { FormSchema, FormValues, OnSaveContext } from 'components/Inspector/types';

interface IInspectorProps {
    formData: FormSchema | null;
    node: NormalizedNode;
    onSave: (values: FormValues, afterSave: (newValues: FormValues) => void, ctx?: OnSaveContext) => void;
    server?: string;
    type?: string;
    winId?: string;
}

interface IInspectorState {
    server: string;
}

export class Inspector extends Component<IInspectorProps, IInspectorState> {
    constructor(props: IInspectorProps) {
        super(props);
        this.state = { server: props.server ?? '' };
    }

    handleSave = (values: FormValues, afterSave: (n: FormValues) => void) => {
        this.props.onSave?.(values, afterSave, {
            server: this.state.server,
            node: this.props.node,
            form: this.props.formData as FormSchema,
            winId: this.props.winId,
        });
    };

    render() {
        if (!this.props.formData) return null;
        return (
            <div className="inspector">
                <RenderFormBuilder
                    server={this.state.server}
                    formData={this.props.formData}
                    node={this.props.node}
                    onSave={this.handleSave}
                    type={this.props.type}
                />
            </div>
        );
    }
}
