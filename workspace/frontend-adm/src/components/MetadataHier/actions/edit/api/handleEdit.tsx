import React from 'react';
import StateManager from 'lite-react-statemanager';
import { getNodeByKey } from 'components/MetadataHier/lib/service';
import { RenderFormBuilder } from 'components/Inspector/helpers/FormBuilder';
import $windows from 'components/WindowsCMP/windows.helper';
import { fetchCreateForm } from 'components/MetadataHier/actions/edit/api/api';
import { FormValues } from 'components/MetadataHier/actions/types';
import { OnSaveContext } from 'components/Inspector/types';

type OnSave = (values: Record<string, unknown>, afterSave: (newValues: FormValues) => void, ctx?: OnSaveContext) => void;

const EDIT_WINDOWS_KEY = 'editWindowKeys';

const getOnSave = (): OnSave | undefined =>
    (StateManager.state as Record<string, unknown>).inspectorOnSave as OnSave | undefined;

const readOpenedEdits = (): Set<string> => {
    const raw = (StateManager.state as Record<string, unknown>)[EDIT_WINDOWS_KEY];
    return raw instanceof Set ? new Set(raw as Set<string>) : new Set<string>();
};

const writeOpenedEdits = (next: Set<string>): void => {
    StateManager.setState({ [EDIT_WINDOWS_KEY]: next });
};

const removeOpenedEdit = (winKey: string): void => {
    const next = readOpenedEdits();
    if (!next.delete(winKey)) return;
    writeOpenedEdits(next);
};

const buildWinKey = (server: string, nodeKey: string): string => `edit:${server}:${nodeKey}`;

export const openEditObjectForm = (server: string, nodeKey: string): void => {
    openEditNoEvent(server, nodeKey);
};

export const openEditNoEvent = async (server: string, nodeKey: string): Promise<void> => {
    const node = getNodeByKey(server, nodeKey);
    if (!node?.routes) return;

    const winKey = buildWinKey(server, nodeKey);

    const opened = readOpenedEdits();
    if (opened.has(winKey)) return;
    opened.add(winKey);
    writeOpenedEdits(opened);

    const onSave = getOnSave();

    try {
        const form = await fetchCreateForm(server, node.routes, node.id);

        const ctx: OnSaveContext = { server, node, form, winId: winKey };

        const onSaveForEdit: OnSave = (values, afterSave, incomingCtx) => {
            if (onSave) onSave(values, afterSave, incomingCtx ?? ctx);
        };

        $windows.open(
            node.name,
            <div
                style={{
                    padding: '10px 15px',
                    height: '100%',
                    maxHeight: '790px',
                    overflow: 'scroll',
                }}
            >
                <RenderFormBuilder
                    server={server}
                    formData={form}
                    node={node}
                    onSave={onSaveForEdit}
                    type="update"
                    nodeKey={winKey}
                />
            </div>,
            {
                width: '600px',
                height: 'fit-content',
                uuid: winKey,
                onClose: () => removeOpenedEdit(winKey),
            },
        );
    } catch (err) {
        removeOpenedEdit(winKey);
        console.error(err);
    }
};
