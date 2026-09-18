import { Component, type ReactNode } from 'react';
import { Accordion, Loader } from 'ui-kit';
import { Select } from 'components/MetadataForms/Inputs/Select';
import { CommonInput } from 'components/CommonInput';
import type { DataManager } from 'components/MetadataForms/DataManager';
import $api from 'helpers/axios';
import styles from './style.module.css';

interface IEntityType {
    id: string;
    value: string;
    type: string;
}

interface IEntityParam {
    id: string;
    name: string;
    description: string;
    entity_id: string;
    params_type_id: string;
}

export interface IDetailsProps {
    DataManager: DataManager;
    entity: string;
}

export interface IDetailsState {
    elementId: string | null;
    types: IEntityType[];
    params: IEntityParam[];
    loading: boolean;
    saving: Record<string, boolean>;
    localParams: IEntityParam[];
}

class DebounceTimer {
    timer: ReturnType<typeof setTimeout> | null = null;

    debounce(fn: () => void, delay: number): void {
        if (this.timer) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(fn, delay);
    }

    clear(): void {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }
}

export class Details extends Component<IDetailsProps, IDetailsState> {
    debounce = new DebounceTimer();

    constructor(props: IDetailsProps) {
        super(props);

        this.state = {
            elementId: '',
            types: [],
            params: [],
            loading: false,
            saving: {},
            localParams: [],
        };
    }

    componentDidMount(): void {
        this.setState(() => ({ elementId: this.props.DataManager.data.record!.id }));
        this.loadTypes();
    }

    componentWillUnmount(): void {
        this.debounce.clear();
    }

    async loadTypes(): Promise<void> {
        try {
            const response = await $api.get<IEntityType[]>(`/${this.props.entity}/getlisttypes`);
            this.setState({ types: response.data });
        } catch (error) {
            console.error('Failed to load entity types:', error);
        }
    }

    async loadParams(elementId: string): Promise<void> {
        this.setState({ loading: true });
        try {
            try {
                const response = await $api.get<IEntityParam[]>(
                    `/${this.props.entity}/${elementId}/params/?filter=${encodeURIComponent(JSON.stringify({ where: {} }))}`,
                );
                const params = response.data ?? [];
                this.setState({ params, localParams: JSON.parse(JSON.stringify(params)) });
            } catch (error) {
                console.error(`Failed to load params:`, error);
                this.setState({ params: [], localParams: [] });
            }
        } finally {
            this.setState({ loading: false });
        }
    }

    updateLocalParam(paramId: string, field: 'description' | 'params_type_id', value: string): void {
        const { localParams } = this.state;
        const updated = localParams.map((p) => (p.id === paramId ? { ...p, [field]: value } : p));
        this.setState({ localParams: updated });

        const param = updated.find((p) => p.id === paramId);
        if (!param) return;

        this.debounce.debounce(() => {
            this.saveParam(param);
        }, 300);
    }

    async saveParam(param: IEntityParam): Promise<void> {
        this.setState((prev) => ({ saving: { ...prev.saving, [param.id]: true } }));
        try {
            try {
                return await $api.put(`/${this.props.entity}/${param.entity_id}/params/${param.id}`, {
                    params_type_id: param.params_type_id,
                    params_description: param.description,
                });
            } catch (error) {
                console.error('Failed to save param:', error);
                // Rollback on error
                const { localParams } = this.state;
                const original = this.state.params.find((p) => p.id === param.id);
                if (original) {
                    const restored = localParams.map((p_1) => (p_1.id === param.id ? { ...p_1, ...original } : p_1));
                    this.setState({ localParams: restored });
                }
            }
        } finally {
            this.setState((prev_1) => ({ saving: { ...prev_1.saving, [param.id]: false } }));
        }
    }

    getSelectOptions(): { label: string; value: string }[] {
        return this.state.types.map((t) => ({ label: t.value, value: t.id }));
    }

    makeDescriptionHandler =
        (paramId: string) =>
        (e: any): void => {
            this.updateLocalParam(paramId, 'description', e?.target?.value ?? '');
        };

    makeTypeHandler =
        (paramId: string) =>
        (val: string | null): void => {
            this.updateLocalParam(paramId, 'params_type_id', val ?? '');
        };

    render(): ReactNode {
        const { elementId } = this.state;
        const { DataManager: _DataManager } = this.props;

        if (!elementId) {
            return null;
        }

        const accordionItems = [
            {
                title: 'Редактировать параметры',
                defaultOpened: false,
                content: this.renderParamsContent(),
            },
        ];

        return (
            <div className={styles.elementDetails}>
                <Accordion
                    items={accordionItems}
                    multiple
                    onSetOpen={(_opened) => {
                        const { elementId: eid } = this.state;
                        if (eid) {
                            this.loadParams(eid);
                        }
                    }}
                />
            </div>
        );
    }

    renderParamsContent(): ReactNode {
        const { loading, saving, localParams, types } = this.state;

        if (loading) {
            return (
                <div className={styles.loading}>
                    <Loader />
                </div>
            );
        }

        if (localParams.length === 0) {
            return <div className={styles.noParams}>Параметры не найдены</div>;
        }

        return (
            <div className={styles.paramsContainer}>
                {localParams.map((param) => (
                    <div key={param.id} className={styles.paramBlock}>
                        <div className={styles.paramName}>{param.name}</div>
                        <div className={styles.paramFields}>
                            <div className={styles.paramField}>
                                <CommonInput
                                    value={param.description ?? ''}
                                    placeholder="Описание"
                                    onChange={this.makeDescriptionHandler(param.id)}
                                    disabled={saving[param.id]}
                                />
                            </div>
                            <div className={styles.paramField}>
                                <Select
                                    value={param.params_type_id ?? ''}
                                    options={this.getSelectOptions()}
                                    onChange={this.makeTypeHandler(param.id)}
                                    disabled={saving[param.id] || types.length === 0}
                                    loading={types.length === 0}
                                    placeholder="Тип"
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
}
