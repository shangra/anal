import React, { PureComponent } from 'react';
import StateManager from 'lite-react-statemanager';
import $api from 'helpers/axios';
import { FormBuilderMetadata } from 'components/Inspector/helpers/FormBuilderMetadata';
import { Button } from 'ui-kit';
import $windows from 'components/WindowsCMP/windows.helper';
import './FormBuilder.css';
import type { FormButton, FormParentInfo, FormSchema, FormValues } from 'components/Inspector/types';
import type { NormalizedNode } from 'components/MetadataHier/types';
import { buildUrl } from 'helpers/buildUrl';
import { ESB_ENABLED } from 'settings/settings';

interface RenderFormBuilderProps {
    formData: FormSchema | null;
    node: NormalizedNode;
    onSave: (values: FormValues, afterSave: (newValues: FormValues) => void) => void;
    server: string;
    type?: string;
    nodeKey?: string;
}

interface RenderFormBuilderState {
    values: FormValues;
    savedValues: FormValues;
    parentInfo: Record<string, unknown>;
    components: { GetComponent: (name: string) => unknown } | null;
    form: FormSchema | null;
    isSubmitting: boolean;
}

const buildValuesFromForm = (form: FormSchema | null): FormValues => ({
    'manifest.name': form?.manifest?.name ?? '',
    'manifest.description': form?.manifest?.description ?? '',
    ...(form?.data ?? {}),
});

let __builderSeq = 0;

export class RenderFormBuilder extends PureComponent<RenderFormBuilderProps, RenderFormBuilderState> {
    private _instanceId: string;

    private _mounted = false;

    private _reloadInFlight = false;

    private _formType: string | undefined;

    constructor(props: RenderFormBuilderProps) {
        super(props);
        this._formType = props.type ?? (props.formData as { type?: string })?.type;

        const values = buildValuesFromForm(props.formData);

        this.state = {
            values,
            savedValues: structuredClone(values),
            parentInfo: {},
            components: null,
            form: props.formData,
            isSubmitting: false,
        };

        this._instanceId = `reloadBuilder_${++__builderSeq}_${Math.random().toString(36).slice(2)}`;
    }

    componentDidMount(): void {
        this._mounted = true;
        import('components/index').then((components) => {
            if (this._mounted) this.setState({ components: components as { GetComponent: (name: string) => unknown } });
        });

        StateManager.subscribeState({
            changeNode: { [this._instanceId]: this.reloadBuilder },
        });
    }

    componentWillUnmount(): void {
        this._mounted = false;
        StateManager.unsubscribeState({ changeNode: [this._instanceId] });
    }

    reloadBuilder = async ({ changeNode }: { changeNode?: { nodeId?: string; source?: string } }): Promise<void> => {
        const { node, server } = this.props;
        if (!changeNode || !node) return;
        if (String(changeNode.nodeId) !== String(node.id)) return;
        if (changeNode.source === this._instanceId) return;
        if (this._reloadInFlight) return;
        if (!node.routes) return;

        this._reloadInFlight = true;
        try {
            const route = String(node.routes).replace(/^\/+/g, '');
            // Use the correct endpoint based on form type:
            // create: GET /{server}/{route}/metadata
            // update: GET /{server}/{route}/metadata/{node.id}
            const path = this._formType === 'create' ? `${route}/metadata` : `${route}/metadata/${node.id}`;
            const url = buildUrl(server, path);
            const { data: freshForm } = await $api.get(url);

            if (!this._mounted) return;

            const values = buildValuesFromForm(freshForm);
            this.setState({
                form: freshForm,
                values,
                savedValues: structuredClone(values),
                parentInfo: {},
            });

            this._maybeRenameOwnWindow(freshForm);
        } catch (e) {
            console.error('reloadBuilder failed:', e);
        } finally {
            this._reloadInFlight = false;
        }
    };

