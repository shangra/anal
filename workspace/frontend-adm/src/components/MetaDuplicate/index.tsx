import { ChangeEvent, Component, ReactNode } from 'react';
import { Button, DublicateIcon, IconButton, Input, Modal } from 'ui-kit';
import StateManager from 'lite-react-statemanager';
import $api from 'helpers/axios';
import $message from 'components/ui/MyFlash/message.helper';
import { MetadataAPI } from 'components/Metadata/MetadataAPI';
import { handleNodeAdd } from 'components/MetadataHier/lib/service';
import { readMetadataSelected, readScope } from 'components/MetadataHier/lib/scope';
import { toRawNode } from 'components/MetadataHier/lib/normalize';
import type { NormalizedNode } from 'components/MetadataHier/types';
import { FormSchema } from 'components/MetadataHier/actions/types';
import { buildUrl } from 'helpers/buildUrl';

interface MetaDuplicateProps {
    id: string;
    route?: string;
    title?: string;
    server?: string;
}

interface MetaDuplicateState {
    opened: boolean;
    loading: boolean;
    saving: boolean;
    name: string;
    description: string;
    autoDescription: boolean;
    savedForm: FormSchema | null;
}

export class MetaDuplicate extends Component<MetaDuplicateProps, MetaDuplicateState> {
    private metadataAPI: MetadataAPI;

    constructor(props: MetaDuplicateProps) {
        super(props);
        this.metadataAPI = new MetadataAPI(this.props.server ?? '');
        this.state = {
            opened: false,
            loading: false,
            saving: false,
            name: '',
            description: '',
            autoDescription: false,
            savedForm: null,
        };
    }

    private cleanString(str: unknown): string {
        if (str == null) return '';
        const value = String(str);
        const cleaned = value.replace(/[^a-zA-Zа-яА-Я0-9]/g, '');
        if (!cleaned || !/^[a-zA-Zа-яА-Я]/.test(cleaned)) {
            return '';
        }
        return cleaned;
    }

    private capitalizeFirstLetter(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    private convertNameToDescription(name: unknown): string {
        if (name == null) return '';
        const source = String(name);

        const description = source
            .split('')
            .map((char, index) => {
                if (/[A-ZА-ЯЁ]/.test(char)) {
                    const prevChar = source[index - 1];
                    if (!(prevChar && /\s/.test(prevChar))) {
                        return ` ${char.toLowerCase()}`;
                    }
                }
                return char;
            })
            .join('');

        return this.capitalizeFirstLetter(description.trim());
    }

    private getSourceNode = (): NormalizedNode | null => {
        const { id, server } = this.props;
        const selected = readMetadataSelected();
        if (selected && selected.server === server && selected.node?.id === id) {
            return selected.node;
        }
        return null;
    };

    private findNodeKeyById = (nodeId: string | null | undefined): string | null => {
        const { server } = this.props;
        if (!nodeId) return null;
        const { nodes } = readScope(server ?? '');
        for (const [nodeKey, node] of nodes) {
            if (node.id === nodeId) return nodeKey;
        }
        return null;
    };

    private resolveRoute = async (): Promise<string | null> => {
        const { id, route } = this.props;
        if (route) return route;

        const sourceNode = this.getSourceNode();
        if (sourceNode?.routes) return sourceNode.routes;

        try {
            const info = await this.metadataAPI.getAllMetadataInfoAboutEntity(id);
            return info?.routes ?? null;
        } catch (e) {
            console.error('MetaDuplicate: failed to resolve route', e);
            return null;
        }
    };

    private loadSavedForm = async (): Promise<void> => {
        const { id, server } = this.props;
        this.setState({ opened: true, loading: true, saving: false });

        try {
            const url = buildUrl(server, `metadata/formsmetadata/metadata/${id}`);
            const { data: form } = await $api.get<FormSchema>(url);

            const name = form?.manifest?.name ?? '';
            const description = form?.manifest?.description ?? '';
            const autoDescription = description === this.convertNameToDescription(name);

            this.setState({
                opened: true,
                loading: false,
                savedForm: form,
                name,
                description,
                autoDescription,
            });
        } catch (e) {
            console.error('MetaDuplicate: failed to load saved form', e);
            $message.show('Не удалось загрузить данные для дублирования');
            this.setState({ opened: false, loading: false });
        }
    };

    private resetState = (): void => {
        this.setState({
            opened: false,
            loading: false,
            saving: false,
            name: '',
            description: '',
            autoDescription: false,
            savedForm: null,
        });
    };

    private handleCloseModal = (): void => {
        if (this.state.saving) return;
        this.resetState();
    };

    private handleOpenChange = (opened: boolean): void => {
        if (!opened) {
            this.handleCloseModal();
        }
    };

    private handleNameChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const cleaned = this.cleanString(event.target.value);
        this.setState((prev) => {
            const nextDescription = prev.autoDescription ? this.convertNameToDescription(cleaned) : prev.description;
            return {
                name: cleaned,
                description: nextDescription,
            };
        });
    };

