import { Component, type ReactElement } from 'react';
import StateManager from 'lite-react-statemanager';
import $windows from 'components/WindowsCMP/windows.helper';
import { Inspector } from 'components/Inspector';
import type { FormSchema, FormValues, OnSaveContext } from 'components/Inspector/types';
import type { NormalizedNode } from 'components/MetadataHier/types';
import $api from 'helpers/axios';
import $message from 'components/ui/MyFlash/message.helper';
import $confirm from 'ui/MyConfirm/confirm';
import { isRlsTurnedOff, rlsDropConfirmText } from 'helpers/rlsConfirm.helper';
import { PanelPosition } from 'components/WindowsCMP/interfaces';
import { buildUrl } from 'helpers/buildUrl';

const ROOT_ID = '00000000-0000-0000-0000-000000000000';

const INSPECTOR_WIN_ID = 'inspector-window:singleton';

interface InspectorWindowState {
    currentServer: string | null;
}

export class InspectorWindow extends Component<Record<string, never>, InspectorWindowState> {
    private _reqSeq = 0;

    constructor(props: Record<string, never>) {
        super(props);
        this.state = { currentServer: null as never };
    }

    componentDidMount(): void {
        StateManager.setState({ inspectorOnSave: this.onSave });
        StateManager.subscribeState({
            metadataSelected: { openInspector: this.onSelectedChange },
        });
    }

    componentWillUnmount(): void {
        StateManager.unsubscribeState({ metadataSelected: ['openInspector'] });
        this._reqSeq++;
    }

    private _buildInspector(node: NormalizedNode, formData: FormSchema, server: string): ReactElement {
        return (
            <Inspector
                key={node.id}
                server={server}
                formData={formData}
                node={node}
                onSave={this.onSave}
                type={formData.type}
                winId={INSPECTOR_WIN_ID}
            />
        );
    }

    private _injectCanvasSchema(values: Record<string, unknown>, nodeId: string): void {
        if (!nodeId || nodeId === ROOT_ID) return;
        const canvasSchema = (StateManager.state as Record<string, unknown>)[`flowdemoCanvas:${nodeId}`];
        if (canvasSchema != null) values.schema = canvasSchema;
    }

    private _buildSavePayload(
        values: FormValues,
        node: NormalizedNode,
    ): { name: string; description: string; json: Record<string, unknown> } {
        const resultForm = JSON.parse(JSON.stringify(values));
        const name =
            resultForm['manifest.name'] !== null &&
            resultForm['manifest.name'] !== undefined &&
            resultForm['manifest.name'] !== ''
                ? resultForm['manifest.name']
                : node.name;

        const description =
            resultForm['manifest.description'] !== null &&
            resultForm['manifest.description'] !== undefined &&
            resultForm['manifest.description'] !== ''
                ? resultForm['manifest.description']
                : node.description;
        delete resultForm['manifest.name'];
        delete resultForm['manifest.description'];
        return {
            name,
            description,
            json: {
                owner_id: node.ownerId,
                class_id: node.classId,
                class: node.class,
                name,
                description,
                settings: resultForm,
            },
        };
    }

    private _notifyStateManagers(
        server: string,
        node: NormalizedNode,
        name: string,
        description: string,
        settings: Record<string, unknown>,
    ): void {
        const scopedKey = `mh:${server}:changeNode`;
        const payload = {
            nodeId: node.id,
            processId: node.ownerId,
            newNode: {
                ...node,
                name,
                description,
                settings: {
                    ...settings,
                    ...(name && { name }),
                    ...(description && { description }),
                },
                _containerProps: {
                    fill: (settings as Record<string, unknown>)['containerProps.fill'] === false ? null : undefined,
                },
                _textProps: {
                    color: (settings as Record<string, unknown>)['textProps.color'] === false ? null : undefined,
                },
            },
            source: 'inspector',
            ts: Date.now(),
        };
        StateManager.setState({ [scopedKey]: payload });
        StateManager.setState({
            changeNode: {
                nodeId: node.id,
                source: 'inspector',
                manifest: { name, description },
                ts: Date.now(),
            },
        });

        if (node.ownerId && node.ownerId !== ROOT_ID) {
            StateManager.setState({
                inspectorSave: { processId: node.ownerId, ts: Date.now() },
            });
        }
    }