    _maybeRenameOwnWindow = (form?: { manifest?: { name?: string; description?: string } } | null): void => {
        const { nodeKey } = this.props;
        if (!nodeKey) return;
        const name = form?.manifest?.name;
        if (!name) return;
        try {
            $windows.rename(nodeKey, name);
        } catch (_e) {
            // no-op
        }
    };

    ButtonBuilder = (nodeForm?: { buttons?: FormButton[] }): React.ReactNode => {
        if (!nodeForm?.buttons) return null;
        const result: React.ReactNode[] = [];
        nodeForm.buttons.forEach((button) => {
            const cmp = (
                this.state.components as { GetComponent: (name: string) => React.ComponentType } | null
            )?.GetComponent(`Components.${button.component}`);
            const server = 
                ESB_ENABLED 
                ? button.props.server ?? ''
                : ''

            button.props.server = server
            if (cmp) result.push(React.createElement(cmp, button.props));
        });
        return <div className="inspector-object-button-group">{result}</div>;
    };

    itemHandleChange = (values: FormValues, parentInfo: Record<string, unknown>): void => {
        this.setState({ values, parentInfo: { ...parentInfo } });
    };

    hasUnsavedChanges = (): boolean => JSON.stringify(this.state.values) !== JSON.stringify(this.state.savedValues);

    handleReset = (): void => {
        this.setState((prev) => ({ values: prev.savedValues }));
    };

    onLoadData = (parentInfo: Record<string, unknown>): void => {
        this.setState({ parentInfo: { ...parentInfo } });
    };

    setNewValues = (newValues: Partial<FormValues>): void => {
        const { node } = this.props;
        const merged =
            newValues && typeof newValues === 'object' ? { ...this.state.values, ...newValues } : { ...this.state.values };

        this.setState({ savedValues: { ...merged }, values: { ...merged }, isSubmitting: false }, () => {
            if (node?.id) {
                StateManager.setState({
                    changeNode: {
                        nodeId: node.id,
                        source: this._instanceId,
                        manifest: {
                            name: merged['manifest.name'],
                            description: merged['manifest.description'],
                        },
                        ts: Date.now(),
                    },
                });
            }
            this._maybeRenameOwnWindow({
                manifest: {
                    name: merged['manifest.name'],
                    description: merged['manifest.description'],
                },
            });
        });
    };

    render(): React.ReactNode {
        const { node, server } = this.props;
        const form = this.state.form ?? this.props.formData;
        const isParentForm =
            node.classId === node.id &&
            form?.manifest?.name !== '' &&
            (node as { needToLoading?: boolean }).needToLoading === true;
        return (
            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    if (this.state.isSubmitting) return;
                    this.setState({ isSubmitting: true });
                    this.props.onSave(this.state.values, this.setNewValues);
                }}
                noValidate
                className="inspector-formbuilder"
            >
                {!isParentForm && this.state.components && this.ButtonBuilder(form!)}
                <FormBuilderMetadata
                    server={server}
                    formValues={this.state.values ?? {}}
                    parentInfo={(this.state.parentInfo as FormParentInfo) ?? {}}
                    nodeForm={form as FormSchema}
                    node={node}
                    // @ts-expect-error - itemHandleChange несовместим с FormOnChange
                    onChange={this.itemHandleChange}
                    onLoadData={this.onLoadData}
                    isParentForm={isParentForm}
                    // @ts-expect-error - { GetComponent: () => unknown } несовместим с React.ComponentType
                    components={this.state.components as { GetComponent: (name: string) => unknown }}
                />
                {form?.manifest && (
                    <div className="inspector-form-button-group">
                        <div className="inspector-form-buttons">
                            <Button
                                variant="text"
                                onClick={this.handleReset}
                                disabled={!this.hasUnsavedChanges() || this.state.isSubmitting}
                            >
                                Сбросить изменения
                            </Button>
                            <Button
                                type="submit"
                                color="primary"
                                loading={this.state.isSubmitting}
                                disabled={this.state.isSubmitting}
                            >
                                {this.props.type === 'update' ? 'Сохранить' : 'Добавить'}
                            </Button>
                        </div>
                    </div>
                )}
            </form>
        );
    }
}