    private handleDescriptionChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const description = event.target.value;
        this.setState((prev) => ({
            description,
            autoDescription: description === this.convertNameToDescription(prev.name),
        }));
    };

    private handleDuplicate = async (): Promise<void> => {
        const { id, server } = this.props;
        const { name, description, savedForm } = this.state;

        if (!id || !name || !savedForm) return;

        this.setState({ saving: true });

        try {
            const sourceNode = this.getSourceNode();
            if (!sourceNode) {
                $message.show('Не удалось получить данные исходного объекта (узел не выделен в дереве)');
                this.setState({ saving: false });
                return;
            }

            const sourceRoute = sourceNode.routes ?? (await this.resolveRoute());
            if (!sourceRoute) {
                $message.show('Не удалось определить маршрут объекта');
                this.setState({ saving: false });
                return;
            }

            const rawNode = toRawNode(sourceNode);
            const cleanedRoute = String(sourceRoute).replace(/^\/+/g, '');

            const body = {
                owner_id: rawNode.owner_id,
                class_id: rawNode.class_id,
                class: rawNode.class,
                name,
                description,
                settings: { ...(savedForm.data ?? {}) },
                events: {},
            };
            const url = buildUrl(server, cleanedRoute, 'metadata');
            await $api.post(url, body);

            const { parentId } = sourceNode;
            if (parentId) {
                const parentKey = this.findNodeKeyById(parentId);
                if (parentKey) {
                    try {
                        await handleNodeAdd(server ?? '', parentKey);
                    } catch (e) {
                        console.error('MetaDuplicate: tree reload failed', e);
                    }
                }
            }

            StateManager.setState({
                changeNode: {
                    nodeId: id,
                    source: 'MetaDuplicate',
                    manifest: { name, description },
                    ts: Date.now(),
                },
            });

            $message.show('Объект успешно дублирован');
            this.resetState();
        } catch (e) {
            console.error('MetaDuplicate: failed to duplicate entity', e);
            $message.show('Не удалось создать дубликат объекта');
            this.setState({ saving: false });
        }
    };

    render(): ReactNode {
        const { title, id } = this.props;
        const { opened, loading, saving, name, description } = this.state;
        const canSubmit = !loading && !saving && name.length > 0;
        return (
            <>
                <IconButton
                    title={title}
                    icon={DublicateIcon}
                    onClick={this.loadSavedForm}
                    variant="outlined"
                    rounded
                    disabled={!id}
                />
                <Modal
                    opened={opened}
                    onSetOpen={this.handleOpenChange}
                    onClose={this.handleCloseModal}
                    title="Дублирование объекта"
                    closeByOutsideClick={!saving}
                >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minWidth: 360 }}>
                        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span>Наименование объекта</span>
                            <Input
                                name="manifest.name"
                                placeholder="Наименование объекта"
                                value={name}
                                onChange={this.handleNameChange}
                                fullWidth
                                disabled={loading || saving}
                                autoFocusInput
                            />
                        </label>
                        {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
                        <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span>Описание объекта</span>
                            <Input
                                name="manifest.description"
                                placeholder="Описание объекта"
                                value={description}
                                onChange={this.handleDescriptionChange}
                                fullWidth
                                disabled={loading || saving}
                            />
                        </label>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                            <Button variant="text" onClick={this.handleCloseModal} disabled={saving}>
                                Отмена
                            </Button>
                            <Button color="primary" onClick={this.handleDuplicate} disabled={!canSubmit} loading={saving}>
                                Дублировать
                            </Button>
                        </div>
                    </div>
                </Modal>
            </>
        );
    }
}