    private _renameWindows(server: string, node: NormalizedNode, winId: string | undefined, displayName?: string): void {
        if (winId) {
            try {
                $windows.rename(winId, displayName ?? '');
            } catch (e) {
                console.error(e);
            }
        }
        const winKey = `edit:${server}:${node.nodeKey}`;
        const editKeys = StateManager.state.editWindowKeys as Set<string> | undefined;
        if (editKeys instanceof Set && editKeys.has(winKey)) {
            try {
                $windows.rename(winKey, displayName ?? '');
            } catch (e) {
                console.error(e);
            }
        }
    }

    onSelectedChange = ({
        metadataSelected,
    }: {
        metadataSelected?: { node: NormalizedNode; server: string; nodeKey: string };
    }): void => {
        if (!metadataSelected) {
            $windows.close(INSPECTOR_WIN_ID);
            return;
        }

        const { server, node } = metadataSelected;
        const route = String(node.routes || '').replace(/^\/+/g, '');
        if (!route) return;

        const n = node;
        const query = n.ownerId && n.ownerId !== ROOT_ID ? `?processId=${encodeURIComponent(n.ownerId as string)}` : '';
        const url = buildUrl(server, route, `/metadata/${n.id}${query}`);

        const myReq = ++this._reqSeq;
        $api.get(url)
            .then((res: { data: FormSchema }) => {
                if (myReq !== this._reqSeq) return;
                $windows.open(n.description || n.name, this._buildInspector(n, res.data, server as string), {
                    position: PanelPosition.right,
                    uuid: INSPECTOR_WIN_ID,
                });
            })
            .catch((err: unknown) => {
                if (myReq !== this._reqSeq) return;
                console.error('Inspector load failed', err);
                $message.show('Ошибка загрузки инспектора');
            });
    };

    private _sendSave(
        url: string,
        node: NormalizedNode,
        form: FormSchema | undefined,
        json: Record<string, unknown>,
        name: string,
        description: string,
        server: string,
        winId: string | undefined,
        afterSave: (newValues: FormValues) => void,
    ): void {
        const apiCall = form?.type === 'update' ? $api.put(`${url}/${node.id}`, json) : $api.post(url, json);

        apiCall
            .then(() => {
                afterSave({
                    'manifest.name': name,
                    'manifest.description': description,
                    ...(json.settings as Record<string, unknown>),
                } as FormValues);
                this._notifyStateManagers(server, node, name, description, json.settings as Record<string, unknown>);
                this._renameWindows(server, node, winId, description || name);
                $message.show('Значение сохранено!');
            })
            .catch((err: unknown) => {
                console.error('Ошибка сохранения:', err);
                $message.show('Ошибка при сохранении!');
            });
    }

    onSave = (values: FormValues, afterSave: (newValues: FormValues) => void, ctx?: OnSaveContext): void => {
        const node = ctx?.node;
        const form = ctx?.form;
        const server = (ctx?.server ?? this.state.currentServer ?? '').replace(/\/+$/gm, '');
        const winId = ctx?.winId ?? INSPECTOR_WIN_ID;

        if (!node || !node.id) {
            console.error('[InspectorWindow] onSave: node не определён');
            return;
        }

        this._injectCanvasSchema(values, node.id);

        const { name, description, json } = this._buildSavePayload(values, node);
        const route = (node.routes || '').replace(/^\/+/gi, '');
        const url = buildUrl(server, route, 'metadata');

        const rlsTable = (form?.data?.table as string) || '';
        if (rlsTable && isRlsTurnedOff(form, values)) {
            $confirm(rlsDropConfirmText(rlsTable), (isYes: boolean) => {
                if (!isYes) return;
                this._sendSave(url, node, form, { ...json, confirmRlsDrop: true }, name, description, server, winId, afterSave);
            });
            return;
        }

        this._sendSave(url, node, form, json, name, description, server, winId, afterSave);
    };

    render(): null {
        return null;
    }
}

export default InspectorWindow;
